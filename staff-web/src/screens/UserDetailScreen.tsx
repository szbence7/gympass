import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { staffAPI, UserDetail } from '../api/client';
import '../styles/Users.css';

export default function UserDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadUserDetail();
    }
  }, [id]);

  const loadUserDetail = async () => {
    if (!id) return;
    
    setLoading(true);
    setError('');
    try {
      const data = await staffAPI.getUserById(id);
      setUserDetail(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!id || !userDetail) return;
    
    const action = userDetail.user.isBlocked ? 'unblock' : 'block';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this user?\n\n` +
      `User: ${userDetail.user.name} (${userDetail.user.email})\n\n` +
      `${action === 'block' ? 'This will prevent them from logging in and using their passes.' : 'This will allow them to login and use their passes again.'}`
    );

    if (!confirmed) return;

    setActionLoading(true);
    try {
      if (userDetail.user.isBlocked) {
        await staffAPI.unblockUser(id);
      } else {
        await staffAPI.blockUser(id);
      }
      await loadUserDetail();
      alert(`User ${action}ed successfully`);
    } catch (err: any) {
      alert(err.message || `Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !userDetail) return;

    const email = userDetail.user.email;
    const confirmText = window.prompt(
      `⚠️ WARNING: This will permanently delete this user and all their passes!\n\n` +
      `User: ${userDetail.user.name}\n` +
      `Email: ${email}\n` +
      `Passes: ${userDetail.passes.length}\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Type the user's email to confirm deletion:`
    );

    if (confirmText !== email) {
      if (confirmText !== null) {
        alert('Deletion cancelled: Email did not match.');
      }
      return;
    }

    setActionLoading(true);
    try {
      await staffAPI.deleteUser(id);
      alert('User deleted successfully');
      navigate('/users');
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
      setActionLoading(false);
    }
  };

  const handlePassAction = async (passId: string, action: 'revoke' | 'restore') => {
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this pass?`
    );

    if (!confirmed) return;

    setActionLoading(true);
    try {
      if (action === 'revoke') {
        await staffAPI.revokePass(passId);
      } else {
        await staffAPI.restorePass(passId);
      }
      await loadUserDetail();
      alert(`Pass ${action}d successfully`);
    } catch (err: any) {
      alert(err.message || `Failed to ${action} pass`);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No expiry';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return <div className="users-container"><div className="loading-state">Loading...</div></div>;
  }

  if (error || !userDetail) {
    return (
      <div className="users-container">
        <div className="error-message">{error || 'User not found'}</div>
        <button onClick={() => navigate('/users')} className="nav-button">
          Back to Users
        </button>
      </div>
    );
  }

  const { user, passes } = userDetail;

  return (
    <div className="users-container">
      <div className="users-header">
        <h1>User Details</h1>
        <div className="nav-buttons">
          <button onClick={() => navigate('/users')} className="nav-button">
            ← Back to Users
          </button>
          <button onClick={() => window.location.href = '/dashboard'} className="nav-button">
            Dashboard
          </button>
        </div>
      </div>

      <div className="user-detail-content">
        <div className="detail-card">
          <h2>User Information</h2>
          <div className="detail-grid">
            <div className="detail-row">
              <span className="label">Name:</span>
              <span className="value">{user.name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Email:</span>
              <span className="value">{user.email}</span>
            </div>
            <div className="detail-row">
              <span className="label">Role:</span>
              <span className="value">{user.role}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className="value">
                {user.isBlocked ? (
                  <span className="status-badge blocked">BLOCKED</span>
                ) : (
                  <span className="status-badge active">ACTIVE</span>
                )}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Registered:</span>
              <span className="value">{formatDateTime(user.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="label">User ID:</span>
              <span className="value code">{user.id}</span>
            </div>
          </div>

          <div className="action-buttons">
            <button
              onClick={handleBlockUser}
              disabled={actionLoading}
              className={user.isBlocked ? 'action-button success' : 'action-button warning'}
            >
              {user.isBlocked ? 'Unblock User' : 'Block User'}
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="action-button danger"
            >
              Delete User
            </button>
          </div>
        </div>

        <div className="detail-card">
          <h2>Passes ({passes.length})</h2>
          {passes.length === 0 ? (
            <div className="empty-state">This user has no passes</div>
          ) : (
            <div className="passes-list">
              {passes.map((pass) => (
                <div key={pass.id} className="pass-item">
                  <div className="pass-item-header">
                    <h3>{pass.passTypeName}</h3>
                    <span className={`pass-status ${pass.status.toLowerCase()}`}>
                      {pass.status}
                    </span>
                  </div>
                  <div className="pass-item-details">
                    <div className="pass-item-row">
                      <span className="label">Purchased:</span>
                      <span>{formatDateTime(pass.purchasedAt)}</span>
                    </div>
                    <div className="pass-item-row">
                      <span className="label">Valid From:</span>
                      <span>{formatDate(pass.validFrom)}</span>
                    </div>
                    <div className="pass-item-row">
                      <span className="label">Valid Until:</span>
                      <span>{formatDate(pass.validUntil)}</span>
                    </div>
                    {pass.totalEntries !== null && (
                      <div className="pass-item-row">
                        <span className="label">Entries:</span>
                        <span>{pass.remainingEntries} / {pass.totalEntries}</span>
                      </div>
                    )}
                    <div className="pass-item-row">
                      <span className="label">Serial:</span>
                      <span className="code">{pass.walletSerialNumber}</span>
                    </div>
                  </div>
                  {pass.status === 'ACTIVE' && (
                    <button
                      onClick={() => handlePassAction(pass.id, 'revoke')}
                      disabled={actionLoading}
                      className="action-button small warning"
                    >
                      Revoke Pass
                    </button>
                  )}
                  {pass.status === 'REVOKED' && (
                    <button
                      onClick={() => handlePassAction(pass.id, 'restore')}
                      disabled={actionLoading}
                      className="action-button small success"
                    >
                      Restore Pass
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




