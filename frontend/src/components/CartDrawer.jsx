import { useState, useEffect, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { productImage, createOrder, getDeliveryPricing, getCommunes } from '../api';
import wilayas from '../data/wilayas';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

function wilayaCodeFromLabel(label) {
  const match = String(label || '').trim().match(/^(\d{1,2})/);
  return match ? parseInt(match[1], 10) : null;
}

function formatDZD(price) {
  return `${Number(price).toLocaleString('en-US')} DZD`;
}

export default function CartDrawer() {
  const { t, dict } = useLanguage();
  const {
    cartItems,
    isCartOpen,
    closeCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartCount,
    cartSubtotal,
    isFreeDelivery,
    freeDeliveryRemaining,
  } = useCart();

  const [checkoutMode, setCheckoutMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState('home');
  const [orderStatus, setOrderStatus] = useState({ state: 'idle', message: '', order: null });

  const [pricing, setPricing] = useState({ pricing: [] });
  const [communes, setCommunes] = useState([]);
  const [communesLoading, setCommunesLoading] = useState(false);

  // Load admin-configured delivery pricing once (used only to preview the fee — the
  // server always recomputes it authoritatively at checkout).
  useEffect(() => {
    getDeliveryPricing()
      .then(setPricing)
      .catch(() => {});
  }, []);

  // Load communes for the selected wilaya; fall back to free-text entry if dataset doesn't cover it
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

  const wilayaCode = wilayaCodeFromLabel(wilaya);
  const wilayaPricing = useMemo(
    () => pricing.pricing?.find((p) => p.wilaya_code === wilayaCode),
    [pricing, wilayaCode]
  );

  if (!isCartOpen) return null;

  const deliveryFee = !wilaya
    ? 0
    : isFreeDelivery
      ? 0
      : ((deliveryType === 'stopdesk' ? wilayaPricing?.stopdesk_fee : wilayaPricing?.home_fee) ?? 700);
  const grandTotal = cartSubtotal + deliveryFee;

  const freeDeliveryProgress = Math.min(100, Math.round((cartSubtotal / 10000) * 100));

  async function handleCheckoutSubmit(e) {
    e.preventDefault();
    if (cartItems.length === 0) return;

    setOrderStatus({ state: 'loading', message: '', order: null });

    try {
      const orderPayload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        wilaya,
        commune: commune.trim(),
        address: address.trim(),
        delivery_type: deliveryType,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          image: item.image,
          quantity: item.quantity,
          total: item.price * item.quantity,
        })),
        delivery_fee: deliveryFee,
        total_price: grandTotal,
      };

      const created = await createOrder(orderPayload);

      setOrderStatus({
        state: 'success',
        message: t('orderForm.successMessageTemplate', {
          id: created.id,
          phone: phone.trim(),
          commune: commune ? commune + ', ' : '',
          wilaya,
        }),
        order: created,
      });

      clearCart();
    } catch (err) {
      const msg = err?.response?.data?.error || t('orderForm.genericError');
      setOrderStatus({ state: 'error', message: msg, order: null });
    }
  }

  function handleResetAfterOrder() {
    setOrderStatus({ state: 'idle', message: '', order: null });
    setCheckoutMode(false);
    setFullName('');
    setPhone('');
    setWilaya('');
    setCommune('');
    setAddress('');
    setDeliveryType('home');
    closeCart();
  }

  return (
    <div className="cart-drawer-overlay" onClick={closeCart}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <h3>{t('cart.title')}</h3>
            <span className="cart-header-count">{cartCount}</span>
          </div>
          <button type="button" className="cart-close-btn" onClick={closeCart} aria-label={t('cart.closeAria')}>
            ✕
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className="cart-shipping-meter">
          <div className="cart-shipping-text">
            {isFreeDelivery ? (
              <span className="free-shipping-achieved">{t('cart.freeShippingUnlocked')}</span>
            ) : (
              <span>
                {t('cart.addMoreForFree', { amount: formatDZD(freeDeliveryRemaining) })}
              </span>
            )}
          </div>
          <div className="cart-shipping-bar-track">
            <div
              className="cart-shipping-bar-fill"
              style={{ width: `${freeDeliveryProgress}%` }}
            />
          </div>
        </div>

        {/* Order Success State */}
        {orderStatus.state === 'success' ? (
          <div className="cart-success-view">
            <div className="cart-success-icon">✓</div>
            <h3>{t('cart.orderConfirmedTitle')}</h3>
            <p className="cart-success-sub">{t('orderForm.subtitle')}</p>
            <div className="cart-success-box">
              <div className="success-row">
                <span>{t('cart.orderReference')}</span>
                <strong>#{orderStatus.order?.id}</strong>
              </div>
              <div className="success-row">
                <span>{t('cart.customerName')}</span>
                <strong>{orderStatus.order?.full_name}</strong>
              </div>
              <div className="success-row">
                <span>{t('cart.phone')}</span>
                <strong>{orderStatus.order?.phone}</strong>
              </div>
              <div className="success-row">
                <span>{t('cart.destination')}</span>
                <strong>
                  {orderStatus.order?.commune ? `${orderStatus.order?.commune}, ` : ''}
                  {orderStatus.order?.wilaya}
                </strong>
              </div>
              <div className="success-row total">
                <span>{t('cart.amountToPay')}</span>
                <strong style={{ color: '#1e7a46' }}>{formatDZD(orderStatus.order?.total_price)}</strong>
              </div>
            </div>
            <p className="cart-success-note">
              {t('cart.confirmNotice')}
            </p>
            <button
              type="button"
              className="btn btn-green btn-block"
              onClick={handleResetAfterOrder}
            >
              {t('cart.continueShopping')}
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="cart-empty-view">
            <div className="cart-empty-icon">🛍️</div>
            <h4>{t('cart.emptyTitle')}</h4>
            <p>{t('cart.emptySub')}</p>
            <button
              type="button"
              className="btn btn-black"
              onClick={() => {
                closeCart();
              }}
            >
              <Link to="/products" style={{ color: '#fff' }}>
                {t('cart.exploreBtn')}
              </Link>
            </button>
          </div>
        ) : (
          /* Cart Items & Checkout View */
          <div className="cart-drawer-body">
            {!checkoutMode ? (
              <>
                <div className="cart-items-list">
                  {cartItems.map((item) => {
                    const img = productImage(item);
                    const catName = dict?.home?.departments?.categories?.[item.category] || item.category || 'Beauty';
                    return (
                      <div key={item.id} className="cart-item-row">
                        <div className="cart-item-img">
                          <img src={img} alt={item.name} />
                        </div>
                        <div className="cart-item-info">
                          <span className="cart-item-cat">{catName}</span>
                          <h4 className="cart-item-title">{item.name}</h4>
                          <div className="cart-item-price">{formatDZD(item.price)}</div>

                          <div className="cart-item-actions">
                            <div className="cart-qty-ctrl">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              className="cart-remove-btn"
                              onClick={() => removeFromCart(item.id)}
                            >
                              {t('cart.removeBtn')}
                            </button>
                          </div>
                        </div>
                        <div className="cart-item-total">
                          {formatDZD(item.price * item.quantity)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="cart-drawer-footer">
                  <div className="cart-summary-line">
                    <span>
                      {t('cart.subtotalLabel', {
                        count: cartCount,
                        itemWord: cartCount === 1 ? t('cart.itemSingle') : t('cart.itemPlural'),
                      })}
                    </span>
                    <span className="summary-val">{formatDZD(cartSubtotal)}</span>
                  </div>
                  <div className="cart-summary-line">
                    <span>{t('cart.deliveryLabel')}</span>
                    <span className="summary-val" style={{ color: isFreeDelivery ? '#1e7a46' : '#71717a' }}>
                      {isFreeDelivery ? t('cart.freeSpecialOffer') : t('cart.calculatedAtCheckout')}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-green btn-block"
                    onClick={() => setCheckoutMode(true)}
                  >
                    {t('cart.proceedToCheckout')}
                  </button>

                  <div className="cart-trust-points">
                    <span>{t('cart.trustCod')}</span>
                    <span>{t('cart.trustWilayas')}</span>
                    <span>{t('cart.trustAuthentic')}</span>
                  </div>
                </div>
              </>
            ) : (
              /* Express Checkout Form inside Drawer */
              <div className="cart-checkout-section">
                <button
                  type="button"
                  className="cart-back-btn"
                  onClick={() => setCheckoutMode(false)}
                >
                  {t('cart.backToBag', { count: cartCount })}
                </button>

                <div className="cart-checkout-header">
                  <h4>{t('cart.expressCheckoutHeader')}</h4>
                  <span className="cod-badge">{t('cart.codBadge')}</span>
                </div>

                <form onSubmit={handleCheckoutSubmit} className="cart-checkout-form">
                  <div className="form-group">
                    <label htmlFor="cart-fullName">{t('orderForm.fullNameLabel')}</label>
                    <input
                      id="cart-fullName"
                      type="text"
                      required
                      placeholder={t('orderForm.fullNamePlaceholder')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cart-phone">{t('orderForm.phoneLabel')}</label>
                    <input
                      id="cart-phone"
                      type="tel"
                      required
                      placeholder={t('orderForm.phonePlaceholder')}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cart-wilaya">{t('orderForm.wilayaLabel')}</label>
                    <select
                      id="cart-wilaya"
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
                    <label htmlFor="cart-commune">{t('orderForm.communeLabel')}</label>
                    {communes.length > 0 ? (
                      <select
                        id="cart-commune"
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
                        id="cart-commune"
                        type="text"
                        required
                        placeholder={wilaya ? t('orderForm.communeInputPlaceholder') : t('orderForm.communeSelectFirst')}
                        value={commune}
                        onChange={(e) => setCommune(e.target.value)}
                        disabled={!wilaya}
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="cart-address">{t('orderForm.addressLabel')}</label>
                    <input
                      id="cart-address"
                      type="text"
                      placeholder={t('orderForm.addressPlaceholder')}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>{t('orderForm.deliveryTypeLabel')}</label>
                    <div className="delivery-type-toggle" role="radiogroup" aria-label="Delivery type">
                      <label className={`delivery-type-option ${deliveryType === 'home' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="cart-deliveryType"
                          value="home"
                          checked={deliveryType === 'home'}
                          onChange={() => setDeliveryType('home')}
                        />
                        {t('orderForm.deliveryHome')}
                      </label>
                      <label className={`delivery-type-option ${deliveryType === 'stopdesk' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="cart-deliveryType"
                          value="stopdesk"
                          checked={deliveryType === 'stopdesk'}
                          onChange={() => setDeliveryType('stopdesk')}
                        />
                        {t('orderForm.deliveryStopdesk')}
                      </label>
                    </div>
                  </div>

                  {/* Order Financial Summary */}
                  <div className="cart-checkout-summary">
                    <div className="summary-row">
                      <span>{t('cart.orderSummarySubtotal', { count: cartCount })}</span>
                      <span>{formatDZD(cartSubtotal)}</span>
                    </div>
                    <div className="summary-row">
                      <span>
                        {t('cart.orderSummaryShipping')}{' '}
                        {isFreeDelivery && <strong style={{ color: '#1e7a46' }}>{t('orderForm.freeOfferBadge')}</strong>}
                      </span>
                      <span>
                        {!wilaya ? t('orderForm.selectWilayaPrompt') : deliveryFee === 0 ? t('orderForm.freeShipping') : formatDZD(deliveryFee)}
                      </span>
                    </div>
                    <div className="summary-row total">
                      <span>{t('cart.orderSummaryTotal')}</span>
                      <span className="total-highlight">{formatDZD(grandTotal)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-green btn-block"
                    disabled={orderStatus.state === 'loading'}
                  >
                    {orderStatus.state === 'loading' ? t('orderForm.btnSubmitting') : t('cart.confirmOrderBtn')}
                  </button>

                  {orderStatus.message && (
                    <p className={`form-msg ${orderStatus.state === 'success' ? 'success' : 'error'}`}>
                      {orderStatus.message}
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

