import i18n from '../i18n/config';
import { PassType, UserPass } from '../api/client';

/**
 * Get localized pass type name
 * New system: If passType has nameHu/nameEn, use based on current language
 * Old system: Try to match by code or name for backward compatibility
 */
export function getPassDisplayName(passType: PassType & { nameHu?: string; nameEn?: string }): string {
  const currentLang = i18n.language || 'hu';
  
  // New system: use localized names if available
  if (passType.nameHu && passType.nameEn) {
    return currentLang === 'en' ? passType.nameEn : passType.nameHu;
  }
  
  // Old system: try to match by code first (most reliable)
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
  
  // If no match, return stored name (custom pass or old system)
  return passType.name;
}

/**
 * Get localized pass type description
 * New system: If passType has descHu/descEn, use based on current language
 * Old system: Try to match by code or name for backward compatibility
 */
export function getPassDisplayDescription(passType: PassType & { descHu?: string; descEn?: string }): string {
  const currentLang = i18n.language || 'hu';
  
  // New system: use localized descriptions if available
  if (passType.descHu && passType.descEn) {
    return currentLang === 'en' ? passType.descEn : passType.descHu;
  }
  
  // Old system: try to match by code first (most reliable)
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
  
  // If no match, return stored description (custom pass or old system)
  return passType.description || '';
}

/**
 * Get localized name for a purchased pass
 * Uses purchased names if available (for display consistency), otherwise falls back to passType
 */
export function getPurchasedPassDisplayName(pass: UserPass): string {
  const currentLang = i18n.language || 'hu';
  
  // Use purchased names if available (stored at purchase time)
  if (pass.purchasedNameHu && pass.purchasedNameEn) {
    return currentLang === 'en' ? pass.purchasedNameEn : pass.purchasedNameHu;
  }
  
  // Fallback to passType
  if (pass.passType) {
    return getPassDisplayName(pass.passType);
  }
  
  return 'Pass';
}

/**
 * Get localized description for a purchased pass
 * Uses purchased descriptions if available (for display consistency), otherwise falls back to passType
 */
export function getPurchasedPassDisplayDescription(pass: UserPass): string {
  const currentLang = i18n.language || 'hu';
  
  // Use purchased descriptions if available (stored at purchase time)
  if (pass.purchasedDescHu && pass.purchasedDescEn) {
    return currentLang === 'en' ? pass.purchasedDescEn : pass.purchasedDescHu;
  }
  
  // Fallback to passType
  if (pass.passType) {
    return getPassDisplayDescription(pass.passType);
  }
  
  return '';
}

