import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminAPI, GymDetail } from '../../api/adminClient';
import LanguageSelector from '../../components/LanguageSelector';
import '../../styles/AdminGymDetail.css';

export default function AdminGymDetailScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [gym, setGym] = useState<GymDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (id) {
      loadGym();
    }
  }, [id]);

  const loadGym = async () => {
    if (!id) return;
    
    setLoading(true);
    setError('');
    try {
      const data = await adminAPI.getGymById(id);
      setGym(data);
      setEditForm({
        company_name: data.company_name || '',
        tax_number: data.tax_number || '',
        address_line1: data.address_line1 || '',
        address_line2: data.address_line2 || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.country || 'HU',
        contact_name: data.contact_name || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load gym');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusinessInfo = async () => {
    if (!gym) return;
    
    setActionLoading(true);
    try {
      await adminAPI.updateGymBusinessInfo(gym.id, editForm);
      await loadGym();
      setEditing(false);
      alert('Business info updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update business info');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!gym || !window.confirm(`Block ${gym.name}? Staff will not be able to access their portal.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await adminAPI.blockGym(gym.id);
      await loadGym();
      alert('Gym blocked successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to block gym');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!gym || !window.confirm(`Unblock ${gym.name}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await adminAPI.unblockGym(gym.id);
      await loadGym();
      alert('Gym unblocked successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to unblock gym');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!gym || !window.confirm(`DELETE ${gym.name}? This will soft-delete the gym and it will no longer be accessible.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await adminAPI.deleteGym(gym.id);
      alert('Gym deleted successfully');
      window.location.href = '/admin/gyms';
    } catch (err: any) {
      alert(err.message || 'Failed to delete gym');
      setActionLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return <div className="admin-loading">Loading gym details...</div>;
  }

  if (error || !gym) {
    return (
      <div className="admin-error">
        <p>{error || 'Gym not found'}</p>
        <button onClick={() => window.location.href = '/admin/gyms'}>Back to Gyms</button>
      </div>
    );
  }

  return (
    <div className="admin-gym-detail">
      <div className="admin-header">
        <div className="header-title">
          <h1>{gym.name}</h1>
          {gym.staff_login_path && (
            <span className="staff-login-path">
              staff login: <code>/{gym.staff_login_path}</code>
            </span>
          )}
        </div>
        <LanguageSelector />
        <div className="admin-actions">
          <button onClick={() => window.location.href = '/admin/gyms'} className="btn-secondary">
            ← {t('admin.backToGyms')}
          </button>
        </div>
      </div>

      <div className="gym-info-grid">
        <div className="info-card">
          <h3>Business Information</h3>
          {!editing ? (
            <>
              <div className="info-row">
                <span className="label">Company Name:</span>
                <span className="value">{gym.company_name || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="label">Tax Number:</span>
                <span className="value">{gym.tax_number || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="label">Address:</span>
                <span className="value">
                  {gym.address_line1 || 'N/A'}<br/>
                  {gym.address_line2 && <>{gym.address_line2}<br/></>}
                  {gym.city && gym.postal_code && <>{gym.postal_code} {gym.city}<br/></>}
                  {gym.country || ''}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Contact:</span>
                <span className="value">
                  {gym.contact_name || 'N/A'}<br/>
                  {gym.contact_email || 'N/A'}<br/>
                  {gym.contact_phone || 'N/A'}
                </span>
              </div>
              <button onClick={() => setEditing(true)} className="btn-edit" style={{marginTop: '15px'}}>
                ✏️ Edit Business Info
              </button>
            </>
          ) : (
            <div className="edit-form">
              <input value={editForm.company_name} onChange={(e) => setEditForm({...editForm, company_name: e.target.value})} placeholder="Company Name" />
              <input value={editForm.tax_number} onChange={(e) => setEditForm({...editForm, tax_number: e.target.value})} placeholder="Tax Number" />
              <input value={editForm.address_line1} onChange={(e) => setEditForm({...editForm, address_line1: e.target.value})} placeholder="Address Line 1" />
              <input value={editForm.address_line2} onChange={(e) => setEditForm({...editForm, address_line2: e.target.value})} placeholder="Address Line 2" />
              <input value={editForm.city} onChange={(e) => setEditForm({...editForm, city: e.target.value})} placeholder="City" />
              <input value={editForm.postal_code} onChange={(e) => setEditForm({...editForm, postal_code: e.target.value})} placeholder="Postal Code" />
              <input value={editForm.country} onChange={(e) => setEditForm({...editForm, country: e.target.value})} placeholder="Country" />
              <input value={editForm.contact_name} onChange={(e) => setEditForm({...editForm, contact_name: e.target.value})} placeholder="Contact Name" />
              <input value={editForm.contact_email} onChange={(e) => setEditForm({...editForm, contact_email: e.target.value})} placeholder="Contact Email" />
              <input value={editForm.contact_phone} onChange={(e) => setEditForm({...editForm, contact_phone: e.target.value})} placeholder="Contact Phone" />
              <div style={{display: 'flex', gap: '10px', marginTop: '15px'}}>
                <button onClick={handleSaveBusinessInfo} disabled={actionLoading} className="btn-success">Save</button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className="info-card">
          <h3>Basic Information</h3>
          <div className="info-row">
            <span className="label">Slug:</span>
            <span className="value">{gym.slug}</span>
          </div>
          <div className="info-row">
            <span className="label">Status:</span>
            <span className={`status-badge status-${gym.status.toLowerCase()}`}>
              {gym.status}
            </span>
          </div>
          <div className="info-row">
            <span className="label">Created:</span>
            <span className="value">{formatDate(gym.created_at)}</span>
          </div>
          <div className="info-row">
            <span className="label">Staff Portal:</span>
            <span className="value">
              <a href={`http://${gym.slug}.gym.local:5173`} target="_blank" rel="noopener noreferrer">
                {gym.slug}.gym.local:5173
              </a>
            </span>
          </div>
        </div>

        <div className="info-card">
          <h3>Subscription (Stripe)</h3>
          {gym.subscription_status ? (
            <>
              <div className="info-row">
                <span className="label">Status:</span>
                <span className={`sub-status sub-${gym.subscription_status}`}>
                  {gym.subscription_status}
                </span>
              </div>
              {gym.current_period_end && (
                <div className="info-row">
                  <span className="label">Period End:</span>
                  <span className="value">{formatDate(gym.current_period_end)}</span>
                </div>
              )}
              {gym.stripe_customer_id && (
                <div className="info-row">
                  <span className="label">Customer ID:</span>
                  <span className="value code">{gym.stripe_customer_id}</span>
                </div>
              )}
            </>
          ) : (
            <p className="no-data">No subscription configured</p>
          )}
        </div>

        <div className="info-card">
          <h3>Metrics</h3>
          <div className="info-row">
            <span className="label">Total Passes:</span>
            <span className="value">{gym.metrics.totalPasses}</span>
          </div>
          <div className="info-row">
            <span className="label">Active Passes:</span>
            <span className="value">{gym.metrics.activePasses}</span>
          </div>
          <div className="info-row">
            <span className="label">Total Users:</span>
            <span className="value">{gym.metrics.totalUsers}</span>
          </div>
          {gym.metrics.lastActivity && (
            <div className="info-row">
              <span className="label">Last Activity:</span>
              <span className="value">{formatDate(gym.metrics.lastActivity)}</span>
            </div>
          )}
        </div>

        <div className="info-card">
          <h3>Passes by Type</h3>
          {gym.detailedMetrics.passesByType.length > 0 ? (
            <div className="passes-breakdown">
              {gym.detailedMetrics.passesByType.map((item, idx) => (
                <div key={idx} className="pass-type-row">
                  <span>{item.passType}</span>
                  <span className="count">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No passes issued yet</p>
          )}
        </div>
      </div>

      <div className="actions-section">
        <h3>Admin Actions</h3>
        <div className="action-buttons">
          {gym.status === 'ACTIVE' && (
            <button
              onClick={handleBlock}
              disabled={actionLoading}
              className="btn-danger"
            >
              🚫 Block Gym
            </button>
          )}
          {gym.status === 'BLOCKED' && (
            <button
              onClick={handleUnblock}
              disabled={actionLoading}
              className="btn-success"
            >
              ✅ Unblock Gym
            </button>
          )}
          {gym.status !== 'DELETED' && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="btn-danger-outline"
            >
              🗑️ Delete Gym (Soft Delete)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

