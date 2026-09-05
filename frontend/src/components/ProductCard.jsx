import { Link } from 'react-router-dom';
import { productImage } from '../api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(price) {
  return `${Number(price).toLocaleString('en-US')} DZD`;
}

// Realistic luxury beauty rating based on product ID
function getProductRating(id) {
  const ratings = [4.8, 4.9, 4.7, 5.0, 4.8, 4.9];
  const reviews = [142, 89, 210, 64, 312, 178];
  const idx = (id || 1) % ratings.length;
  return { score: ratings[idx], count: reviews[idx] };
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { t, dict } = useLanguage();
  const img = productImage(product);
  const rating = getProductRating(product.id);

  // Dynamic badge
  let badgeText = null;
  let badgeClass = '';
  if (product.price >= 6000) {
    badgeText = t('productCard.badges.luxe');
    badgeClass = 'hot';
  } else if (product.stock > 0 && product.stock <= 15) {
    badgeText = t('productCard.badges.limited');
    badgeClass = '';
  } else {
    badgeText = t('productCard.badges.bestseller');
    badgeClass = 'exclusive';
  }

  const categoryName = dict?.home?.departments?.categories?.[product.category] || product.category || 'Luxury Care';

  function handleQuickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
  }

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-card-link">
        <div className="product-card-img-wrap">
          {badgeText && <span className={`product-badge-pill ${badgeClass}`}>{badgeText}</span>}

          {img ? (
            <img src={img} alt={product.name} loading="lazy" />
          ) : (
            <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>No Image</span>
            </div>
          )}

          <div className="product-card-actions">
            <button
              type="button"
              className="quick-order-btn"
              onClick={handleQuickAdd}
            >
              {t('productCard.quickAdd')}
            </button>
          </div>
        </div>

        <div className="product-card-body">
          <span className="product-card-brand">{categoryName}</span>
          <h3 className="product-card-title">{product.name}</h3>

          {/* Rating Stars */}
          <div className="product-rating">
            <span className="stars">★★★★★</span>
            <span className="rating-count">({rating.count})</span>
          </div>

          <div className="product-card-price-row">
            <div className="product-price">{formatDZD(product.price)}</div>
            <button
              type="button"
              className="card-mini-add-btn"
              onClick={handleQuickAdd}
              title={t('productCard.addTitle')}
            >
              +
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}

