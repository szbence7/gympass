import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { staffAPI } from '../api/client';
import '../styles/PassManagement.css';

interface GlobalTemplate {
  templateId: string;
  behavior: 'DURATION' | 'VISITS';
  defaultName: { hu: string; en: string };
  defaultDescription: { hu: string; en: string };
  parameterConstraints: any;
}

interface PassOffering {
  id: string;
  templateId: string | null;
  isCustom: boolean;
  nameHu: string;
  nameEn: string;
  descHu: string;
  descEn: string;
  priceCents: number;
  enabled: boolean;
  behavior: 'DURATION' | 'VISITS';
  durationValue: number | null;
  durationUnit: 'day' | 'week' | 'month' | null;
  visitsCount: number | null;
  expiresInValue: number | null;
  expiresInUnit: 'day' | 'week' | 'month' | 'year' | null;
  neverExpires: boolean;
}

export default function PassManagementScreen() {
  const { t, i18n } = useTranslation();
  const [templates, setTemplates] = useState<GlobalTemplate[]>([]);
  const [offerings, setOfferings] = useState<PassOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingOffering, setEditingOffering] = useState<PassOffering | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [templatesData, offeringsData] = await Promise.all([
        staffAPI.getPassTemplates(),
        staffAPI.getPassOfferings(),
      ]);
      setTemplates(templatesData);
      setOfferings(offeringsData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('passManagement.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const getOfferingForTemplate = (templateId: string): PassOffering | undefined => {
    return offerings.find(o => o.templateId === templateId);
  };

  const handleEnableTemplate = async (template: GlobalTemplate) => {
    const existing = getOfferingForTemplate(template.templateId);
    if (existing) {
      setEditingOffering(existing);
    } else {
      // Create new offering from template
      const newOffering: Partial<PassOffering> = {
        templateId: template.templateId,
        isCustom: false,
        nameHu: template.defaultName.hu,
        nameEn: template.defaultName.en,
        descHu: template.defaultDescription.hu,
        descEn: template.defaultDescription.en,
        priceCents: 0, // Staff must set price
        enabled: true,
        behavior: template.behavior,
        durationValue: null,
        durationUnit: null,
        visitsCount: null,
        expiresInValue: null,
        expiresInUnit: null,
        neverExpires: false,
      };
      setEditingOffering(newOffering as PassOffering);
    }
  };

  const handleSaveOffering = async (offering: Partial<PassOffering>) => {
    try {
      setSaving(true);
      setError('');
      
      if (editingOffering?.id) {
        await staffAPI.updatePassOffering(editingOffering.id, offering);
      } else {
        await staffAPI.createPassOffering(offering);
      }
      
      setEditingOffering(null);
      setShowCustomForm(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || t('passManagement.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (offering: PassOffering) => {
    try {
      await staffAPI.updatePassOffering(offering.id, { enabled: !offering.enabled });
      await loadData();
    } catch (err: any) {
      setError(err.message || t('passManagement.failedToUpdate'));
    }
  };

  if (loading) {
    return (
      <div className="pass-management-container">
        <div className="loading-state">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="pass-management-container">
      <div className="pass-management-header">
        <h1>{t('passManagement.title')}</h1>
        <div className="nav-buttons">
          <button onClick={() => window.location.href = '/dashboard'} className="nav-button">
            {t('dashboard.title')}
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Global Templates Section */}
      <div className="templates-section">
        <h2>{t('passManagement.globalTemplates')}</h2>
        <div className="templates-list">
          {templates.map((template) => {
            const offering = getOfferingForTemplate(template.templateId);
            const isEnabled = offering?.enabled || false;
            
            return (
              <div key={template.templateId} className="template-item">
                <div className="template-header">
                  <h3>{i18n.language === 'en' ? template.defaultName.en : template.defaultName.hu}</h3>
                  <label className="enable-checkbox">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => {
                        if (offering) {
                          handleToggleEnabled(offering);
                        } else {
                          handleEnableTemplate(template);
                        }
                      }}
                    />
                    {t('passManagement.enabled')}
                  </label>
                </div>
                <p className="template-desc">
                  {i18n.language === 'en' ? template.defaultDescription.en : template.defaultDescription.hu}
                </p>
                {offering && (
                  <div className="offering-info">
                    <span>{t('passManagement.price')}: {offering.priceCents / 100} HUF</span>
                    <button
                      onClick={() => setEditingOffering(offering)}
                      className="edit-button"
                    >
                      {t('common.edit')}
                    </button>
                  </div>
                )}
                {!offering && isEnabled && (
                  <button
                    onClick={() => handleEnableTemplate(template)}
                    className="configure-button"
                  >
                    {t('passManagement.configure')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Passes Section */}
      <div className="custom-section">
        <div className="custom-header">
          <h2>{t('passManagement.customPasses')}</h2>
          <button
            onClick={() => {
              setShowCustomForm(true);
              setEditingOffering({
                id: '',
                templateId: null,
                isCustom: true,
                nameHu: '',
                nameEn: '',
                descHu: '',
                descEn: '',
                priceCents: 0,
                enabled: true,
                behavior: 'DURATION',
                durationValue: null,
                durationUnit: null,
                visitsCount: null,
                expiresInValue: null,
                expiresInUnit: null,
                neverExpires: false,
              } as PassOffering);
            }}
            className="add-custom-button"
          >
            {t('passManagement.addCustom')}
          </button>
        </div>

        <div className="custom-list">
          {offerings.filter(o => o.isCustom).map((offering) => (
            <div key={offering.id} className="custom-item">
              <div className="custom-header-row">
                <h3>{i18n.language === 'en' ? offering.nameEn : offering.nameHu}</h3>
                <label className="enable-checkbox">
                  <input
                    type="checkbox"
                    checked={offering.enabled}
                    onChange={() => handleToggleEnabled(offering)}
                  />
                  {t('passManagement.enabled')}
                </label>
              </div>
              <p>{i18n.language === 'en' ? offering.descEn : offering.descHu}</p>
              <div className="custom-info">
                <span>{t('passManagement.price')}: {offering.priceCents / 100} HUF</span>
                <button
                  onClick={() => setEditingOffering(offering)}
                  className="edit-button"
                >
                  {t('common.edit')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {(editingOffering || showCustomForm) && (
        <OfferingFormModal
          offering={editingOffering}
          onSave={handleSaveOffering}
          onCancel={() => {
            setEditingOffering(null);
            setShowCustomForm(false);
          }}
          saving={saving}
          template={editingOffering?.templateId ? templates.find(t => t.templateId === editingOffering.templateId) : undefined}
        />
      )}
    </div>
  );
}

function OfferingFormModal({
  offering,
  onSave,
  onCancel,
  saving,
  template,
}: {
  offering: PassOffering | null;
  onSave: (offering: Partial<PassOffering>) => void;
  onCancel: () => void;
  saving: boolean;
  template?: GlobalTemplate | null;
}) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState<Partial<PassOffering>>(offering || {});
  
  // Determine if this is a template-based offering (read-only fields)
  const isTemplateBased = offering?.templateId && !offering.isCustom;
  const isCustom = !offering?.templateId || offering.isCustom;
  
  // Determine which fields are editable based on template type
  const canEditName = isCustom;
  const canEditDesc = isCustom;
  const canEditBehavior = isCustom;
  const canEditDuration = isCustom && formData.behavior === 'DURATION';
  const canEditVisits = isCustom && formData.behavior === 'VISITS';
  const canEditExpiry = isCustom || (isTemplateBased && offering?.templateId !== 'DURATION_MONTHS');
  const canEditPrice = true; // Always editable

  useEffect(() => {
    if (offering) {
      setFormData(offering);
    }
  }, [offering]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation (only for custom passes or required fields)
    if (isCustom) {
      if (!formData.nameHu || !formData.nameEn || !formData.descHu || !formData.descEn) {
        alert(t('passManagement.fillAllFields'));
        return;
      }
      
      if (formData.behavior === 'DURATION' && (!formData.durationValue || !formData.durationUnit)) {
        alert(t('passManagement.durationRequired'));
        return;
      }
      
      if (formData.behavior === 'VISITS' && !formData.visitsCount) {
        alert(t('passManagement.visitsRequired'));
        return;
      }
    }
    
    if (!formData.priceCents || formData.priceCents <= 0) {
      alert(t('passManagement.invalidPrice'));
      return;
    }
    
    if (canEditExpiry && !formData.neverExpires && (!formData.expiresInValue || !formData.expiresInUnit)) {
      alert(t('passManagement.expiryRequired'));
      return;
    }
    
    // For template-based, send all required fields for creation, or only editable fields for update
    if (isTemplateBased && offering?.id) {
      // Update: only send editable fields
      const editableData: Partial<PassOffering> = {
        priceCents: formData.priceCents,
      };
      
      if (canEditExpiry) {
        editableData.neverExpires = formData.neverExpires;
        editableData.expiresInValue = formData.expiresInValue;
        editableData.expiresInUnit = formData.expiresInUnit;
      }
      
      // Template-specific editable fields
      if (offering?.templateId === 'VISITS_SINGLE' || offering?.templateId === 'VISITS_TEN') {
        editableData.visitsCount = formData.visitsCount;
      }
      
      onSave(editableData);
    } else {
      // Create new (template-based or custom): send all required fields
      // For template-based, formData should already have all fields from handleEnableTemplate
      // For custom, formData should have all fields from the form
      const fullData: Partial<PassOffering> = {
        ...formData,
        // Ensure required fields are set
        templateId: formData.templateId || offering?.templateId || null,
        isCustom: formData.isCustom ?? (formData.templateId ? false : true),
        enabled: formData.enabled ?? true,
        behavior: formData.behavior || offering?.behavior || template?.behavior || 'DURATION',
        neverExpires: formData.neverExpires ?? false,
        // Ensure name/desc are present (from template defaults if template-based)
        nameHu: formData.nameHu || offering?.nameHu || template?.defaultName?.hu || '',
        nameEn: formData.nameEn || offering?.nameEn || template?.defaultName?.en || '',
        descHu: formData.descHu || offering?.descHu || template?.defaultDescription?.hu || '',
        descEn: formData.descEn || offering?.descEn || template?.defaultDescription?.en || '',
      };
      
      onSave(fullData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content pass-offering-form" onClick={(e) => e.stopPropagation()}>
        <h2>{offering?.id ? t('passManagement.editOffering') : t('passManagement.createOffering')}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>{t('passManagement.namesAndDescriptions')}</h3>
            
            {isTemplateBased && template ? (
              <>
                <div className="form-group">
                  <label>{t('passManagement.nameHu')}</label>
                  <input
                    type="text"
                    value={i18n.language === 'en' ? template.defaultName.en : template.defaultName.hu}
                    disabled
                    className="read-only-field"
                  />
                  <small style={{ color: '#A8B3CF', fontSize: '0.85em' }}>
                    {t('passManagement.templateFieldLocked')}
                  </small>
                </div>
                
                <div className="form-group">
                  <label>{t('passManagement.nameEn')}</label>
                  <input
                    type="text"
                    value={template.defaultName.en}
                    disabled
                    className="read-only-field"
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('passManagement.descHu')}</label>
                  <textarea
                    value={i18n.language === 'en' ? template.defaultDescription.en : template.defaultDescription.hu}
                    disabled
                    className="read-only-field"
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('passManagement.descEn')}</label>
                  <textarea
                    value={template.defaultDescription.en}
                    disabled
                    className="read-only-field"
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>{t('passManagement.nameHu')} *</label>
                  <input
                    type="text"
                    value={formData.nameHu || ''}
                    onChange={(e) => setFormData({ ...formData, nameHu: e.target.value })}
                    required={isCustom}
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('passManagement.nameEn')} *</label>
                  <input
                    type="text"
                    value={formData.nameEn || ''}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    required={isCustom}
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('passManagement.descHu')} *</label>
                  <textarea
                    value={formData.descHu || ''}
                    onChange={(e) => setFormData({ ...formData, descHu: e.target.value })}
                    required={isCustom}
                    rows={3}
                  />
                </div>
                
                <div className="form-group">
                  <label>{t('passManagement.descEn')} *</label>
                  <textarea
                    value={formData.descEn || ''}
                    onChange={(e) => setFormData({ ...formData, descEn: e.target.value })}
                    required={isCustom}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <div className="form-section">
            <h3>{t('passManagement.pricing')}</h3>
            
            <div className="form-group">
              <label>{t('passManagement.priceHuf')} *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.priceCents ? formData.priceCents / 100 : ''}
                onChange={(e) => setFormData({ ...formData, priceCents: Math.round(parseFloat(e.target.value) * 100) })}
                required
              />
            </div>
          </div>

          {isCustom && (
            <div className="form-section">
              <h3>{t('passManagement.behavior')}</h3>
              
              <div className="form-group">
                <label>{t('passManagement.behaviorType')} *</label>
                <select
                  value={formData.behavior || 'DURATION'}
                  onChange={(e) => setFormData({ ...formData, behavior: e.target.value as 'DURATION' | 'VISITS' })}
                  required
                >
                  <option value="DURATION">{t('passManagement.durationBased')}</option>
                  <option value="VISITS">{t('passManagement.visitsBased')}</option>
                </select>
              </div>

              {formData.behavior === 'DURATION' && (
                <>
                  <div className="form-group">
                    <label>{t('passManagement.durationValue')} *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.durationValue || ''}
                      onChange={(e) => setFormData({ ...formData, durationValue: parseInt(e.target.value) || null })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>{t('passManagement.durationUnit')} *</label>
                    <select
                      value={formData.durationUnit || 'day'}
                      onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value as 'day' | 'week' | 'month' })}
                      required
                    >
                      <option value="day">{t('passManagement.days')}</option>
                      <option value="week">{t('passManagement.weeks')}</option>
                      <option value="month">{t('passManagement.months')}</option>
                    </select>
                  </div>
                </>
              )}

              {formData.behavior === 'VISITS' && (
                <div className="form-group">
                  <label>{t('passManagement.visitsCount')} *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.visitsCount || ''}
                    onChange={(e) => setFormData({ ...formData, visitsCount: parseInt(e.target.value) || null })}
                    required
                  />
                </div>
              )}
            </div>
          )}
          
          {isTemplateBased && (offering?.templateId === 'VISITS_SINGLE' || offering?.templateId === 'VISITS_TEN') && (
            <div className="form-section">
              <h3>{t('passManagement.behavior')}</h3>
              
              <div className="form-group">
                <label>{t('passManagement.visitsCount')} *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.visitsCount || ''}
                  onChange={(e) => setFormData({ ...formData, visitsCount: parseInt(e.target.value) || null })}
                  required
                />
              </div>
            </div>
          )}

          {canEditExpiry && (
            <div className="form-section">
              <h3>{t('passManagement.expiry')}</h3>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.neverExpires || false}
                    onChange={(e) => setFormData({ ...formData, neverExpires: e.target.checked, expiresInValue: null, expiresInUnit: null })}
                  />
                  {t('passManagement.neverExpires')}
                </label>
              </div>

              {!formData.neverExpires && (
                <>
                  <div className="form-group">
                    <label>{t('passManagement.expiresInValue')} *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.expiresInValue || ''}
                      onChange={(e) => setFormData({ ...formData, expiresInValue: parseInt(e.target.value) || null })}
                      required={!formData.neverExpires}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>{t('passManagement.expiresInUnit')} *</label>
                    <select
                      value={formData.expiresInUnit || 'month'}
                      onChange={(e) => setFormData({ ...formData, expiresInUnit: e.target.value as 'day' | 'week' | 'month' | 'year' })}
                      required={!formData.neverExpires}
                    >
                      <option value="day">{t('passManagement.days')}</option>
                      <option value="week">{t('passManagement.weeks')}</option>
                      <option value="month">{t('passManagement.months')}</option>
                      <option value="year">{t('passManagement.years')}</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="secondary-button">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving} className="primary-button">
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

