import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../components/LanguageSelector';
import '../styles/Landing.css';

export default function LandingScreen() {
  const { t } = useTranslation();
  const [gymName, setGymName] = useState('');

  useEffect(() => {
    // Extract gym name from hostname
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 0) {
      const slug = parts[0];
      setGymName(slug.charAt(0).toUpperCase() + slug.slice(1));
    }
  }, []);

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <LanguageSelector />
        </div>
        
        <h1>🏋️ {t('landing.title', { gymName: gymName || 'Gym' })}</h1>
        <p className="tagline">{t('landing.tagline')}</p>
        
        <div className="cta-section">
          <button className="download-btn" onClick={() => alert('TODO: Link to mobile app download')}>
            📱 {t('landing.downloadApp')}
          </button>
          <p className="download-note">{t('landing.availableOn')}</p>
        </div>

        <div className="features">
          <div className="feature">
            <span className="icon">🎫</span>
            <h3>{t('landing.flexiblePasses')}</h3>
            <p>{t('landing.flexiblePassesDesc')}</p>
          </div>
          <div className="feature">
            <span className="icon">📲</span>
            <h3>{t('landing.digitalWallet')}</h3>
            <p>{t('landing.digitalWalletDesc')}</p>
          </div>
          <div className="feature">
            <span className="icon">⚡</span>
            <h3>{t('landing.quickCheckin')}</h3>
            <p>{t('landing.quickCheckinDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

