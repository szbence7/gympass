/**
 * GymGo Color Theme - Graphite + Neon
 * Dark gym/fitness vibe with bold neon accents
 * 
 * This is the single source of truth for web UI colors.
 * Matches mobile/src/theme/colors.ts exactly.
 */
export const colors = {
  // Backgrounds
  background: '#0B0F14',      // Main app background
  surface: '#121824',          // Cards, inputs
  surfaceAlt: '#182235',       // Slightly lighter surface
  border: '#243047',           // Borders
  
  // Text
  textPrimary: '#EAF0FF',      // Primary text
  textSecondary: '#A8B3CF',    // Secondary text
  textMuted: '#7683A5',        // Muted/placeholder text
  
  // Primary Actions (Neon Green)
  primary: '#33FF8A',          // Primary buttons, accents
  primaryPressed: '#20D86E',   // Primary pressed state
  primaryText: '#0B0F14',      // Text on primary buttons (dark for contrast)
  
  // Secondary Actions (Cyan)
  secondary: '#3CD6FF',        // Secondary buttons, links
  secondaryPressed: '#24B7E6', // Secondary pressed state
  
  // Status Colors
  danger: '#FF4D4D',           // Errors, destructive actions
  warning: '#FFB020',          // Warnings
  success: '#2EE59D',          // Success states
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.55)', // Modal overlays
  
  // Selected/Highlighted States
  selectedBg: '#1A2838',       // Selected item background
  selectedBorder: '#33FF8A',   // Selected item border (neon green)
  
  // Shadow (for elevation)
  shadow: '#000',
} as const;

export type Colors = typeof colors;

