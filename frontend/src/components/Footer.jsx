import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Footer() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function handleNewsletterSubmit(e) {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  }

  return (
    <footer className="footer">
      {/* Signature B&W with Green Stripe Accent */}
      <div className="sephora-stripes-thick" />

      {/* Elegancia VIP Club Newsletter Banner */}
      <div className="footer-newsletter-wrap">
        <div className="container">
          <div className="footer-newsletter">
            <div className="newsletter-text">
              <h3>{t('footer.vipTitle')}</h3>
              <p>{t('footer.vipDesc')}</p>
            </div>
            {subscribed ? (
              <div style={{ color: '#86efac', fontWeight: '700', fontSize: '13.5px' }}>
                {t('footer.vipSuccess')}
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
                <input
                  type="email"
                  required
                  placeholder={t('footer.vipPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="btn btn-green">
                  {t('footer.vipBtn')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container footer-main">
        <div className="footer-grid">
          {/* Col 1: Brand */}
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <img
                src="/elegancia-logo.png"
                alt="Elegancia"
                style={{ height: '36px', width: 'auto', background: '#fff', borderRadius: '4px', padding: '2px' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="logo-main" style={{ color: '#fff', fontSize: '22px' }}>
                Ele<span style={{ color: '#1e7a46' }}>gancia</span>
              </div>
            </div>
            <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>
              {t('footer.brandDesc')}
            </p>
            <div style={{ fontSize: '12px', color: '#86efac' }}>
              {t('footer.codAssurance')}
            </div>
          </div>

          {/* Col 2: Departments */}
          <div className="footer-col">
            <h4>{t('footer.colDepartments')}</h4>
            <ul>
              <li><Link to="/products?category=Skincare">{t('nav.skincare')}</Link></li>
              <li><Link to="/products?category=Fragrance">{t('nav.fragrance')}</Link></li>
              <li><Link to="/products?category=Haircare">{t('nav.haircare')}</Link></li>
              <li><Link to="/products?category=Bath+%26+Body">{t('nav.bathBody')}</Link></li>
              <li><Link to="/products?sort=featured">{t('nav.bestSellers')}</Link></li>
            </ul>
          </div>

          {/* Col 3: Customer Care */}
          <div className="footer-col">
            <h4>{t('footer.colCustomerCare')}</h4>
            <ul>
              <li><Link to="/products">{t('footer.trackOrder')}</Link></li>
              <li><Link to="/products">{t('footer.deliveryInfo')}</Link></li>
              <li><Link to="/products">{t('footer.codFaq')}</Link></li>
              <li><Link to="/products">{t('footer.authenticity')}</Link></li>
            </ul>
          </div>

          {/* Col 4: Delivery Assurance */}
          <div className="footer-col">
            <h4>{t('footer.colDelivery')}</h4>
            <p style={{ color: '#a1a1aa', fontSize: '13px', lineHeight: '1.6', marginBottom: '12px' }}>
              {t('footer.deliveryDesc')}
            </p>
            <span style={{ fontSize: '12px', color: '#86efac', fontWeight: '700' }}>
              {t('footer.freeOverThreshold')}
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
            <p style={{ color: '#a1a1aa' }}>{t('footer.currencyNotice')}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{t('language.switchLanguage')}:</span>
            <LanguageSwitcher variant="ticker" />
          </div>
        </div>
      </div>
    </footer>
  );
}

