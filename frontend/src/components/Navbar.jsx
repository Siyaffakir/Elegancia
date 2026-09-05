import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const [navSearch, setNavSearch] = useState('');
  const { cartCount, openCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/products?search=${encodeURIComponent(navSearch.trim())}`);
    } else {
      navigate('/products');
    }
  }

  const isProducts = location.pathname === '/products';
  const searchParams = new URLSearchParams(location.search);
  const currentCategory = searchParams.get('category') || '';

  return (
    <header className="navbar">
      {/* Top Announcement Bar / Elegancia Ticker */}
      <div className="top-ticker">
        <span>
          <span className="badge-green">{t('nav.freeDelivery')}</span> {t('nav.freeDeliveryOver')}
        </span>
        <span className="hide-mobile">{t('nav.authenticTag')}</span>
        <span>
          {t('nav.codTag')} <strong>{t('nav.wilayasCount')}</strong>
        </span>
        <LanguageSwitcher variant="ticker" />
      </div>

      {/* Elegancia Stripes (Black, Green & White) */}
      <div className="sephora-stripes" />

      {/* Main Navbar */}
      <div className="navbar-main">
        {/* Brand Logo with Elegancia Emblem */}
        <div className="navbar-brand-group">
          <Link to="/" className="navbar-logo">
            <img
              src="/elegancia-logo.png"
              alt="Elegancia"
              className="brand-logo-img"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="logo-text-group">
              <div className="logo-main">
                Ele<span>gancia</span>
              </div>
              <div className="logo-sub">Cosmetics & Care</div>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div className="nav-search-wrap">
          <form onSubmit={handleSearchSubmit} className="nav-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
            />
            {navSearch && (
              <button
                type="button"
                className="nav-search-clear"
                onClick={() => setNavSearch('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* Actions Group with Cart Button */}
        <div className="nav-actions">
          <Link to="/products" className="nav-btn">
            <span>{t('nav.catalog')}</span>
          </Link>

          {/* Cart / Shopping Bag Button */}
          <button
            type="button"
            className="nav-cart-btn"
            onClick={openCart}
            aria-label="View shopping cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="nav-cart-label">{t('nav.bag')}</span>
            {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* Department Category Navigation Bar */}
      <nav className="navbar-departments">
        <div className="dept-list">
          <Link
            to="/products"
            className={`dept-item ${isProducts && !currentCategory ? 'active' : ''}`}
          >
            {t('nav.allProducts')}
          </Link>
          <Link
            to="/products?category=Skincare"
            className={`dept-item ${currentCategory === 'Skincare' ? 'active' : ''}`}
          >
            {t('nav.skincare')}
          </Link>
          <Link
            to="/products?category=Fragrance"
            className={`dept-item ${currentCategory === 'Fragrance' ? 'active' : ''}`}
          >
            {t('nav.fragrance')}
          </Link>
          <Link
            to="/products?category=Haircare"
            className={`dept-item ${currentCategory === 'Haircare' ? 'active' : ''}`}
          >
            {t('nav.haircare')}
          </Link>
          <Link
            to="/products?category=Bath+%26+Body"
            className={`dept-item ${currentCategory === 'Bath & Body' ? 'active' : ''}`}
          >
            {t('nav.bathBody')}
          </Link>
          <Link to="/products?sort=featured" className="dept-item">
            {t('nav.bestSellers')}
          </Link>
          <Link to="/products?sort=new" className="dept-item sale-tag">
            {t('nav.specialOffers')}
          </Link>
        </div>
      </nav>
    </header>
  );
}

