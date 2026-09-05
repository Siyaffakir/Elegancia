import { useLanguage } from '../context/LanguageContext';

export default function SearchBar({ value, onChange }) {
  const { t } = useLanguage();

  return (
    <div className="search-bar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder={t('catalog.searchPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          style={{ fontSize: '14px', color: '#71717a', padding: '2px 6px' }}
          aria-label="Clear filter"
        >
          ✕
        </button>
      )}
    </div>
  );
}

