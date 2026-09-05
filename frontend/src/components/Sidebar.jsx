import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({ categories, selected, onToggle, onClearAll, productCounts = {} }) {
  const { t, dict } = useLanguage();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>{t('catalog.categoriesTitle')}</h3>
        {selected.length > 0 && (
          <button type="button" className="clear-btn" onClick={onClearAll}>
            {t('catalog.resetBtn')}
          </button>
        )}
      </div>

      <ul>
        {categories.map((cat) => {
          const count = productCounts[cat];
          const displayCat = dict?.home?.departments?.categories?.[cat] || cat;
          return (
            <li key={cat} className="sidebar-item" onClick={() => onToggle(cat)}>
              <div className="sidebar-checkbox-group">
                <input
                  type="checkbox"
                  checked={selected.includes(cat)}
                  onChange={() => onToggle(cat)}
                  onClick={(e) => e.stopPropagation()}
                />
                <label>{displayCat}</label>
              </div>
              {count !== undefined && <span className="sidebar-count">{count}</span>}
            </li>
          );
        })}
        {categories.length === 0 && (
          <li className="sidebar-item" style={{ color: '#71717a', cursor: 'default' }}>
            {t('catalog.noCategories')}
          </li>
        )}
      </ul>
    </aside>
  );
}

