import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import { getProducts, getCategories } from '../api';
import { useLanguage } from '../context/LanguageContext';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category');
  const { t, dict } = useLanguage();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCats, setSelectedCats] = useState(
    initialCategory ? [initialCategory] : []
  );
  const [sortBy, setSortBy] = useState('featured');
  const [loading, setLoading] = useState(true);

  // Sync state if URL changes (e.g. user clicked a navbar department link)
  useEffect(() => {
    const catFromUrl = searchParams.get('category');
    const searchFromUrl = searchParams.get('search') || '';
    if (catFromUrl) {
      setSelectedCats([catFromUrl]);
    }
    if (searchFromUrl !== search) {
      setSearch(searchFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Fetch products based on search & category
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (selectedCats.length) params.category = selectedCats;

    const timer = setTimeout(() => {
      getProducts(params)
        .then(setProducts)
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [search, selectedCats]);

  function toggleCategory(cat) {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function clearAllFilters() {
    setSelectedCats([]);
    setSearch('');
    setSearchParams({});
  }

  // Client-side sorting for instant responsiveness
  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === 'price_asc') {
      return list.sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_desc') {
      return list.sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'name_asc') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list; // default / featured
  }, [products, sortBy]);

  // Compute category product counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  return (
    <div className="container section">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/">{t('catalog.breadcrumbsHome')}</Link>
        <span>/</span>
        <span style={{ color: '#000000', fontWeight: '700' }}>{t('catalog.breadcrumbsCatalog')}</span>
      </div>

      <div className="catalog-header">
        <h1 className="section-title" style={{ fontSize: '30px', marginBottom: '6px' }}>
          {t('catalog.title')} <span>{t('catalog.titleHighlight')}</span>
        </h1>
        <p className="section-sub">
          {t('catalog.sub')}
        </p>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      {/* Toolbar: Count, Active Filter Chips & Sorting */}
      <div className="catalog-toolbar">
        <div className="catalog-count">
          {loading
            ? t('catalog.loading')
            : t('catalog.showingCount', { count: sortedProducts.length })}
        </div>

        {/* Active Filter Chips */}
        {(selectedCats.length > 0 || search.trim()) && (
          <div className="active-filters" style={{ margin: 0 }}>
            {selectedCats.map((cat) => {
              const displayCat = dict?.home?.departments?.categories?.[cat] || cat;
              return (
                <span key={cat} className="filter-chip">
                  {displayCat}
                  <button type="button" onClick={() => toggleCategory(cat)}>
                    ✕
                  </button>
                </span>
              );
            })}
            {search.trim() && (
              <span className="filter-chip">
                "{search}"
                <button type="button" onClick={() => setSearch('')}>
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              className="clear-btn"
              onClick={clearAllFilters}
              style={{ marginLeft: '6px' }}
            >
              {t('catalog.clearAll')}
            </button>
          </div>
        )}

        <div className="catalog-sort">
          <label htmlFor="sortSelect">{t('catalog.sortBy')}</label>
          <select
            id="sortSelect"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="featured">{t('catalog.sortFeatured')}</option>
            <option value="price_asc">{t('catalog.sortPriceAsc')}</option>
            <option value="price_desc">{t('catalog.sortPriceDesc')}</option>
            <option value="name_asc">{t('catalog.sortNameAsc')}</option>
          </select>
        </div>
      </div>

      <div className="products-layout">
        <Sidebar
          categories={categories}
          selected={selectedCats}
          onToggle={toggleCategory}
          onClearAll={clearAllFilters}
          productCounts={categoryCounts}
        />

        <div>
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <span>{t('catalog.loading')}</span>
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="empty-state">
              <h3>{t('catalog.emptyTitle')}</h3>
              <p style={{ marginBottom: '20px' }}>{t('catalog.emptySub')}</p>
              <button type="button" className="btn btn-black" onClick={clearAllFilters}>
                {t('catalog.viewAllBtn')}
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {sortedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

