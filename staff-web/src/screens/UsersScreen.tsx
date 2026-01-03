import { useState, useEffect } from 'react';
import { staffAPI, User } from '../api/client';
import '../styles/Users.css';

export default function UsersScreen() {
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
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="users-container">
      <div className="users-header">
        <h1>User Management</h1>
        <div className="nav-buttons">
          <button onClick={() => window.location.href = '/dashboard'} className="nav-button">
            Dashboard
          </button>
          <button onClick={() => window.location.href = '/scanner'} className="nav-button">
            Scanner
          </button>
          <button onClick={() => window.location.href = '/create-pass'} className="nav-button">
            Create Pass
          </button>
          <button onClick={() => window.location.href = '/history'} className="nav-button">
            History
          </button>
        </div>
      </div>

      <div className="users-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>

        <div className="filter-options">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={activePassOnly}
              onChange={(e) => setActivePassOnly(e.target.checked)}
            />
            Active pass only
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={blockedOnly}
              onChange={(e) => setBlockedOnly(e.target.checked)}
            />
            Blocked only
          </label>
          <button onClick={loadUsers} className="refresh-button">
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading users...</div>
      ) : (
        <div className="users-content">
          <div className="users-stats">
            <span>Total users: <strong>{users.length}</strong></span>
            <span>Active passes: <strong>{users.filter(u => u.hasActivePass).length}</strong></span>
            <span>Blocked: <strong>{users.filter(u => u.isBlocked).length}</strong></span>
          </div>

          {users.length === 0 ? (
            <div className="empty-state">
              <p>No users found</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Active Pass</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                          <span className="pass-badge active">✓ Yes</span>
                          {user.activePassSummary && (
                            <div className="pass-info">
                              <div>{user.activePassSummary.passTypeName}</div>
                              {user.activePassSummary.validUntil && (
                                <div className="pass-detail">Expires: {formatDate(user.activePassSummary.validUntil)}</div>
                              )}
                              {user.activePassSummary.remainingEntries !== null && (
                                <div className="pass-detail">{user.activePassSummary.remainingEntries} entries left</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="pass-badge inactive">✗ No</span>
                      )}
                    </td>
                    <td>
                      {user.isBlocked ? (
                        <span className="status-badge blocked">BLOCKED</span>
                      ) : (
                        <span className="status-badge active">ACTIVE</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => window.location.href = `/users/${user.id}`}
                        className="action-button view"
                      >
                        View Details
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





