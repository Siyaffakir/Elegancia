import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminOrdersTable from '../components/AdminOrdersTable';
import AdminProductForm from '../components/AdminProductForm';
import AdminDeliveryPricing from '../components/AdminDeliveryPricing';
import AdminCustomers from '../components/AdminCustomers';
import AdminFinance from '../components/AdminFinance';
import AdminAgencies from '../components/AdminAgencies';
import AdminLogin from '../components/AdminLogin';
import AdminChangePasswordModal from '../components/AdminChangePasswordModal';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  getOrders,
  deleteOrder,
  updateOrderStatus,
  updateOrderLogistics,
  getProducts,
  getCategories,
  getAgencies,
  getRemittances,
} from '../api';
import { computeCustomerStats } from '../utils/customerStats';

function formatDZD(price) {
  return `${Number(price || 0).toLocaleString('en-US')} DZD`;
}

export default function AdminDashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState('orders'); // orders | products
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [remittances, setRemittances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const loadOrders = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve();
    return getOrders().then(setOrders).catch((err) => console.error('Failed to load orders', err));
  }, [isAuthenticated]);

  const loadProducts = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve();
    return Promise.all([getProducts(), getCategories()])
      .then(([p, c]) => {
        setProducts(p);
        setCategories(c);
      })
      .catch((err) => console.error('Failed to load catalog', err));
  }, [isAuthenticated]);

  const loadAgencies = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve();
    return getAgencies().then(setAgencies).catch((err) => console.error('Failed to load agencies', err));
  }, [isAuthenticated]);

  const loadRemittances = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve();
    return getRemittances().then(setRemittances).catch((err) => console.error('Failed to load remittances', err));
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      Promise.all([loadOrders(), loadProducts(), loadAgencies(), loadRemittances()]).finally(() => setLoading(false));
    }
  }, [isAuthenticated, loadOrders, loadProducts, loadAgencies, loadRemittances]);

  async function handleUpdateLogistics(id, deliveryAgencyId, trackingTag) {
    await updateOrderLogistics(id, deliveryAgencyId, trackingTag);
    await loadOrders();
  }

  async function handleAgenciesChanged() {
    await loadAgencies();
  }

  async function handleDeleteOrder(id) {
    const confirmMsg = lang === 'fr' ? 'Supprimer cette commande client ?' : 'Delete this customer order?';
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteOrder(id);
      loadOrders();
    } catch (err) {
      alert(err?.response?.data?.error || (lang === 'fr' ? 'Échec de suppression.' : 'Failed to delete order.'));
    }
  }

  async function handleUpdateOrderStatus(id, newStatus) {
    try {
      await updateOrderStatus(id, newStatus);
      loadOrders();
    } catch (err) {
      alert(err?.response?.data?.error || (lang === 'fr' ? 'Échec de mise à jour.' : 'Failed to update order status.'));
    }
  }

  // Calculate high-level KPIs including order status breakdown
  const stats = useMemo(() => {
    const totalInventoryValue = products.reduce((acc, p) => acc + (p.price || 0) * (p.stock || 0), 0);
    const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);

    let pendingCount = 0;
    let confirmedCount = 0;
    let canceledCount = 0;
    let returnedCount = 0;
    let totalRevenue = 0;

    orders.forEach((o) => {
      const st = o.status || 'Pending';
      if (st === 'Pending') pendingCount++;
      if (st === 'Confirmed' || st === 'Shipped' || st === 'Delivered') {
        confirmedCount++;
        totalRevenue += o.total_price || 0;
      }
      if (st === 'Canceled') canceledCount++;
      if (st === 'Returned') returnedCount++;
    });

    return {
      ordersCount: orders.length,
      pendingCount,
      confirmedCount,
      canceledCount,
      returnedCount,
      totalRevenue,
      productsCount: products.length,
      categoriesCount: categories.length,
      totalStock,
      totalInventoryValue,
    };
  }, [orders, products, categories]);

  const customerList = useMemo(() => computeCustomerStats(orders), [orders]);
  const customerMap = useMemo(() => new Map(customerList.map((c) => [c.phone, c])), [customerList]);

  if (authLoading) {
    return (
      <div className="container section" style={{ textAlign: 'center', padding: '60px 0' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#71717a', fontSize: '14px' }}>
          {lang === 'fr' ? 'Vérification de l’autorisation de sécurité...' : 'Verifying Security Authorization...'}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="container section">
      {/* Top Admin Security & Profile Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          background: '#18181b',
          color: '#f4f4f5',
          borderRadius: '8px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: '600' }}>
            {lang === 'fr' ? 'Connecté en tant que' : 'Logged in as'}{' '}
            <strong style={{ color: '#ffffff' }}>{user?.username || 'Admin'}</strong>
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.12)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            JWT Encrypted
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LanguageSwitcher variant="admin" />
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {t('admin.changePassword')}
          </button>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '6px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{t('admin.logout')}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="admin-header">
        <div>
          <h1 className="section-title" style={{ fontSize: '28px' }}>
            {lang === 'fr' ? 'Studio de Gestion' : 'Store Management'} <span>{lang === 'fr' ? 'Boutique' : 'Studio'}</span>
          </h1>
          <p className="section-sub">
            {lang === 'fr'
              ? 'Suivi des commandes clients, mise à jour des statuts et gestion du stock sur 58 Wilayas.'
              : 'Track customer orders, update confirmation status, and manage catalog across 58 Wilayas.'}
          </p>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-card-title">{t('admin.kpis.totalOrders')}</div>
          <div className="stat-card-value">{stats.ordersCount}</div>
          <div className="stat-card-sub">
            <span style={{ color: '#d97706', fontWeight: '700' }}>
              {stats.pendingCount} {lang === 'fr' ? 'En attente' : 'Pending'}
            </span> •{' '}
            <span style={{ color: '#0284c7', fontWeight: '700' }}>
              {stats.confirmedCount} {lang === 'fr' ? 'Actives/Confirmées' : 'Active/Confirmed'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">{t('admin.kpis.grossRevenue')}</div>
          <div className="stat-card-value" style={{ fontSize: '20px', color: '#1e7a46' }}>
            {formatDZD(stats.totalRevenue)}
          </div>
          <div className="stat-card-sub">
            {stats.canceledCount > 0 && (
              <span style={{ color: '#dc2626' }}>
                {stats.canceledCount} {lang === 'fr' ? 'Annulées • ' : 'Canceled • '}
              </span>
            )}
            {stats.returnedCount > 0 && (
              <span style={{ color: '#ea580c' }}>
                {stats.returnedCount} {lang === 'fr' ? 'Retournées' : 'Returned'}
              </span>
            )}
            {stats.canceledCount === 0 && stats.returnedCount === 0 && (
              lang === 'fr' ? 'Valeur confirmée & livrée' : 'Confirmed & Delivered Value'
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">{lang === 'fr' ? 'Produits Actifs' : 'Active Products'}</div>
          <div className="stat-card-value">{stats.productsCount}</div>
          <div className="stat-card-sub">
            {lang === 'fr'
              ? `Sur ${stats.categoriesCount} Rayons`
              : `Across ${stats.categoriesCount} Departments`}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title">{t('admin.kpis.inventoryValue')}</div>
          <div className="stat-card-value">{stats.totalStock}</div>
          <div className="stat-card-sub">{lang === 'fr' ? 'Unités prêtes à expédier' : 'Ready to Dispatch'}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'orders' ? 'active' : ''}`}
          onClick={() => setTab('orders')}
        >
          {t('admin.tabs.orders')} ({orders.length})
        </button>
        <button
          className={`admin-tab ${tab === 'products' ? 'active' : ''}`}
          onClick={() => setTab('products')}
        >
          {t('admin.tabs.products')} ({products.length})
        </button>
        <button
          className={`admin-tab ${tab === 'customers' ? 'active' : ''}`}
          onClick={() => setTab('customers')}
        >
          {t('admin.tabs.customers')} ({customerList.length})
        </button>
        <button
          className={`admin-tab ${tab === 'finance' ? 'active' : ''}`}
          onClick={() => setTab('finance')}
        >
          {t('admin.tabs.finance')}
        </button>
        <button
          className={`admin-tab ${tab === 'agencies' ? 'active' : ''}`}
          onClick={() => setTab('agencies')}
        >
          {t('admin.tabs.agencies')} ({agencies.length})
        </button>
        <button
          className={`admin-tab ${tab === 'delivery' ? 'active' : ''}`}
          onClick={() => setTab('delivery')}
        >
          {t('admin.tabs.pricing')}
        </button>
      </div>

      {loading && tab !== 'delivery' && tab !== 'finance' ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>{lang === 'fr' ? 'Synchronisation des données...' : 'Synchronizing Store Data...'}</span>
        </div>
      ) : tab === 'orders' ? (
        <AdminOrdersTable
          orders={orders}
          onDelete={handleDeleteOrder}
          onUpdateStatus={handleUpdateOrderStatus}
          customerStats={customerMap}
          agencies={agencies}
          onUpdateLogistics={handleUpdateLogistics}
        />
      ) : tab === 'products' ? (
        <AdminProductForm products={products} categories={categories} onChange={loadProducts} />
      ) : tab === 'customers' ? (
        <AdminCustomers customers={customerList} />
      ) : tab === 'finance' ? (
        <AdminFinance
          orders={orders}
          agencies={agencies}
          remittances={remittances}
          onRemittanceChange={loadRemittances}
        />
      ) : tab === 'agencies' ? (
        <AdminAgencies
          orders={orders}
          agencies={agencies}
          remittances={remittances}
          onChange={handleAgenciesChanged}
        />
      ) : (
        <AdminDeliveryPricing />
      )}

      {/* Change Password Modal */}
      <AdminChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

