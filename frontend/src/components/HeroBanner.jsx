import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productImage } from '../api';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(price) {
  return `${Number(price).toLocaleString('en-US')} DZD`;
}

export default function HeroBanner({ products }) {
  const [active, setActive] = useState(0);
  const { t, dict } = useLanguage();
  const navigate = useNavigate();

  const campaignTags = dict?.hero?.tags || [
    '✦ ELEGANCIA EXCLUSIVE',
    '✦ BOTANICAL BEAUTY ICON',
    '✦ BESTSELLER PICK',
    '✦ NEW SEASON LAUNCH',
  ];

  useEffect(() => {
    if (!products || products.length < 2) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % products.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [products]);

  if (!products || products.length === 0) return null;

  return (
    <div className="hero">
      {products.map((p, i) => {
        const img = productImage(p);
        const tag = campaignTags[i % campaignTags.length];
        return (
          <div
            key={p.id}
            className={`hero-slide ${i === active ? 'active' : ''}`}
            style={{
              backgroundImage: `url(${img})`,
              backgroundColor: '#0a0a0a',
            }}
          >
            <div className="hero-content">
              <div className="hero-badge">{tag}</div>
              <h1>{p.name}</h1>
              <p>{p.description || t('hero.defaultDesc')}</p>
              <div className="hero-price-row">
                <div className="hero-price">
                  {formatDZD(p.price)}
                </div>
                <span style={{ fontSize: '12px', color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('hero.inStockCOD')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-green" onClick={() => navigate(`/product/${p.id}`)}>
                  {t('hero.shopNow')}
                </button>
                <button className="btn btn-outline" onClick={() => navigate('/products')}>
                  {t('hero.explore')}
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="hero-dots">
        {products.map((p, i) => (
          <button
            key={p.id}
            className={`hero-dot ${i === active ? 'active' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`${t('hero.slideAria')} ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

