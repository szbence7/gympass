import React, { useState, useEffect } from 'react';
import { staffAPI, User, PassType } from '../api/client';
import '../styles/CreatePass.css';

export default function CreatePassScreen() {
  const [step, setStep] = useState<'user' | 'pass'>('user');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [selectedPassType, setSelectedPassType] = useState('');
  const [loadingPassTypes, setLoadingPassTypes] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (query?: string) => {
    setLoadingUsers(true);
    try {
      const result = await staffAPI.getUsers(query);
      setUsers(result);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSearch = () => {
    loadUsers(searchQuery);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setTempPassword('');
    setShowNewUserForm(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreatingUser(true);

    try {
      const response = await staffAPI.createUser(newUserName, newUserEmail);
      setSelectedUser(response.user);
      setTempPassword(response.tempPassword);
      setShowNewUserForm(false);
      setNewUserName('');
      setNewUserEmail('');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleNextToPass = async () => {
    if (!selectedUser) return;
    setStep('pass');
    setLoadingPassTypes(true);
    try {
      const types = await staffAPI.getPassTypes();
      setPassTypes(types);
    } catch (err: any) {
      setError(err.message || 'Failed to load pass types');
    } finally {
      setLoadingPassTypes(false);
    }
  };

  const handleAssignPass = async () => {
    if (!selectedUser || !selectedPassType) return;
    setError('');
    setAssigning(true);

    try {
      await staffAPI.assignPass(selectedUser.id, selectedPassType);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to assign pass');
    } finally {
      setAssigning(false);
    }
  };

  const handleReset = () => {
    setStep('user');
    setSelectedUser(null);
    setSearchQuery('');
    setShowNewUserForm(false);
    setNewUserName('');
    setNewUserEmail('');
    setTempPassword('');
    setSelectedPassType('');
    setSuccess(false);
    setError('');
    loadUsers();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (success) {
    return (
      <div className="createpass-container">
        <div className="createpass-header">
          <h1>Create Pass</h1>
          <button onClick={() => window.location.href = '/scanner'} className="nav-button">
            Back to Scanner
          </button>
        </div>

        <div className="success-panel">
          <h2>✓ Pass Created Successfully!</h2>
          <p>The pass has been assigned to {selectedUser?.name} ({selectedUser?.email})</p>
          <div className="button-group">
            <button onClick={handleReset} className="primary-button">
              Create Another Pass
            </button>
            <button onClick={() => window.location.href = '/dashboard'} className="secondary-button">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="createpass-container">
      <div className="createpass-header">
        <h1>Create Pass</h1>
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

      {error && <div className="error-box">{error}</div>}

      {step === 'user' && (
        <div className="step-panel">
          <h2>Step 1: Select or Create User</h2>

          {tempPassword && (
            <div className="temp-password-panel">
              <h3>⚠️ Temporary Password Created</h3>
              <p>User can login with this password:</p>
              <div className="password-display">
                <code>{tempPassword}</code>
                <button onClick={() => copyToClipboard(tempPassword)} className="copy-button">
                  Copy
                </button>
              </div>
              <p className="temp-password-note">
                Save this password now - it won't be shown again!
              </p>
            </div>
          )}

          {selectedUser ? (
            <div className="selected-user-panel">
              <h3>Selected User:</h3>
              <div className="user-info">
                <p><strong>Name:</strong> {selectedUser.name}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
              </div>
              <div className="button-group">
                <button onClick={() => setSelectedUser(null)} className="secondary-button">
                  Change User
                </button>
                <button onClick={handleNextToPass} className="primary-button">
                  Next: Select Pass →
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="search-section">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button onClick={handleSearch} disabled={loadingUsers}>
                    {loadingUsers ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <button
                  onClick={() => setShowNewUserForm(!showNewUserForm)}
                  className="new-user-button"
                >
                  {showNewUserForm ? '− Cancel' : '+ New User'}
                </button>
              </div>

              {showNewUserForm && (
                <div className="new-user-form">
                  <h3>Create New User</h3>
                  <form onSubmit={handleCreateUser}>
                    <div className="form-group">
                      <label>Name:</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        required
                        disabled={creatingUser}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email:</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        required
                        disabled={creatingUser}
                      />
                    </div>
                    <button type="submit" disabled={creatingUser} className="primary-button">
                      {creatingUser ? 'Creating...' : 'Create User'}
                    </button>
                  </form>
                </div>
              )}

              <div className="users-list">
                <h3>Select Existing User:</h3>
                {loadingUsers ? (
                  <p>Loading users...</p>
                ) : users.length === 0 ? (
                  <p>No users found. Try searching or create a new user.</p>
                ) : (
                  <div className="user-items">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="user-item"
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="user-item-name">{user.name}</div>
                        <div className="user-item-email">{user.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {step === 'pass' && (
        <div className="step-panel">
          <h2>Step 2: Select Pass Type</h2>

          <div className="selected-user-summary">
            <p><strong>For user:</strong> {selectedUser?.name} ({selectedUser?.email})</p>
          </div>

          {loadingPassTypes ? (
            <p>Loading pass types...</p>
          ) : (
            <>
              <div className="pass-types-list">
                {passTypes.map((passType) => (
                  <div
                    key={passType.id}
                    className={`pass-type-item ${selectedPassType === passType.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPassType(passType.id)}
                  >
                    <h3>{passType.name}</h3>
                    <p>{passType.description}</p>
                    <div className="pass-type-details">
                      {passType.durationDays && <span>{passType.durationDays} days</span>}
                      {passType.totalEntries ? (
                        <span>{passType.totalEntries} entries</span>
                      ) : (
                        <span>Unlimited</span>
                      )}
                      <span className="price">${passType.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="button-group">
                <button onClick={() => setStep('user')} className="secondary-button">
                  ← Back
                </button>
                <button
                  onClick={handleAssignPass}
                  disabled={!selectedPassType || assigning}
                  className="primary-button"
                >
                  {assigning ? 'Assigning...' : 'Assign Pass'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
