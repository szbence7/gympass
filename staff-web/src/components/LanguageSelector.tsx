import { useTranslation } from 'react-i18next';
import Cookies from 'js-cookie';
import '../styles/LanguageSelector.css';

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    Cookies.set('lang', lng, { expires: 365, path: '/' });
  };

  return (
    <div className="language-selector">
      <label>{t('common.language')}:</label>
      <select 
        value={i18n.language} 
        onChange={(e) => changeLanguage(e.target.value)}
        className="lang-dropdown"
      >
        <option value="hu">Magyar (HU)</option>
        <option value="en">English (EN)</option>
      </select>
    </div>
  );
}




