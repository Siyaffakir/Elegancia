import { useState, useMemo } from 'react';
import AdminOrderDetailModal from './AdminOrderDetailModal';
import { useLanguage } from '../context/LanguageContext';

function formatDate(iso) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDZD(price) {
  return `${Number(price || 0).toLocaleString('en-US')} DZD`;
}

const STATUS_CONFIG = {
  Pending: { color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  Confirmed: { color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' },
  Shipped: { color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe' },
  Delivered: { color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  Canceled: { color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  Returned: { color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' },
};

const ALL_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Canceled', 'Returned'];

export default function AdminOrdersTable({ orders, onDelete, onUpdateStatus, customerStats, agencies, onUpdateLogistics }) {
  const { t, dict, lang } = useLanguage();
  const [filter, setFilter] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const agencyById = useMemo(() => new Map((agencies || []).map((a) => [a.id, a.name])), [agencies]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { ALL: orders.length };
    ALL_STATUSES.forEach((st) => {
      counts[st] = 0;
    });
    orders.forEach((o) => {
      const st = o.status || 'Pending';
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;

    // Filter by status tab
    if (activeStatusTab !== 'ALL') {
      list = list.filter((o) => (o.status || 'Pending') === activeStatusTab);
    }

    // Filter by search query
    if (filter.trim()) {
      const q = filter.toLowerCase().trim();
      list = list.filter(
        (o) =>
          String(o.id).includes(q) ||
          (o.full_name || '').toLowerCase().includes(q) ||
          (o.wilaya || '').toLowerCase().includes(q) ||
          (o.commune || '').toLowerCase().includes(q) ||
          (o.phone || '').toLowerCase().includes(q) ||
          (o.product_name || '').toLowerCase().includes(q) ||
          (o.status || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [orders, activeStatusTab, filter]);

  if (orders.length === 0) {
    return <div className="empty-state">{t('admin.orders.noOrders')}</div>;
  }

  return (
    <div>
      {/* Status Filter Tabs Bar */}
      <div className="admin-status-tabs-row">
        <button
          type="button"
          className={`status-tab-btn ${activeStatusTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveStatusTab('ALL')}
        >
          {lang === 'fr' ? 'Toutes les Commandes' : 'All Orders'} ({statusCounts.ALL})
        </button>
        {ALL_STATUSES.map((st) => {
          const cfg = STATUS_CONFIG[st];
          const stLabel = dict?.admin?.status?.[st] || st;
          return (
            <button
              key={st}
              type="button"
              className={`status-tab-btn ${activeStatusTab === st ? 'active' : ''}`}
              onClick={() => setActiveStatusTab(st)}
              style={
                activeStatusTab === st
                  ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color }
                  : {}
              }
            >
              {stLabel} ({statusCounts[st] || 0})
            </button>
          );
        })}
      </div>

      {/* Search Filter for Orders */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={t('admin.orders.searchPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            minWidth: '280px',
            maxWidth: '520px',
            padding: '10px 16px',
            border: '1px solid #d4d4d8',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
        <span style={{ fontSize: '12px', color: '#71717a', fontWeight: '600' }}>
          {lang === 'fr'
            ? `Affichage de ${filteredOrders.length} sur ${orders.length} commandes`
            : `Showing ${filteredOrders.length} of ${orders.length} orders`}
        </span>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>{t('admin.orders.colId')}</th>
              <th>{t('admin.orders.colDate')}</th>
              <th>{t('admin.orders.colCustomer')}</th>
              <th>{t('admin.orders.colDestination')}</th>
              <th>{t('admin.orders.colAgency')}</th>
              <th>{t('admin.orders.colItems')}</th>
              <th>{t('admin.orders.colTotal')}</th>
              <th style={{ width: '150px' }}>{t('admin.orders.colStatus')}</th>
              <th style={{ textAlign: 'right', minWidth: '130px' }}>{t('admin.orders.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => {
              const statusCfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.Pending;
              const items = Array.isArray(o.items) ? o.items : [];
              const totalQuantity = items.reduce((acc, it) => acc + (parseInt(it.quantity, 10) || 1), 0);

              return (
                <tr key={o.id} className="order-table-row">
                  {/* Order ID */}
                  <td style={{ fontWeight: '800', color: '#0a0a0a' }}>
                    <button
                      type="button"
                      className="order-id-link"
                      onClick={() => setSelectedOrder(o)}
                    >
                      #{o.id}
                    </button>
                  </td>

                  {/* Date */}
                  <td style={{ whiteSpace: 'nowrap', color: '#71717a', fontSize: '12.5px' }}>
                    {formatDate(o.created_at)}
                  </td>

                  {/* Customer & Phone */}
                  <td>
                    <div style={{ fontWeight: '700', color: '#0a0a0a' }}>{o.full_name}</div>
                    <a
                      href={`tel:${o.phone}`}
                      style={{ color: '#1e7a46', fontWeight: '600', fontSize: '12px', textDecoration: 'none' }}
                    >
                      📞 {o.phone}
                    </a>
                    {(() => {
                      const stats = customerStats?.get(String(o.phone || '').trim());
                      if (!stats || stats.returnedCount === 0) return null;
                      return (
                        <div
                          title={lang === 'fr' ? 'Ce client a déjà retourné des colis' : 'This customer has returned package(s) before'}
                          style={{
                            marginTop: '3px',
                            fontSize: '10.5px',
                            fontWeight: '700',
                            color: '#b91c1c',
                          }}
                        >
                          ⚠ {stats.returnedCount} {lang === 'fr' ? 'retour(s) antérieur(s)' : 'prior return(s)'}
                        </div>
                      );
                    })()}
                  </td>

                  {/* Wilaya & Commune */}
                  <td>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{o.wilaya}</div>
                    {o.commune && (
                      <span className="commune-chip">
                        📍 {o.commune}
                      </span>
                    )}
                    <div style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>
                      {o.delivery_type === 'stopdesk'
                        ? (lang === 'fr' ? '🏬 Stop Desk' : '🏬 Stop Desk')
                        : (lang === 'fr' ? '🏠 À domicile' : '🏠 Home')}
                    </div>
                  </td>

                  {/* Delivery Agency & Tracking Tag */}
                  <td style={{ fontSize: '12.5px' }}>
                    {o.delivery_agency_id ? (
                      <div style={{ fontWeight: '700' }}>{agencyById.get(o.delivery_agency_id) || (lang === 'fr' ? 'Agence inconnue' : 'Unknown agency')}</div>
                    ) : (
                      <span style={{ color: '#a1a1aa' }}>— {lang === 'fr' ? 'aucune' : 'none'} —</span>
                    )}
                    {o.tracking_tag && (
                      <div style={{ color: '#71717a', fontFamily: 'monospace', fontSize: '11.5px' }}>{o.tracking_tag}</div>
                    )}
                  </td>

                  {/* Items & Quantity */}
                  <td style={{ maxWidth: '280px' }}>
                    <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#0a0a0a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="qty-pill">{totalQuantity > 0 ? totalQuantity : 1} {lang === 'fr' ? 'unités' : 'units'}</span>
                      <span>({items.length > 0 ? items.length : 1} {items.length === 1 ? (lang === 'fr' ? 'article' : 'item') : (lang === 'fr' ? 'articles' : 'items')})</span>
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: '#71717a',
                        marginTop: '3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '260px',
                      }}
                      title={o.product_name || (items.map((i) => `${i.name} (x${i.quantity})`).join(', '))}
                    >
                      {items.length > 0
                        ? items.map((i) => `${i.name} (x${i.quantity})`).join(', ')
                        : o.product_name}
                    </div>
                  </td>

                  {/* Total Price */}
                  <td>
                    <div style={{ fontWeight: '800', color: '#0a0a0a' }}>{formatDZD(o.total_price)}</div>
                    <span className="badge success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      COD
                    </span>
                  </td>

                  {/* Status Dropdown */}
                  <td>
                    <select
                      className="status-inline-select"
                      style={{
                        backgroundColor: statusCfg.bg,
                        color: statusCfg.color,
                        borderColor: statusCfg.border,
                      }}
                      value={o.status || 'Pending'}
                      onChange={(e) => onUpdateStatus(o.id, e.target.value)}
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {dict?.admin?.status?.[st] || st}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setSelectedOrder(o)}
                      title={t('admin.orders.viewDetails')}
                      style={{ marginRight: '6px' }}
                    >
                      {t('admin.orders.viewDetails')}
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => onDelete(o.id)}
                      title={t('admin.orders.deleteOrder')}
                    >
                      {t('admin.orders.deleteOrder')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="empty-state" style={{ padding: '30px' }}>
            {lang === 'fr' ? 'Aucune commande ne correspond au filtre.' : 'No orders match the current filter.'}
          </div>
        )}
      </div>

      {/* Full Order Detail Modal */}
      {selectedOrder && (
        <AdminOrderDetailModal
          order={orders.find((o) => o.id === selectedOrder.id) || selectedOrder}
          customerStats={customerStats}
          agencies={agencies}
          onUpdateLogistics={onUpdateLogistics}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (id, st) => {
            await onUpdateStatus(id, st);
          }}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

