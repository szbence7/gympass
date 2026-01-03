/**
 * Opening hours utilities
 */

export interface DayHours {
  open: string; // HH:MM format
  close: string; // HH:MM format
  closed: boolean;
}

export interface OpeningHours {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
}

export interface GymStatus {
  status: 'open' | 'closingSoon' | 'closed';
  closesAt?: string; // HH:MM format
}

/**
 * Parse opening hours from JSON string
 */
export function parseOpeningHours(jsonString: string | null): OpeningHours | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as OpeningHours;
  } catch {
    return null;
  }
}

/**
 * Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * Adjusted for Europe/Budapest timezone
 */
function getCurrentDayOfWeek(timezone: string = 'Europe/Budapest'): string {
  const now = new Date();
  // Convert to Budapest time
  const budapestTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const day = budapestTime.getDay();
  
  // Map: 0=Sunday, 1=Monday, ..., 6=Saturday
  const dayMap: { [key: number]: string } = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  
  return dayMap[day];
}

/**
 * Convert HH:MM to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current time in minutes since midnight (Budapest timezone)
 */
function getCurrentTimeMinutes(timezone: string = 'Europe/Budapest'): number {
  const now = new Date();
  const budapestTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return budapestTime.getHours() * 60 + budapestTime.getMinutes();
}

/**
 * Compute gym open/closed status
 */
export function computeGymOpenStatus(
  openingHours: OpeningHours | null,
  timezone: string = 'Europe/Budapest'
): GymStatus {
  if (!openingHours) {
    return { status: 'closed' };
  }
  
  const currentDay = getCurrentDayOfWeek(timezone);
  const dayHours = openingHours[currentDay as keyof OpeningHours];
  
  if (!dayHours || dayHours.closed) {
    return { status: 'closed' };
  }
  
  const currentMinutes = getCurrentTimeMinutes(timezone);
  const openMinutes = timeToMinutes(dayHours.open);
  const closeMinutes = timeToMinutes(dayHours.close);
  
  // Check if currently open
  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
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
  
  return { status: 'closed' };
}

/**
 * Validate opening hours structure
 */
export function validateOpeningHours(hours: any): { valid: boolean; error?: string } {
  if (!hours || typeof hours !== 'object') {
    return { valid: false, error: 'Opening hours must be an object' };
  }
  
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  
  for (const day of days) {
    if (!hours[day]) {
      return { valid: false, error: `Missing hours for ${day}` };
    }
    
    const dayHours = hours[day];
    if (typeof dayHours.closed !== 'boolean') {
      return { valid: false, error: `${day}.closed must be a boolean` };
    }
    
    if (!dayHours.closed) {
      if (!dayHours.open || !dayHours.close) {
        return { valid: false, error: `${day} must have open and close times when not closed` };
      }
      
      if (!timeRegex.test(dayHours.open)) {
        return { valid: false, error: `${day}.open must be in HH:MM format` };
      }
      
      if (!timeRegex.test(dayHours.close)) {
        return { valid: false, error: `${day}.close must be in HH:MM format` };
      }
      
      // Validate open < close
      const openMinutes = timeToMinutes(dayHours.open);
      const closeMinutes = timeToMinutes(dayHours.close);
      if (openMinutes >= closeMinutes) {
        return { valid: false, error: `${day}.open must be before ${day}.close` };
      }
    }
  }
  
  return { valid: true };
}

