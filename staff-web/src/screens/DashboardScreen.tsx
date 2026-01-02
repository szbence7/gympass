import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { staffAPI, DashboardData } from '../api/client';
import LanguageSelector from '../components/LanguageSelector';
import '../styles/Dashboard.css';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGymInfo, setShowGymInfo] = useState(false);
  const [gymInfo, setGymInfo] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const dashboardData = await staffAPI.getDashboard(10);
      setData(dashboardData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Biztosan ki akarsz jelentkezni?')) {
      localStorage.removeItem('staff_token');
      localStorage.removeItem('staff_user');
      window.location.href = '/';
    }
  };

  const handleShowGymInfo = async () => {
    try {
      const info = await staffAPI.getGymInfo();
      setGymInfo(info);
      setShowGymInfo(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load gym info');
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>{t('dashboard.title')}</h1>
        <LanguageSelector />
        <div className="nav-buttons">
          <button onClick={() => window.location.href = '/scanner'} className="nav-button">
            Scanner
          </button>
          <button onClick={() => window.location.href = '/users'} className="nav-button">
            Users
          </button>
          <button onClick={() => window.location.href = '/create-pass'} className="nav-button">
            Create Pass
          </button>
          <button onClick={() => window.location.href = '/history'} className="nav-button">
            History
          </button>
          <button onClick={handleShowGymInfo} className="nav-button">
            🏢 {t('dashboard.gymInfo')}
          </button>
          <button onClick={loadDashboard} className="nav-button refresh-button">
            ↻ Refresh
          </button>
          <button onClick={handleLogout} className="nav-button logout-button">
            🚪 Logout
          </button>
        </div>
      </div>

      {showGymInfo && gymInfo && (
        <div className="modal-overlay" onClick={() => setShowGymInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Gym Business Information (Read-Only)</h2>
            <div className="gym-info-display">
              <div className="info-section">
                <h3>Company</h3>
                <p><strong>Name:</strong> {gymInfo.company_name || 'N/A'}</p>
                <p><strong>Tax Number:</strong> {gymInfo.tax_number || 'N/A'}</p>
              </div>
              <div className="info-section">
                <h3>Address</h3>
                <p>{gymInfo.address_line1 || 'N/A'}</p>
                {gymInfo.address_line2 && <p>{gymInfo.address_line2}</p>}
                <p>{gymInfo.postal_code} {gymInfo.city}</p>
                <p>{gymInfo.country}</p>
              </div>
              <div className="info-section">
                <h3>Contact</h3>
                <p><strong>Name:</strong> {gymInfo.contact_name || 'N/A'}</p>
                <p><strong>Email:</strong> {gymInfo.contact_email || 'N/A'}</p>
                <p><strong>Phone:</strong> {gymInfo.contact_phone || 'N/A'}</p>
              </div>
            </div>
            <p className="info-note">⚠️ Only platform administrators can edit this information.</p>
            <button onClick={() => setShowGymInfo(false)} className="btn-close">Close</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="dashboard-loading">
          <div className="stats-grid">
            <div className="stat-card skeleton"></div>
            <div className="stat-card skeleton"></div>
            <div className="stat-card skeleton"></div>
            <div className="stat-card skeleton"></div>
          </div>
          <div className="panels-grid">
            <div className="panel skeleton"></div>
            <div className="panel skeleton"></div>
          </div>
        </div>
      )}

      {error && (
        <div className="dashboard-error">
          <p>⚠️ {error}</p>
          <button onClick={loadDashboard} className="retry-button">
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Today</div>
              <div className="stat-value">{data.stats.purchases.today}</div>
              <div className="stat-caption">New passes</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">This Week</div>
              <div className="stat-value">{data.stats.purchases.week}</div>
              <div className="stat-caption">New passes</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">This Month</div>
              <div className="stat-value">{data.stats.purchases.month}</div>
              <div className="stat-caption">New passes</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-label">Active Passes</div>
              <div className="stat-value">{data.stats.activePasses}</div>
              <div className="stat-caption">Currently valid</div>
            </div>
          </div>

          <div className="panels-grid">
            <div className="panel">
              <h2>Recent Check-ins</h2>
              {data.recentCheckIns.length === 0 ? (
                <div className="empty-state">
                  <p>No check-ins yet</p>
                  <span className="empty-icon">📋</span>
                </div>
              ) : (
                <div className="checkins-list">
                  {data.recentCheckIns.map((checkin, idx) => (
                    <div key={idx} className="checkin-item">
                      <div className="checkin-user">
                        <div className="user-name">{checkin.user.name}</div>
                        <div className="user-email">{checkin.user.email}</div>
                      </div>
                      <div className="checkin-details">
                        <div className="pass-type">{checkin.pass.typeName}</div>
                        <div className="checkin-time">{formatDateTime(checkin.at)}</div>
                      </div>
                      {checkin.pass.remainingEntries !== null && (
                        <div className="remaining-badge">
                          {checkin.pass.remainingEntries} left
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <h2>Alerts</h2>
              <div className="alerts-section">
                {data.alerts.expiringSoon.length > 0 && (
                  <div className="alert-group">
                    <h3 className="alert-title">⏰ Expiring Soon ({data.alerts.expiringSoon.length})</h3>
                    <div className="alert-list">
                      {data.alerts.expiringSoon.map((alert, idx) => (
                        <div key={idx} className="alert-item expiring">
                          <div className="alert-user">{alert.userName}</div>
                          <div className="alert-meta">
                            <span className="alert-type">{alert.typeName}</span>
                            <span className="alert-date">
                              {new Date(alert.validUntil).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.alerts.lowEntries.length > 0 && (
                  <div className="alert-group">
                    <h3 className="alert-title">🔔 Low Entries ({data.alerts.lowEntries.length})</h3>
                    <div className="alert-list">
                      {data.alerts.lowEntries.map((alert, idx) => (
                        <div key={idx} className="alert-item low-entries">
                          <div className="alert-user">{alert.userName}</div>
                          <div className="alert-meta">
                            <span className="alert-type">{alert.typeName}</span>
                            <span className="alert-count">
                              {alert.remainingEntries} remaining
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.alerts.expiringSoon.length === 0 && data.alerts.lowEntries.length === 0 && (
                  <div className="empty-state">
                    <p>No alerts</p>
                    <span className="empty-icon">✅</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

