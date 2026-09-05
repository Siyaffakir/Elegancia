import { useState, useEffect, useMemo } from 'react';
import { createOrder, getCommunes, getDeliveryPricing } from '../api';
import wilayas from '../data/wilayas';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(price) {
  return `${Number(price).toLocaleString('en-US')} DZD`;
}

function wilayaCodeFromLabel(label) {
  const match = String(label || '').trim().match(/^(\d{1,2})/);
  return match ? parseInt(match[1], 10) : null;
}

export default function OrderForm({ product, quantity = 1 }) {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState('home');
  const [status, setStatus] = useState({ state: 'idle', message: '', order: null });

  const [pricing, setPricing] = useState({ freeDeliveryThreshold: 10000, pricing: [] });
  const [communes, setCommunes] = useState([]);
  const [communesLoading, setCommunesLoading] = useState(false);

  // Load admin-configured delivery pricing once (used only to preview the fee — the
  // server always recomputes it authoritatively at checkout).
  useEffect(() => {
    getDeliveryPricing()
      .then(setPricing)
      .catch(() => {});
  }, []);

  // Load communes for the selected wilaya; fall back to free-text entry if the dataset
  // doesn't cover that wilaya (a handful of the newer, post-2019 wilayas).
  useEffect(() => {
    const code = wilayaCodeFromLabel(wilaya);
    setCommune('');
    if (!code) {
      setCommunes([]);
      return;
    }
    setCommunesLoading(true);
    getCommunes(code)
      .then((list) => setCommunes(list))
      .catch(() => setCommunes([]))
      .finally(() => setCommunesLoading(false));
  }, [wilaya]);

  // Calculations (preview only — authoritative values are computed server-side on submit)
  const subtotal = (product?.price || 0) * quantity;
  const isFreeDelivery = subtotal >= (pricing.freeDeliveryThreshold || 10000);
  const wilayaCode = wilayaCodeFromLabel(wilaya);
  const wilayaPricing = useMemo(
    () => pricing.pricing?.find((p) => p.wilaya_code === wilayaCode),
    [pricing, wilayaCode]
  );
  const deliveryFee = !wilaya
    ? 0
    : isFreeDelivery
      ? 0
      : ((deliveryType === 'stopdesk' ? wilayaPricing?.stopdesk_fee : wilayaPricing?.home_fee) ?? 700);
  const total = subtotal + deliveryFee;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ state: 'loading', message: '', order: null });

    try {
      const orderPayload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        wilaya,
        commune: commune.trim(),
        address: address.trim(),
        product_id: product.id,
        product_name: `${product.name} (Qty: ${quantity})`,
        delivery_type: deliveryType,
        items: [
          {
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            image: product.image,
            quantity: quantity,
            total: subtotal,
          },
        ],
      };

      const created = await createOrder(orderPayload);

      setStatus({
        state: 'success',
        message: t('orderForm.successMessageTemplate', {
          id: created.id,
          phone: phone.trim(),
          commune: commune ? commune + ', ' : '',
          wilaya,
        }),
        order: created,
      });

      setFullName('');
      setWilaya('');
      setCommune('');
      setPhone('');
      setAddress('');
      setDeliveryType('home');
    } catch (err) {
      const msg = err?.response?.data?.error || t('orderForm.genericError');
      setStatus({ state: 'error', message: msg, order: null });
    }
  }

  return (
    <div className="order-form-box">
      <div className="order-form-header">
        <div>
          <h3>{t('orderForm.title')}</h3>
          <span style={{ fontSize: '11.5px', color: '#71717a' }}>{t('orderForm.subtitle')}</span>
        </div>
        <span className="order-cod-badge">{t('orderForm.codBadge')}</span>
      </div>

      {status.state === 'success' ? (
        <div className="order-success-inline">
          <div className="cart-success-icon">✓</div>
          <h4>{t('orderForm.successTitle')}</h4>
          <p className="order-success-ref">{t('orderForm.reference')} <strong>#{status.order?.id}</strong></p>
          <p style={{ fontSize: '13px', color: '#3c423c', marginBottom: '16px' }}>{status.message}</p>
          <button
            type="button"
            className="btn btn-outline-dark btn-block"
            onClick={() => setStatus({ state: 'idle', message: '', order: null })}
          >
            {t('orderForm.placeAnother')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">{t('orderForm.fullNameLabel')}</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('orderForm.fullNamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">{t('orderForm.phoneLabel')}</label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('orderForm.phonePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="wilaya">{t('orderForm.wilayaLabel')}</label>
            <select
              id="wilaya"
              required
              value={wilaya}
              onChange={(e) => setWilaya(e.target.value)}
            >
              <option value="" disabled>
                {t('orderForm.wilayaSelectDefault')}
              </option>
              {wilayas.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="commune">{t('orderForm.communeLabel')}</label>
            {communes.length > 0 ? (
              <select
                id="commune"
                required
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                disabled={communesLoading}
              >
                <option value="" disabled>
                  {communesLoading ? t('orderForm.communeLoading') : t('orderForm.communeSelectDefault')}
                </option>
                {communes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="commune"
                type="text"
                required
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder={wilaya ? t('orderForm.communeInputPlaceholder') : t('orderForm.communeSelectFirst')}
                disabled={!wilaya}
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="address">{t('orderForm.addressLabel')}</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('orderForm.addressPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label>{t('orderForm.deliveryTypeLabel')}</label>
            <div className="delivery-type-toggle" role="radiogroup" aria-label="Delivery type">
              <label className={`delivery-type-option ${deliveryType === 'home' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="deliveryType"
                  value="home"
                  checked={deliveryType === 'home'}
                  onChange={() => setDeliveryType('home')}
                />
                {t('orderForm.deliveryHome')}
              </label>
              <label className={`delivery-type-option ${deliveryType === 'stopdesk' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="deliveryType"
                  value="stopdesk"
                  checked={deliveryType === 'stopdesk'}
                  onChange={() => setDeliveryType('stopdesk')}
                />
                {t('orderForm.deliveryStopdesk')}
              </label>
            </div>
          </div>

          {/* Live Order Summary Calculation (preview — server computes the authoritative total) */}
          <div className="order-summary-box">
            <div className="order-summary-row">
              <span>{t('orderForm.itemSubtotal', { qty: quantity })}</span>
              <span>{formatDZD(subtotal)}</span>
            </div>
            <div className="order-summary-row">
              <span>
                {t('orderForm.shippingFee')} {isFreeDelivery && <strong style={{ color: '#1e7a46' }}>{t('orderForm.freeOfferBadge')}</strong>}
              </span>
              <span>
                {!wilaya ? t('orderForm.selectWilayaPrompt') : deliveryFee === 0 ? t('orderForm.freeShipping') : formatDZD(deliveryFee)}
              </span>
            </div>
            <div className="order-summary-row total">
              <span>{t('orderForm.totalToPay')}</span>
              <span>{formatDZD(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-green btn-block"
            disabled={status.state === 'loading' || product?.stock === 0}
          >
            {status.state === 'loading' ? t('orderForm.btnSubmitting') : t('orderForm.btnSubmit')}
          </button>

          <div className="order-trust-guarantee">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>{t('orderForm.trustGuarantee')}</span>
          </div>

          {status.message && (
            <p className={`form-msg ${status.state === 'success' ? 'success' : 'error'}`}>
              {status.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

