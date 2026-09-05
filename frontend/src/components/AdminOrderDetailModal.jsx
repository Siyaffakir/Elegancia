import { useState } from 'react';
import { productImage } from '../api';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(price) {
  return `${Number(price || 0).toLocaleString('en-US')} DZD`;
}

function formatDate(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });
}

const STATUS_OPTIONS = [
  { value: 'Pending', color: '#d97706', bg: '#fef3c7' },
  { value: 'Confirmed', color: '#0284c7', bg: '#e0f2fe' },
  { value: 'Shipped', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'Delivered', color: '#15803d', bg: '#dcfce7' },
  { value: 'Canceled', color: '#dc2626', bg: '#fee2e2' },
  { value: 'Returned', color: '#ea580c', bg: '#ffedd5' },
];

export default function AdminOrderDetailModal({ order, onClose, onUpdateStatus, onDelete, customerStats, agencies, onUpdateLogistics }) {
  const { t, dict, lang } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [agencyDraft, setAgencyDraft] = useState(order?.delivery_agency_id ?? '');
  const [tagDraft, setTagDraft] = useState(order?.tracking_tag ?? '');
  const [logisticsStatus, setLogisticsStatus] = useState({ state: 'idle', message: '' });

  if (!order) return null;

  const logisticsDirty = agencyDraft !== (order.delivery_agency_id ?? '') || tagDraft !== (order.tracking_tag ?? '');

  async function handleSaveLogistics() {
    setLogisticsStatus({ state: 'loading', message: '' });
    try {
      await onUpdateLogistics(order.id, agencyDraft || null, tagDraft);
      setLogisticsStatus({ state: 'success', message: lang === 'fr' ? 'Enregistré.' : 'Saved.' });
    } catch (err) {
      setLogisticsStatus({ state: 'error', message: err?.response?.data?.error || (lang === 'fr' ? 'Échec.' : 'Failed to save.') });
    }
  }

  const currentStatusObj = STATUS_OPTIONS.find((s) => s.value === order.status) || STATUS_OPTIONS[0];

  async function handleStatusSelect(newStatus) {
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, newStatus);
    } finally {
      setUpdating(false);
    }
  }

  // Calculate total items quantity
  const items = order.items && order.items.length > 0 ? order.items : [];
  const totalUnits = items.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 1), 0);
  const itemsSubtotal = items.reduce((acc, it) => acc + (parseFloat(it.price || 0) * (parseInt(it.quantity, 10) || 1)), 0);

  // Format phone for WhatsApp link (Algeria country code +213 without leading 0)
  const rawPhone = String(order.phone || '').replace(/\D/g, '');
  const waNumber = rawPhone.startsWith('0') ? `213${rawPhone.slice(1)}` : rawPhone;
  const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    `Bonjour ${order.full_name}, nous vous contactons concernant votre commande #${order.id} sur Elegancia.`
  )}`;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-order-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2>{lang === 'fr' ? 'Commande' : 'Order'} #{order.id}</h2>
              <span
                className="status-pill-badge"
                style={{ backgroundColor: currentStatusObj.bg, color: currentStatusObj.color }}
              >
                ● {dict?.admin?.status?.[order.status] || order.status}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#71717a', marginTop: '3px' }}>
              {lang === 'fr' ? 'Passée le' : 'Placed on'} {formatDate(order.created_at)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-outline-dark" onClick={handlePrint} title={lang === 'fr' ? 'Imprimer le bon' : 'Print packing slip'}>
              🖨️ {lang === 'fr' ? 'Imprimer le Bon' : 'Print Slip'}
            </button>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Status Quick Updater */}
          <div className="admin-status-control-bar">
            <div className="status-label">
              <strong>{lang === 'fr' ? 'Statut de la Commande :' : 'Order Status:'}</strong>
              <span>{lang === 'fr' ? 'Sélectionnez une décision pour cette commande :' : 'Select decision for this customer order:'}</span>
            </div>
            <div className="status-buttons-row">
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  disabled={updating}
                  className={`status-btn-choice ${order.status === st.value ? 'selected' : ''}`}
                  style={{
                    borderColor: order.status === st.value ? st.color : '#e4e6e4',
                    backgroundColor: order.status === st.value ? st.bg : '#fff',
                    color: order.status === st.value ? st.color : '#3c423c',
                    fontWeight: order.status === st.value ? '800' : '600',
                  }}
                  onClick={() => handleStatusSelect(st.value)}
                >
                  {order.status === st.value && '✓ '}
                  {dict?.admin?.status?.[st.value] || st.value}
                </button>
              ))}
            </div>
          </div>

          <div className="order-details-grid">
            {/* Left: Customer & Shipping Information */}
            <div className="order-info-card">
              <h3 className="card-subhead">✦ {lang === 'fr' ? 'Informations Client & Livraison' : 'Customer & Delivery Information'}</h3>

              <div className="info-item-row">
                <span className="info-label">{lang === 'fr' ? 'Nom & Prénom :' : 'Full Name:'}</span>
                <span className="info-val strong">{order.full_name}</span>
              </div>

              {(() => {
                const stats = customerStats?.get(String(order.phone || '').trim());
                if (!stats || stats.returnedCount === 0) return null;
                return (
                  <div className="info-item-row">
                    <span className="info-label">{lang === 'fr' ? 'Historique Retours :' : 'Return History:'}</span>
                    <span className="info-val" style={{ color: '#b91c1c', fontWeight: '700' }}>
                      ⚠ {stats.returnedCount} / {stats.totalOrders} {lang === 'fr' ? 'commande(s) retournée(s)' : 'order(s) returned'}
                    </span>
                  </div>
                );
              })()}

              <div className="info-item-row">
                <span className="info-label">{lang === 'fr' ? 'Téléphone :' : 'Phone Number:'}</span>
                <div className="info-val phone-actions">
                  <a href={`tel:${order.phone}`} className="phone-call-btn">
                    📞 {order.phone}
                  </a>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-btn"
                    title="Chat on WhatsApp"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>

              <div className="info-item-row">
                <span className="info-label">{lang === 'fr' ? 'Wilaya :' : 'Wilaya (Province):'}</span>
                <span className="info-val badge-wilaya">{order.wilaya}</span>
              </div>

              <div className="info-item-row">
                <span className="info-label">{lang === 'fr' ? 'Commune / Ville :' : 'Commune / City:'}</span>
                <span className="info-val strong highlight-commune">
                  {order.commune || (lang === 'fr' ? '— Non spécifié —' : '— Not specified —')}
                </span>
              </div>

              <div className="info-item-row">
                <span className="info-label">{lang === 'fr' ? 'Adresse :' : 'Street / Address:'}</span>
                <span className="info-val">{order.address || '—'}</span>
              </div>

              <div className="info-item-row">
                <span className="info-label">{lang === 'fr' ? 'Type de Livraison :' : 'Delivery Type:'}</span>
                <span className="info-val">
                  <span className="badge success">
                    {order.delivery_type === 'stopdesk'
                      ? (lang === 'fr' ? '🏬 Point Relais (Stop Desk)' : '🏬 Stop Desk Pickup')
                      : (lang === 'fr' ? '🏠 Livraison à Domicile' : '🏠 Home Delivery')}
                  </span>
                </span>
              </div>

              <div className="info-item-row">
                <span className="info-label">{lang === 'fr' ? 'Mode de Paiement :' : 'Payment Method:'}</span>
                <span className="info-val">
                  <span className="badge success">{lang === 'fr' ? 'Paiement à la Livraison (Espèces)' : 'Cash On Delivery (Paiement à la livraison)'}</span>
                </span>
              </div>

              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e4e6e4' }}>
                <div style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a', marginBottom: '8px' }}>
                  {lang === 'fr' ? 'Agence de Livraison & Suivi' : 'Delivery Agency & Tracking'}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={agencyDraft}
                    onChange={(e) => setAgencyDraft(e.target.value)}
                    style={{ flex: '1 1 160px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d4d4d8', fontSize: '13px' }}
                  >
                    <option value="">{lang === 'fr' ? '— Aucune agence assignée —' : '— No agency assigned —'}</option>
                    {(agencies || []).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    placeholder={lang === 'fr' ? 'Code de suivi / Référence' : 'Tracking tag / reference'}
                    style={{ flex: '1 1 160px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d4d4d8', fontSize: '13px' }}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={!logisticsDirty || logisticsStatus.state === 'loading'}
                    onClick={handleSaveLogistics}
                  >
                    {logisticsStatus.state === 'loading' ? (lang === 'fr' ? 'Enregistrement...' : 'Saving...') : (lang === 'fr' ? 'Enregistrer' : 'Save')}
                  </button>
                </div>
                {logisticsStatus.message && (
                  <p className={`form-msg ${logisticsStatus.state === 'success' ? 'success' : 'error'}`} style={{ marginTop: '6px', marginBottom: 0 }}>
                    {logisticsStatus.message}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Financial Breakdown */}
            <div className="order-info-card financial-card">
              <h3 className="card-subhead">✦ {lang === 'fr' ? 'Récapitulatif Financier' : 'Financial Summary'}</h3>

              <div className="fin-row">
                <span>{lang === 'fr' ? 'Articles Commandés :' : 'Total Items Ordered:'}</span>
                <span>{items.length} {items.length === 1 ? (lang === 'fr' ? 'article' : 'item') : (lang === 'fr' ? 'articles' : 'items')} ({totalUnits} {lang === 'fr' ? 'unités' : 'units'})</span>
              </div>

              <div className="fin-row">
                <span>{lang === 'fr' ? 'Sous-total Articles :' : 'Items Subtotal:'}</span>
                <span>{formatDZD(itemsSubtotal || (order.total_price - (order.delivery_fee || 0)))}</span>
              </div>

              <div className="fin-row">
                <span>{lang === 'fr' ? 'Frais de Livraison :' : 'Shipping Fee:'}</span>
                <span>{order.delivery_fee === 0 ? (lang === 'fr' ? 'GRATUIT' : 'FREE') : formatDZD(order.delivery_fee)}</span>
              </div>

              <div className="fin-row grand-total">
                <span>{lang === 'fr' ? 'Total à Encaisser (COD) :' : 'Total to Collect (COD):'}</span>
                <span className="price-amount">{formatDZD(order.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Full Itemized Products List */}
          <div className="order-items-detail-section">
            <h3 className="card-subhead">
              ✦ {lang === 'fr' ? 'Détail des Articles' : 'Ordered Items'} ({items.length > 0 ? items.length : 1} {lang === 'fr' ? 'produits' : 'products'} • {totalUnits > 0 ? totalUnits : 1} {lang === 'fr' ? 'unités au total' : 'total units'})
            </h3>

            <table className="order-items-table">
              <thead>
                <tr>
                  <th style={{ width: '56px' }}>{lang === 'fr' ? 'Photo' : 'Photo'}</th>
                  <th>{lang === 'fr' ? 'Nom du Produit & Rayon' : 'Product Name & Category'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'fr' ? 'Quantité' : 'Quantity'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'fr' ? 'Prix Unitaire' : 'Unit Price'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'fr' ? 'Total Ligne' : 'Line Total'}</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((it, idx) => {
                    const img = productImage(it);
                    const catName = dict?.home?.departments?.categories?.[it.category] || it.category || 'Beauty & Care';
                    return (
                      <tr key={idx}>
                        <td>
                          {img ? (
                            <img
                              src={img}
                              alt={it.name}
                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '4px', border: '1px solid #e4e6e4' }}
                            />
                          ) : (
                            <div style={{ width: 44, height: 44, background: '#f4f4f5', borderRadius: '4px' }} />
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', color: '#0a0a0a' }}>{it.name}</div>
                          <div style={{ fontSize: '11px', color: '#71717a' }}>{catName}</div>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>
                          <span className="qty-badge">x{it.quantity}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          {formatDZD(it.price)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e7a46' }}>
                          {formatDZD((it.price || 0) * (it.quantity || 1))}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#71717a' }}>
                      {order.product_name || 'Item details'} — {formatDZD(order.total_price)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => {
              const confirmText = lang === 'fr' ? `Supprimer la commande #${order.id} ?` : `Delete order #${order.id}?`;
              if (window.confirm(confirmText)) {
                onDelete(order.id);
                onClose();
              }
            }}
          >
            🗑️ {lang === 'fr' ? 'Supprimer la Commande' : 'Delete Order'}
          </button>
          <button type="button" className="btn btn-black" onClick={onClose}>
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

