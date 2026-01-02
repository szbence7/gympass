import { useState, useEffect } from 'react';
import { staffAPI } from '../api/client';
import '../styles/History.css';

export default function HistoryScreen() {
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
      setError(err.message || 'Failed to load history');
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
        <h1>Scan History</h1>
        <div className="nav-buttons">
          <button onClick={() => window.location.href = '/dashboard'} className="nav-button">
            Dashboard
          </button>
          <button onClick={() => window.location.href = '/scanner'} className="nav-button">
            Scanner
          </button>
          <button onClick={() => window.location.href = '/users'} className="nav-button">
            Users
          </button>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && !error && (
        <div className="history-content">
          {history.length === 0 ? (
            <div className="empty-state">No scan history yet</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Member</th>
                  <th>Pass Type</th>
                  <th>Entries Consumed</th>
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
                    <td>{log.user?.name || 'N/A'}</td>
                    <td>{log.passType?.name || 'N/A'}</td>
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
