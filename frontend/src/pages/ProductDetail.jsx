import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProduct, getRandomProducts, productImage } from '../api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import OrderForm from '../components/OrderForm';
import ProductCard from '../components/ProductCard';

function formatDZD(price) {
  return `${Number(price).toLocaleString('en-US')} DZD`;
}

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { t, dict } = useLanguage();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getProduct(id)
      .then((p) => {
        setProduct(p);
        return getRandomProducts(4);
      })
      .then(setRelated)
      .catch(() => setError(true))
      .finally(() => {
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }, [id]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>{t('productDetail.loading')}</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h3>{t('productDetail.notFoundTitle')}</h3>
          <p style={{ marginBottom: '20px' }}>{t('productDetail.notFoundSub')}</p>
          <Link to="/products" className="btn btn-black">
            {t('productDetail.backToCatalog')}
          </Link>
        </div>
      </div>
    );
  }

  const img = productImage(product);
  const categoryDisplay = dict?.home?.departments?.categories?.[product.category] || product.category || 'LUXE BEAUTY & CARE';

  function handleAddToCart() {
    addToCart(product, quantity);
  }

  const benefitsList = dict?.productDetail?.accordion?.benefitsList || [
    'Dermatologically tested and suitable for sensitive skin.',
    'Premium natural botanicals & cruelty-free ingredients.',
    'Long-lasting hydration and sensory feel.',
  ];

  return (
    <div className="container section">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/">{t('productDetail.breadcrumbsHome')}</Link>
        <span>/</span>
        <Link to="/products">{t('productDetail.breadcrumbsCatalog')}</Link>
        <span>/</span>
        <Link to={`/products?category=${encodeURIComponent(product.category)}`}>{categoryDisplay}</Link>
        <span>/</span>
        <span style={{ color: '#000000', fontWeight: '700' }}>{product.name}</span>
      </div>

      <div className="product-detail">
        {/* Left: Gallery */}
        <div className="product-detail-gallery">
          <div className="product-detail-img">
            {img ? (
              <img src={img} alt={product.name} />
            ) : (
              <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span>No Image</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Info, Selectors & Checkout */}
        <div className="product-detail-info">
          <span className="product-detail-brand">{categoryDisplay}</span>
          <h1>{product.name}</h1>

          {/* Rating */}
          <div className="product-detail-rating-row">
            <div className="product-rating" style={{ margin: 0 }}>
              <span className="stars">★★★★★</span>
              <span style={{ fontWeight: '700', fontSize: '13px', marginLeft: '4px' }}>4.9</span>
              <span className="rating-count">{t('productDetail.reviewsCount', { count: 184 })}</span>
            </div>
            <span style={{ color: '#d4d4d8' }}>|</span>
            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>{t('productDetail.authenticBadge')}</span>
          </div>

          <div className="product-detail-price">
            {formatDZD(product.price)}{' '}
            <span>{t('productDetail.codNote')}</span>
          </div>

          {/* Stock Availability */}
          <div
            className={`product-detail-stock-badge ${
              product.stock === 0 ? 'out-of-stock' : ''
            }`}
          >
            {product.stock > 0
              ? t('productDetail.inStock', { count: product.stock })
              : t('productDetail.outOfStock')}
          </div>

          <p className="product-detail-desc">{product.description}</p>

          {/* Quantity Selector & Add to Bag Button */}
          <div className="product-detail-actions-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t('productDetail.qtyLabel')}
              </span>
              <div style={{ display: 'inline-flex', border: '1px solid #e5e5e7', borderRadius: '4px', overflow: 'hidden' }}>
                <button
                  type="button"
                  style={{ padding: '8px 14px', background: '#f4f4f5', fontWeight: '700', fontSize: '14px' }}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span style={{ padding: '8px 16px', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                  {quantity}
                </span>
                <button
                  type="button"
                  style={{ padding: '8px 14px', background: '#f4f4f5', fontWeight: '700', fontSize: '14px' }}
                  onClick={() => setQuantity((q) => Math.min(product.stock || 10, q + 1))}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-black"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>{t('productDetail.addToBag')}</span>
            </button>
          </div>

          {/* Embedded Cash on Delivery Checkout Form */}
          <OrderForm product={product} quantity={quantity} />

          {/* Accordion Details */}
          <div className="beauty-accordion">
            {/* 1. Benefits */}
            <div className="accordion-item">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setActiveAccordion(activeAccordion === 'desc' ? '' : 'desc')}
              >
                <span>{t('productDetail.accordion.benefitsTitle')}</span>
                <span>{activeAccordion === 'desc' ? '−' : '+'}</span>
              </button>
              {activeAccordion === 'desc' && (
                <div className="accordion-content">
                  <p>{product.description || t('productDetail.accordion.benefitsDefault')}</p>
                  <ul style={{ marginTop: '8px', listStyle: 'disc', paddingLeft: '20px' }}>
                    {benefitsList.map((benefit, bIdx) => (
                      <li key={bIdx}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 2. How to Use */}
            <div className="accordion-item">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setActiveAccordion(activeAccordion === 'usage' ? '' : 'usage')}
              >
                <span>{t('productDetail.accordion.usageTitle')}</span>
                <span>{activeAccordion === 'usage' ? '−' : '+'}</span>
              </button>
              {activeAccordion === 'usage' && (
                <div className="accordion-content">
                  <p>
                    <strong>{t('productDetail.accordion.usageTip')}</strong> {t('productDetail.accordion.usageText')}
                  </p>
                </div>
              )}
            </div>

            {/* 3. Delivery in Algeria */}
            <div className="accordion-item">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setActiveAccordion(activeAccordion === 'shipping' ? '' : 'shipping')}
              >
                <span>{t('productDetail.accordion.shippingTitle')}</span>
                <span>{activeAccordion === 'shipping' ? '−' : '+'}</span>
              </button>
              {activeAccordion === 'shipping' && (
                <div className="accordion-content">
                  <p>
                    <strong>{t('productDetail.accordion.shippingCodTitle')}</strong> {t('productDetail.accordion.shippingCodText')}
                  </p>
                  <p style={{ marginTop: '6px' }}>
                    {t('productDetail.accordion.shippingAlgiers')}<br />
                    {t('productDetail.accordion.shippingOther')}<br />
                    <strong>{t('productDetail.accordion.shippingFreeOffer')}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* You May Also Love Section */}
      {related.length > 0 && (
        <section className="section" style={{ borderTop: '2px solid #000', paddingTop: '40px' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">
                {t('productDetail.relatedTitle')} <span>{t('productDetail.relatedTitleHighlight')}</span>
              </h2>
              <p className="section-sub">{t('productDetail.relatedSub')}</p>
            </div>
            <Link to="/products" className="view-all-link">
              {t('productDetail.exploreAll')}
            </Link>
          </div>

          <div className="product-grid">
            {related
              .filter((p) => p.id !== product.id)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

