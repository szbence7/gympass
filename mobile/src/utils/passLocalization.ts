import i18n from '../i18n/config';
import { PassType } from '../api/client';

/**
 * Get localized pass type name
 * If the pass matches a known system pass type (by code), return localized name
 * Otherwise return the stored name as-is (for custom passes)
 */
export function getPassDisplayName(passType: PassType): string {
  // Try to match by code first (most reliable)
  if (passType.code) {
    const localized = i18n.t(`passTypes.${passType.code}.name`, { defaultValue: null });
    if (localized && localized !== `passTypes.${passType.code}.name`) {
      return localized;
    }
  }
  
  // Fallback: try to match by name (normalized)
  const normalizedName = passType.name.toUpperCase().replace(/\s+/g, '_');
  const localized = i18n.t(`passTypes.${normalizedName}.name`, { defaultValue: null });
  if (localized && localized !== `passTypes.${normalizedName}.name`) {
    return localized;
  }
  
  // If no match, return stored name (custom pass)
  return passType.name;
}

/**
 * Get localized pass type description
 * If the pass matches a known system pass type (by code), return localized description
 * Otherwise return the stored description as-is (for custom passes)
 */
export function getPassDisplayDescription(passType: PassType): string {
  // Try to match by code first (most reliable)
  if (passType.code) {
    const localized = i18n.t(`passTypes.${passType.code}.description`, { defaultValue: null });
    if (localized && localized !== `passTypes.${passType.code}.description`) {
      return localized;
    }
  }
  
  // Fallback: try to match by name (normalized)
  const normalizedName = passType.name.toUpperCase().replace(/\s+/g, '_');
  const localized = i18n.t(`passTypes.${normalizedName}.description`, { defaultValue: null });
  if (localized && localized !== `passTypes.${normalizedName}.description`) {
    return localized;
  }
  
  // If no match, return stored description (custom pass)
  return passType.description || '';
}

