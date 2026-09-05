import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher({ variant = 'default' }) {
  const { lang, setLanguage } = useLanguage();

  return (
    <div className={`lang-switcher lang-switcher-${variant}`} role="group" aria-label="Language selection">
      <button
        type="button"
        className={`lang-btn ${lang === 'fr' ? 'active' : ''}`}
        onClick={() => setLanguage('fr')}
        aria-pressed={lang === 'fr'}
      >
        <span className="lang-flag">FR</span>
      </button>
      <span className="lang-sep">|</span>
      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
        aria-pressed={lang === 'en'}
      >
        <span className="lang-flag">EN</span>
      </button>
    </div>
  );
}
