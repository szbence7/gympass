import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { staffAPI, User } from '../api/client';
import '../styles/Users.css';

export default function UsersScreen() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePassOnly, setActivePassOnly] = useState(false);
  const [blockedOnly, setBlockedOnly] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [activePassOnly, blockedOnly]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const userData = await staffAPI.getUsers(searchQuery, activePassOnly, blockedOnly);
      setUsers(userData);
    } catch (err: any) {
      setError(err.message || t('users.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('common.nA');
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="users-container">
      <div className="users-header">
        <h1>{t('users.title')}</h1>
        <div className="nav-buttons">
          <button onClick={() => window.location.href = '/dashboard'} className="nav-button">
            {t('dashboard.title')}
          </button>
          <button onClick={() => window.location.href = '/scanner'} className="nav-button">
            {t('dashboard.scanPass')}
          </button>
          <button onClick={() => window.location.href = '/create-pass'} className="nav-button">
            {t('dashboard.createPass')}
          </button>
          <button onClick={() => window.location.href = '/history'} className="nav-button">
            {t('dashboard.viewHistory')}
          </button>
        </div>
      </div>

      <div className="users-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder={t('users.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">{t('common.search')}</button>
        </form>

        <div className="filter-options">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={activePassOnly}
              onChange={(e) => setActivePassOnly(e.target.checked)}
            />
            {t('users.activePassOnly')}
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={blockedOnly}
              onChange={(e) => setBlockedOnly(e.target.checked)}
            />
            {t('users.blockedOnly')}
          </label>
          <button onClick={loadUsers} className="refresh-button">
            ↻ {t('common.refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">{t('common.loading')}</div>
      ) : (
        <div className="users-content">
          <div className="users-stats">
            <span>{t('users.totalUsers')}: <strong>{users.length}</strong></span>
            <span>{t('users.activeUsers')}: <strong>{users.filter(u => u.hasActivePass).length}</strong></span>
            <span>{t('users.blockedUsers')}: <strong>{users.filter(u => u.isBlocked).length}</strong></span>
          </div>

          {users.length === 0 ? (
            <div className="empty-state">
              <p>{t('users.noUsers')}</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>{t('scanner.name')}</th>
                  <th>{t('scanner.email')}</th>
                  <th>{t('userDetail.registered')}</th>
                  <th>{t('users.activePassOnly')}</th>
                  <th>{t('users.status')}</th>
                  <th>{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={user.isBlocked ? 'blocked-row' : ''}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      {user.hasActivePass ? (
                        <div className="pass-summary">
                          <span className="pass-badge active">✓ {t('common.yes')}</span>
                          {user.activePassSummary && (
                            <div className="pass-info">
                              <div>{user.activePassSummary.passTypeName}</div>
                              {user.activePassSummary.validUntil && (
                                <div className="pass-detail">{t('passes.expires')}: {formatDate(user.activePassSummary.validUntil)}</div>
                              )}
                              {user.activePassSummary.remainingEntries !== null && (
                                <div className="pass-detail">{user.activePassSummary.remainingEntries} {t('passes.entriesLeft')}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="pass-badge inactive">✗ {t('common.no')}</span>
                      )}
                    </td>
                    <td>
                      {user.isBlocked ? (
                        <span className="status-badge blocked">{t('userDetail.blocked')}</span>
                      ) : (
                        <span className="status-badge active">{t('userDetail.active')}</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => window.location.href = `/users/${user.id}`}
                        className="action-button view"
                      >
                        {t('users.viewDetails')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}





