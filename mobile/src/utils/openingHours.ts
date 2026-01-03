/**
 * Opening hours utilities for mobile app
 */

import { OpeningHours, DayHours } from '../context/GymContext';
import i18n from '../i18n/config';

export interface GymStatus {
  status: 'open' | 'closingSoon' | 'closed';
  closesAt?: string;
}

/**
 * Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * Adjusted for Europe/Budapest timezone
 */
function getCurrentDayOfWeek(): string {
  const now = new Date();
  // Use Intl.DateTimeFormat for reliable timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Budapest',
    weekday: 'long',
  });
  const weekday = formatter.format(now);
  
  // Map weekday name to openingHours key
  const dayMap: { [key: string]: string } = {
    'Sunday': 'sun',
    'Monday': 'mon',
    'Tuesday': 'tue',
    'Wednesday': 'wed',
    'Thursday': 'thu',
    'Friday': 'fri',
    'Saturday': 'sat',
  };
  
  return dayMap[weekday] || 'mon';
}

/**
 * Convert HH:MM to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

/**
 * Get current time in minutes since midnight (Budapest timezone)
 */
function getCurrentTimeMinutes(): number {
  const now = new Date();
  // Use Intl.DateTimeFormat for reliable timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Budapest',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return hour * 60 + minute;
}

/**
 * Compute gym open/closed status
 */
export function computeGymOpenStatus(openingHours: OpeningHours | null | undefined): GymStatus {
  if (!openingHours) {
    return { status: 'closed' };
  }
  
  const currentDay = getCurrentDayOfWeek();
  const dayHours = openingHours[currentDay as keyof OpeningHours];
  
  if (!dayHours || dayHours.closed) {
    return { status: 'closed' };
  }
  
  const currentMinutes = getCurrentTimeMinutes();
  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close);
  
  // Validate times
  if (openMinutes === 0 && closeMinutes === 0) {
    return { status: 'closed' };
  }
  
  // Logic: same-day schedules (open < close)
  // If nowMinutes < openMinutes => closed (before opening)
  if (currentMinutes < openMinutes) {
    return { status: 'closed' };
  }
  
  // If nowMinutes >= closeMinutes => closed (after closing)
  if (currentMinutes >= closeMinutes) {
    return { status: 'closed' };
  }
  
  // We're within opening hours (openMinutes <= currentMinutes < closeMinutes)
  // Check if closing within 60 minutes
  const minutesUntilClose = closeMinutes - currentMinutes;
  if (minutesUntilClose <= 60) {
    return {
      status: 'closingSoon',
      closesAt: dayHours.close,
    };
  }
  
  return { status: 'open' };
}

/**
 * Get status text (translated)
 */
export function getStatusText(status: GymStatus): string {
  switch (status.status) {
    case 'open':
      return i18n.t('status.open');
    case 'closingSoon':
      return i18n.t('status.closingSoon', { time: status.closesAt });
    case 'closed':
      return i18n.t('status.closed');
    default:
      return i18n.t('status.unknown');
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: GymStatus): string {
  switch (status.status) {
    case 'open':
      return '#4caf50'; // Green
    case 'closingSoon':
      return '#ff9800'; // Yellow/Orange
    case 'closed':
      return '#f44336'; // Red
    default:
      return '#9e9e9e'; // Gray
  }
}

/**
 * Get day name (translated)
 */
export function getDayName(day: string): string {
  return i18n.t(`days.${day}`, { defaultValue: day });
}

/**
 * Format hours for display (translated)
 */
export function formatHours(dayHours: DayHours): string {
  if (dayHours.closed) {
    return i18n.t('openingHours.closed');
  }
  return i18n.t('openingHours.format', { open: dayHours.open, close: dayHours.close });
}

