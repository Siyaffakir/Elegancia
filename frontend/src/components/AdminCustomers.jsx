import { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(price) {
  return `${Number(price || 0).toLocaleString('en-US')} DZD`;
}

export default function AdminCustomers({ customers }) {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('returnedCount');

  const filtered = useMemo(() => {
    let list = customers;
    if (filter.trim()) {
      const q = filter.toLowerCase().trim();
      list = list.filter(
        (c) => c.phone.includes(q) || c.names.some((n) => n.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'returnedCount') return b.returnedCount - a.returnedCount;
      if (sortBy === 'returnRate') return b.returnRate - a.returnRate;
      if (sortBy === 'totalOrders') return b.totalOrders - a.totalOrders;
      if (sortBy === 'totalSpent') return b.totalSpent - a.totalSpent;
      return 0;
    });
  }, [customers, filter, sortBy]);

  const flaggedCount = customers.filter((c) => c.returnedCount > 0).length;

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {lang === 'fr' ? 'Clients & Historique de Retours' : 'Customers & Return History'}
        </h3>
        <p style={{ fontSize: '12.5px', color: '#71717a', marginTop: '6px' }}>
          {lang === 'fr'
            ? `Groupés par numéro de téléphone. ${flaggedCount} client(s) ont au moins un colis retourné.`
            : `Grouped by phone number across all orders. ${flaggedCount} customer${flaggedCount === 1 ? '' : 's'} have at least one returned package.`}
        </p>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={lang === 'fr' ? 'Rechercher par nom ou téléphone...' : 'Search by name or phone...'}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1,
            minWidth: '240px',
            maxWidth: '400px',
            padding: '10px 16px',
            border: '1px solid #d4d4d8',
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: '4px', border: '1px solid #d4d4d8', fontSize: '13px' }}
        >
          <option value="returnedCount">{lang === 'fr' ? 'Tri : Plus grand nb de retours' : 'Sort: Most Returns'}</option>
          <option value="returnRate">{lang === 'fr' ? 'Tri : Plus fort taux de retour' : 'Sort: Highest Return Rate'}</option>
          <option value="totalOrders">{lang === 'fr' ? 'Tri : Plus grand nb de commandes' : 'Sort: Most Orders'}</option>
          <option value="totalSpent">{lang === 'fr' ? 'Tri : Plus fort montant livré' : 'Sort: Highest Delivered Spend'}</option>
        </select>
        <span style={{ fontSize: '12px', color: '#71717a', fontWeight: '600' }}>
          {lang === 'fr'
            ? `Affichage de ${filtered.length} sur ${customers.length} clients`
            : `Showing ${filtered.length} of ${customers.length} customers`}
        </span>
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{lang === 'fr' ? 'Nom(s) Client' : 'Customer Name(s)'}</th>
              <th>{lang === 'fr' ? 'Téléphone' : 'Phone'}</th>
              <th>{lang === 'fr' ? 'Total Commandes' : 'Total Orders'}</th>
              <th>{lang === 'fr' ? 'Retournées' : 'Returned'}</th>
              <th>{lang === 'fr' ? 'Annulées' : 'Canceled'}</th>
              <th>{lang === 'fr' ? 'Taux de Retour' : 'Return Rate'}</th>
              <th>{lang === 'fr' ? 'Montant Livré' : 'Delivered Spend'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.phone}>
                <td style={{ fontWeight: '700' }}>{c.names.join(' / ') || '—'}</td>
                <td>
                  <a href={`tel:${c.phone}`} style={{ color: '#1e7a46', fontWeight: '600', textDecoration: 'none' }}>
                    📞 {c.phone}
                  </a>
                </td>
                <td>{c.totalOrders}</td>
                <td>
                  {c.returnedCount > 0 ? (
                    <span style={{ color: '#b91c1c', fontWeight: '800' }}>⚠ {c.returnedCount}</span>
                  ) : (
                    <span style={{ color: '#71717a' }}>0</span>
                  )}
                </td>
                <td>{c.canceledCount}</td>
                <td style={{ fontWeight: '700', color: c.returnRate >= 0.5 ? '#b91c1c' : '#3c423c' }}>
                  {(c.returnRate * 100).toFixed(0)}%
                </td>
                <td style={{ fontWeight: '700' }}>{formatDZD(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            {lang === 'fr' ? 'Aucun client ne correspond à cette recherche.' : 'No customers match this search.'}
          </div>
        )}
      </div>
    </div>
  );
}

