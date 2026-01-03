/**
 * Global Pass Templates Catalog
 * 
 * These templates define the "behavior/category" of passes available to all gyms.
 * Each gym creates their own "offerings" from these templates with:
 * - Localized names (HU + EN)
 * - Localized descriptions (HU + EN)
 * - Gym-specific pricing (HUF)
 * - Parameterized rules (duration/visits + expiry)
 * - Enable/disable flag
 */

export type PassBehavior = 'DURATION' | 'VISITS';
export type DurationUnit = 'day' | 'week' | 'month';
export type ExpiryUnit = 'day' | 'week' | 'month' | 'year';

export interface GlobalPassTemplate {
  templateId: string; // Stable identifier
  behavior: PassBehavior;
  defaultName: {
    hu: string;
    en: string;
  };
  defaultDescription: {
    hu: string;
    en: string;
  };
  parameterConstraints: {
    // For DURATION behavior
    durationMin?: number;
    durationMax?: number;
    allowedDurationUnits?: DurationUnit[];
    // For VISITS behavior
    visitsMin?: number;
    visitsMax?: number;
    // Expiry options
    allowNeverExpires?: boolean;
    expiryMin?: number;
    expiryMax?: number;
    allowedExpiryUnits?: ExpiryUnit[];
  };
}

export const GLOBAL_PASS_TEMPLATES: GlobalPassTemplate[] = [
  {
    templateId: 'VISITS_SINGLE',
    behavior: 'VISITS',
    defaultName: {
      hu: '1 alkalmas belépő',
      en: 'Single entry',
    },
    defaultDescription: {
      hu: '1 belépés, konfigurálható lejárat',
      en: '1 visit with configurable expiry',
    },
    parameterConstraints: {
      visitsMin: 1,
      visitsMax: 1,
      allowNeverExpires: true,
      expiryMin: 1,
      expiryMax: 12,
      allowedExpiryUnits: ['month', 'year'],
    },
  },
  {
    templateId: 'VISITS_TEN',
    behavior: 'VISITS',
    defaultName: {
      hu: '10 alkalmas',
      en: '10 visits',
    },
    defaultDescription: {
      hu: '10 belépés, konfigurálható lejárat',
      en: '10 visits with configurable expiry',
    },
    parameterConstraints: {
      visitsMin: 10,
      visitsMax: 10,
      allowNeverExpires: true,
      expiryMin: 1,
      expiryMax: 12,
      allowedExpiryUnits: ['month', 'year'],
    },
  },
  {
    templateId: 'DURATION_MONTHS',
    behavior: 'DURATION',
    defaultName: {
      hu: 'Havi',
      en: 'Monthly',
    },
    defaultDescription: {
      hu: 'Korlátlan belépés 1 hónapig',
      en: 'Unlimited entries for 1 month',
    },
    parameterConstraints: {
      durationMin: 1,
      durationMax: 1,
      allowedDurationUnits: ['month'],
      allowNeverExpires: false,
      expiryMin: 1,
      expiryMax: 1,
      allowedExpiryUnits: ['month'],
    },
  },
];

/**
 * Get a template by ID
 */
export function getGlobalTemplate(templateId: string): GlobalPassTemplate | undefined {
  return GLOBAL_PASS_TEMPLATES.find(t => t.templateId === templateId);
}

/**
 * Get all templates
 */
export function getAllGlobalTemplates(): GlobalPassTemplate[] {
  return GLOBAL_PASS_TEMPLATES;
}

