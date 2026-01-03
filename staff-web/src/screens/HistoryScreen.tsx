import { useState, useEffect } from 'react';
import { staffAPI } from '../api/client';
import '../styles/History.css';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await staffAPI.getHistory(50);
      setHistory(data);
    } catch (err: any) {
      setError(err.message || t('history.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>{t('history.title')}</h1>
        <div className="nav-buttons">
          <button onClick={() => window.location.href = '/dashboard'} className="nav-button">
            {t('dashboard.title')}
          </button>
          <button onClick={() => window.location.href = '/scanner'} className="nav-button">
            {t('dashboard.scanPass')}
          </button>
          <button onClick={() => window.location.href = '/users'} className="nav-button">
            {t('dashboard.viewUsers')}
          </button>
        </div>
      </div>

      {loading && <div className="loading">{t('common.loading')}</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && !error && (
        <div className="history-content">
          {history.length === 0 ? (
            <div className="empty-state">{t('history.noHistory')}</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>{t('history.time')}</th>
                  <th>{t('history.action')}</th>
                  <th>{t('history.member')}</th>
                  <th>{t('history.passType')}</th>
                  <th>{t('history.entriesConsumed')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log, index) => (
                  <tr key={index}>
                    <td>{formatDate(log.log.createdAt)}</td>
                    <td>
                      <span className={`action-badge action-${log.log.action.toLowerCase()}`}>
                        {log.log.action}
                      </span>
                    </td>
                    <td>{log.user?.name || t('common.nA')}</td>
                    <td>{log.passType?.name || t('common.nA')}</td>
                    <td>{log.log.consumedEntries || 0}</td>
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
