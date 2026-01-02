import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { staffAPI } from '../api/client';
import LanguageSelector from '../components/LanguageSelector';
import '../styles/Login.css';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const response = await staffAPI.login(email, password);
      localStorage.setItem('staff_token', response.token);
      localStorage.setItem('staff_user', JSON.stringify(response.user));
      // Reset failed attempts on successful login
      setFailedAttempts(0);
      onLogin();
    } catch (err: any) {
      console.error('Login error:', err.message, 'Status:', err.response?.status, 'Data:', err.response?.data);
      
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setError(t('auth.tooManyAttempts'));
        // Redirect to landing page after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        const remainingAttempts = 3 - newAttempts;
        setError(t('auth.wrongCredentials', { remaining: remainingAttempts }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <LanguageSelector />
        </div>
        
        <h1 className="login-title">GymPass Staff</h1>
        <p className="login-subtitle">{t('auth.signIn')}</p>

        {error && <div className="error-message">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="staff@gym.local"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder={t('auth.password')}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <div className="login-hint">
          <p>Default credentials:</p>
          <p>Email: staff@gym.local</p>
          <p>Password: staff1234</p>
        </div>
      </div>
    </div>
  );
}
