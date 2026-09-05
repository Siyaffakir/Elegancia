import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HeroBanner from '../components/HeroBanner';
import ProductCard from '../components/ProductCard';
import { getRandomProducts, getProducts, getCategories } from '../api';
import { useLanguage } from '../context/LanguageContext';

const BEAUTY_CATEGORIES = [
  { key: 'Skincare', img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80', query: 'Skincare' },
  { key: 'Fragrance', img: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=400&q=80', query: 'Fragrance' },
  { key: 'Haircare', img: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=400&q=80', query: 'Haircare' },
  { key: 'Bath & Body', img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80', query: 'Bath & Body' },
  { key: 'Body Care & Oils', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80', query: 'Bath & Body' },
];

export default function Home() {
  const { t, dict } = useLanguage();
  const [heroProducts, setHeroProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getRandomProducts(4), getProducts(), getCategories()])
      .then(([hero, prods, cats]) => {
        setHeroProducts(hero);
        setAllProducts(prods);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filtered products for the "Insider Picks" tabbed section
  const tabFilteredProducts = useMemo(() => {
    if (selectedCategoryTab === 'ALL') return allProducts.slice(0, 8);
    return allProducts
      .filter((p) => (p.category || '').toLowerCase() === selectedCategoryTab.toLowerCase())
      .slice(0, 8);
  }, [allProducts, selectedCategoryTab]);

  const reviewsList = dict?.home?.reviews?.list || [];

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>{t('home.loadingText')}</span>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Campaign Hero Banner */}
      <HeroBanner products={heroProducts.length > 0 ? heroProducts : allProducts.slice(0, 3)} />

      {/* 2. Perks Bar */}
      <section className="beauty-perks">
        <div className="container">
          <div className="perks-grid">
            <div className="perk-item">
              <div className="perk-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="perk-text">
                <h4>{t('home.perks.authenticTitle')}</h4>
                <p>{t('home.perks.authenticSub')}</p>
              </div>
            </div>

            <div className="perk-item">
              <div className="perk-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="perk-text">
                <h4>{t('home.perks.deliveryTitle')}</h4>
                <p>{t('home.perks.deliverySub')}</p>
              </div>
            </div>

            <div className="perk-item">
              <div className="perk-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div className="perk-text">
                <h4>{t('home.perks.codTitle')}</h4>
                <p>{t('home.perks.codSub')}</p>
              </div>
            </div>

            <div className="perk-item">
              <div className="perk-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div className="perk-text">
                <h4>{t('home.perks.advisorTitle')}</h4>
                <p>{t('home.perks.advisorSub')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {/* 3. Shop By Category */}
        <section className="section" style={{ paddingBottom: '20px' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {t('home.departments.title')} <span>{t('home.departments.titleHighlight')}</span>
              </h2>
              <p className="section-sub">{t('home.departments.sub')}</p>
            </div>
            <Link to="/products" className="view-all-link">
              {t('home.departments.viewAll')}
            </Link>
          </div>

          <div className="category-bubbles">
            {BEAUTY_CATEGORIES.map((cat, idx) => {
              const translatedCatName = dict?.home?.departments?.categories?.[cat.key] || cat.key;
              return (
                <div
                  key={idx}
                  className="bubble-card"
                  onClick={() => navigate(`/products?category=${encodeURIComponent(cat.query)}`)}
                >
                  <div className="bubble-img-wrap">
                    <img
                      src={cat.img}
                      alt={translatedCatName}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </div>
                  <span className="bubble-label">{translatedCatName}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Insider Picks (Tabbed Grid) */}
        <section className="section" style={{ paddingTop: '10px' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {t('home.favorites.title')} <span>{t('home.favorites.titleHighlight')}</span>
              </h2>
              <p className="section-sub">{t('home.favorites.sub')}</p>
            </div>
            <Link to="/products" className="view-all-link">
              {t('home.favorites.shopCatalog')}
            </Link>
          </div>

          {/* Filter Pills */}
          <div className="filter-tabs">
            <button
              className={`filter-tab ${selectedCategoryTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategoryTab('ALL')}
            >
              {t('home.favorites.all')}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                className={`filter-tab ${selectedCategoryTab === c ? 'active' : ''}`}
                onClick={() => setSelectedCategoryTab(c)}
              >
                {dict?.home?.departments?.categories?.[c] || c}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {tabFilteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {tabFilteredProducts.length === 0 && (
            <div className="empty-state">
              <h3>{t('home.favorites.emptyTitle')}</h3>
              <p>{t('home.favorites.emptySub')}</p>
            </div>
          )}
        </section>

        {/* 5. Editorial Promo Spotlight Banner */}
        <section className="promo-spotlight">
          <div className="promo-spotlight-content">
            <span className="tag">{t('home.spotlight.tag')}</span>
            <h3>{t('home.spotlight.title')}</h3>
            <p>{t('home.spotlight.desc')}</p>
            <Link to="/products?category=Skincare" className="btn btn-green">
              {t('home.spotlight.btn')}
            </Link>
          </div>
          <div
            className="promo-spotlight-img"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=80')`,
            }}
          />
        </section>

        {/* 6. Customer Testimonials */}
        <section className="section" style={{ paddingTop: '0' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {t('home.reviews.title')} <span>{t('home.reviews.titleHighlight')}</span>
              </h2>
              <p className="section-sub">{t('home.reviews.sub')}</p>
            </div>
          </div>

          <div className="reviews-grid">
            {reviewsList.map((r, i) => (
              <div key={i} className="review-card">
                <div className="review-stars">{r.stars}</div>
                <p className="review-quote">"{r.quote}"</p>
                <div className="review-author">
                  <span>{r.name} ({r.wilaya})</span>
                  <span className="verified-badge">{t('home.reviews.verified')}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

