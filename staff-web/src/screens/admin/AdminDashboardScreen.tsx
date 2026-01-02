import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminAPI, Gym } from '../../api/adminClient';
import LanguageSelector from '../../components/LanguageSelector';
import '../../styles/AdminDashboard.css';

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAPI.getGyms();
      setGyms(data.filter(g => g.status !== 'DELETED'));
    } catch (err: any) {
      setError(err.message || 'Failed to load gyms');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
  };

  const totalGyms = gyms.length;
  const activeGyms = gyms.filter(g => g.status === 'ACTIVE').length;
  const blockedGyms = gyms.filter(g => g.status === 'BLOCKED').length;
  const totalPasses = gyms.reduce((sum, g) => sum + (g.metrics?.totalPasses || 0), 0);
  const totalUsers = gyms.reduce((sum, g) => sum + (g.metrics?.totalUsers || 0), 0);

  if (loading) {
    return <div className="admin-loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="admin-error">
        <p>{error}</p>
        <button onClick={loadGyms}>Retry</button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🏋️ {t('admin.title')}</h1>
        <LanguageSelector />
        <div className="admin-actions">
          <button onClick={() => window.location.href = '/admin/gyms'} className="btn-primary">
            {t('admin.gyms')}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-value">{totalGyms}</div>
          <div className="stat-label">Total Gyms</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{activeGyms}</div>
          <div className="stat-label">Active Gyms</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-value">{blockedGyms}</div>
          <div className="stat-label">Blocked Gyms</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-value">{totalPasses}</div>
          <div className="stat-label">Total Passes</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{totalUsers}</div>
          <div className="stat-label">Total Users</div>
        </div>
      </div>

      <div className="recent-gyms">
        <h2>Recent Gyms</h2>
        <div className="gyms-list">
          {gyms.slice(0, 5).map(gym => (
            <div key={gym.id} className="gym-card" onClick={() => window.location.href = `/admin/gyms/${gym.id}`}>
              <div className="gym-info">
                <h3>{gym.name}</h3>
                <p className="gym-slug">{gym.slug}.gym.local</p>
              </div>
              <div className="gym-status">
                <span className={`status-badge status-${gym.status.toLowerCase()}`}>
                  {gym.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

