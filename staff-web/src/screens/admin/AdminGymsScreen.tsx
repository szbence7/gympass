import { useEffect, useState } from 'react';
import { adminAPI, Gym } from '../../api/adminClient';
import '../../styles/AdminGyms.css';

export default function AdminGymsScreen() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGyms();
  }, [search, statusFilter]);

  const loadGyms = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminAPI.getGyms(search, statusFilter);
      setGyms(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load gyms');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getSubscriptionStatus = (gym: Gym) => {
    if (!gym.subscription_status) {
      return <span className="sub-status no-sub">No subscription</span>;
    }
    return (
      <span className={`sub-status sub-${gym.subscription_status}`}>
        {gym.subscription_status}
        {gym.current_period_end && ` (until ${formatDate(gym.current_period_end)})`}
      </span>
    );
  };

  return (
    <div className="admin-gyms">
      <div className="admin-header">
        <h1>Manage Gyms</h1>
        <div className="admin-actions">
          <button onClick={() => window.location.href = '/admin'} className="btn-secondary">
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading gyms...</div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <button onClick={loadGyms}>Retry</button>
        </div>
      ) : (
        <div className="gyms-table-container">
          <table className="gyms-table">
            <thead>
              <tr>
                <th>Gym Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Created</th>
                <th>Subscription</th>
                <th>Passes</th>
                <th>Users</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {gyms.map(gym => (
                <tr key={gym.id}>
                  <td className="gym-name">{gym.name}</td>
                  <td className="gym-slug">{gym.slug}</td>
                  <td>
                    <span className={`status-badge status-${gym.status.toLowerCase()}`}>
                      {gym.status}
                    </span>
                  </td>
                  <td>{formatDate(gym.created_at)}</td>
                  <td>{getSubscriptionStatus(gym)}</td>
                  <td>{gym.metrics?.totalPasses || 0}</td>
                  <td>{gym.metrics?.totalUsers || 0}</td>
                  <td>
                    <button
                      onClick={() => window.location.href = `/admin/gyms/${gym.id}`}
                      className="btn-view"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {gyms.length === 0 && (
            <div className="no-results">
              <p>No gyms found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




