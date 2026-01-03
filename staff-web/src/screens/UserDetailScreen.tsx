import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { staffAPI, UserDetail } from '../api/client';
import '../styles/Users.css';

export default function UserDetailScreen() {
  const { t } = useTranslation();
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
      userDetail.user.isBlocked 
        ? t('userDetail.confirmUnblock')
        : t('userDetail.confirmBlock')
    );

    if (!confirmed) return;

    setActionLoading(true);
    try {
      if (userDetail.user.isBlocked) {
        await staffAPI.unblockUser(id);
        alert(t('userDetail.userUnblocked'));
      } else {
        await staffAPI.blockUser(id);
        alert(t('userDetail.userBlocked'));
      }
      await loadUserDetail();
    } catch (err: any) {
      alert(err.message || t('userDetail.failedToBlock'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !userDetail) return;

    const email = userDetail.user.email;
    const confirmText = window.prompt(
      `${t('userDetail.confirmDelete')}\n\n` +
      `${t('scanner.name')}: ${userDetail.user.name}\n` +
      `${t('scanner.email')}: ${email}\n` +
      `${t('userDetail.passes')}: ${userDetail.passes.length}\n\n` +
      `${t('userDetail.typeEmailToConfirm')}`
    );

    if (confirmText !== email) {
      if (confirmText !== null) {
        alert(t('userDetail.deletionCancelled'));
      }
      return;
    }

    setActionLoading(true);
    try {
      await staffAPI.deleteUser(id);
      alert(t('userDetail.userDeleted'));
      navigate('/users');
    } catch (err: any) {
      alert(err.message || t('userDetail.failedToDelete'));
      setActionLoading(false);
    }
  };

  const handlePassAction = async (passId: string, action: 'revoke' | 'restore') => {
    const confirmed = window.confirm(
      action === 'revoke' ? t('userDetail.confirmRevoke') : t('userDetail.confirmRestore')
    );

    if (!confirmed) return;

    setActionLoading(true);
    try {
      if (action === 'revoke') {
        await staffAPI.revokePass(passId);
        alert(t('userDetail.passRevoked'));
      } else {
        await staffAPI.restorePass(passId);
        alert(t('userDetail.passRestored'));
      }
      await loadUserDetail();
    } catch (err: any) {
      alert(err.message || t('userDetail.failedToLoad'));
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('passes.noExpiry');
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return <div className="users-container"><div className="loading-state">{t('common.loading')}</div></div>;
  }

  if (error || !userDetail) {
    return (
      <div className="users-container">
        <div className="error-message">{error || t('userDetail.failedToLoad')}</div>
        <button onClick={() => navigate('/users')} className="nav-button">
          {t('common.back')} {t('users.title')}
        </button>
      </div>
    );
  }

  const { user, passes } = userDetail;

  return (
    <div className="users-container">
      <div className="users-header">
        <h1>{t('userDetail.title')}</h1>
        <div className="nav-buttons">
          <button onClick={() => navigate('/users')} className="nav-button">
            ← {t('common.back')} {t('users.title')}
          </button>
          <button onClick={() => window.location.href = '/dashboard'} className="nav-button">
            {t('dashboard.title')}
          </button>
        </div>
      </div>

      <div className="user-detail-content">
        <div className="detail-card">
          <h2>{t('userDetail.userInfo')}</h2>
          <div className="detail-grid">
            <div className="detail-row">
              <span className="label">{t('scanner.name')}:</span>
              <span className="value">{user.name}</span>
            </div>
            <div className="detail-row">
              <span className="label">{t('scanner.email')}:</span>
              <span className="value">{user.email}</span>
            </div>
            <div className="detail-row">
              <span className="label">{t('userDetail.registered')}:</span>
              <span className="value">{formatDateTime(user.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="label">{t('users.status')}:</span>
              <span className="value">
                {user.isBlocked ? (
                  <span className="status-badge blocked">{t('userDetail.blocked')}</span>
                ) : (
                  <span className="status-badge active">{t('userDetail.active')}</span>
                )}
              </span>
            </div>
          </div>

          <div className="action-buttons">
            <button
              onClick={handleBlockUser}
              disabled={actionLoading}
              className={user.isBlocked ? 'action-button success' : 'action-button warning'}
            >
              {user.isBlocked ? t('userDetail.unblockUser') : t('userDetail.blockUser')}
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="action-button danger"
            >
              {t('userDetail.deleteUser')}
            </button>
          </div>
        </div>

        <div className="detail-card">
          <h2>{t('userDetail.passes')} ({passes.length})</h2>
          {passes.length === 0 ? (
            <div className="empty-state">{t('userDetail.noPasses')}</div>
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
                      <span className="label">{t('userDetail.purchased')}:</span>
                      <span>{formatDateTime(pass.purchasedAt)}</span>
                    </div>
                    <div className="pass-item-row">
                      <span className="label">{t('userDetail.validFrom')}:</span>
                      <span>{formatDate(pass.validFrom)}</span>
                    </div>
                    <div className="pass-item-row">
                      <span className="label">{t('userDetail.validUntil')}:</span>
                      <span>{formatDate(pass.validUntil)}</span>
                    </div>
                    {pass.totalEntries !== null && (
                      <div className="pass-item-row">
                        <span className="label">{t('userDetail.entries')}:</span>
                        <span>{pass.remainingEntries} / {pass.totalEntries}</span>
                      </div>
                    )}
                    <div className="pass-item-row">
                      <span className="label">{t('userDetail.serial')}:</span>
                      <span className="code">{pass.walletSerialNumber}</span>
                    </div>
                  </div>
                  {pass.status === 'ACTIVE' && (
                    <button
                      onClick={() => handlePassAction(pass.id, 'revoke')}
                      disabled={actionLoading}
                      className="action-button small warning"
                    >
                      {t('userDetail.revoke')}
                    </button>
                  )}
                  {pass.status === 'REVOKED' && (
                    <button
                      onClick={() => handlePassAction(pass.id, 'restore')}
                      disabled={actionLoading}
                      className="action-button small success"
                    >
                      {t('userDetail.restore')}
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





