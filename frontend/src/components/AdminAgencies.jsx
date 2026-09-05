import { useState } from 'react';
import { addAgency, deleteAgency } from '../api';
import { computeAgencyStats } from '../utils/remittanceStats';
import { useLanguage } from '../context/LanguageContext';

function formatDZD(n) {
  return `${Math.round(n || 0).toLocaleString('en-US')} DZD`;
}

export default function AdminAgencies({ orders, agencies, remittances, onChange }) {
  const { lang } = useLanguage();
  const [name, setName] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const stats = computeAgencyStats(orders, agencies, remittances);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setStatus({ state: 'loading', message: '' });
    try {
      await addAgency(name.trim());
      setName('');
      await onChange();
      setStatus({ state: 'success', message: lang === 'fr' ? 'Agence ajoutée.' : 'Agency added.' });
    } catch (err) {
      setStatus({ state: 'error', message: err?.response?.data?.error || (lang === 'fr' ? 'Échec d’ajout.' : 'Failed to add agency.') });
    }
  }

  async function handleDelete(agency) {
    const confirmMsg = lang === 'fr' ? `Supprimer "${agency.name}" ?` : `Remove "${agency.name}"?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteAgency(agency.id);
      await onChange();
    } catch (err) {
      alert(err?.response?.data?.error || (lang === 'fr' ? 'Échec de suppression.' : 'Failed to delete agency.'));
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {lang === 'fr' ? 'Sociétés & Agences de Livraison' : 'Delivery Agencies'}
        </h3>
        <p style={{ fontSize: '12.5px', color: '#71717a', marginTop: '6px' }}>
          {lang === 'fr'
            ? 'Ajoutez les prestataires de livraison (Yalidine, ZR Express, etc.). Assignez les commandes dans le détail commande et suivez les règlements dans l’onglet Finance.'
            : 'Add the courier/delivery companies you work with. Assign orders to an agency from the order detail view, and track what each one still owes you vs. has already paid in the Finance tab.'}
        </p>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={lang === 'fr' ? 'ex: Yalidine, ZR Express, Transporteur Privé...' : 'e.g. Yalidine, ZR Express, My Local Courier...'}
          style={{ flex: '1 1 260px', padding: '10px 14px', border: '1px solid #d4d4d8', borderRadius: '6px', fontSize: '13px' }}
        />
        <button type="submit" className="btn btn-green" disabled={status.state === 'loading'}>
          {status.state === 'loading' ? (lang === 'fr' ? 'Ajout...' : 'Adding...') : (lang === 'fr' ? 'Ajouter l’Agence' : 'Add Agency')}
        </button>
      </form>
      {status.message && (
        <p className={`form-msg ${status.state === 'success' ? 'success' : 'error'}`}>{status.message}</p>
      )}

      <div className="table-scroll" style={{ marginTop: '16px' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{lang === 'fr' ? 'Agence' : 'Agency'}</th>
              <th>{lang === 'fr' ? 'Commandes Gérées' : 'Orders Handled'}</th>
              <th>{lang === 'fr' ? 'Retournées' : 'Returned'}</th>
              <th>{lang === 'fr' ? 'En Attente de Paiement' : 'Awaiting Payment'}</th>
              <th>{lang === 'fr' ? 'Encaissé' : 'Received'}</th>
              <th>{lang === 'fr' ? 'Coût Retours' : 'Return Cost'}</th>
              <th>{lang === 'fr' ? 'Net Reçu' : 'Net Received'}</th>
              <th style={{ textAlign: 'right' }}>{lang === 'fr' ? 'Actions' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.agency.id}>
                <td style={{ fontWeight: '700' }}>{s.agency.name}</td>
                <td>{s.ordersHandled}</td>
                <td>
                  {s.returnedCount > 0 ? (
                    <span style={{ color: '#b91c1c', fontWeight: '700' }}>
                      ⚠ {s.returnedCount} ({(s.returnRate * 100).toFixed(0)}%)
                    </span>
                  ) : (
                    '0'
                  )}
                </td>
                <td>
                  {s.pendingCount > 0 ? (
                    <span style={{ color: '#b45309', fontWeight: '700' }}>
                      {formatDZD(s.pendingAmount)} ({s.pendingCount})
                    </span>
                  ) : (
                    <span style={{ color: '#71717a' }}>0 DZD</span>
                  )}
                </td>
                <td style={{ fontWeight: '700', color: '#1e7a46' }}>{formatDZD(s.receivedAmount)}</td>
                <td style={{ color: s.returnCost > 0 ? '#b91c1c' : '#71717a' }}>
                  {s.returnCost > 0 ? `−${formatDZD(s.returnCost)}` : '0 DZD'}
                </td>
                <td style={{ fontWeight: '800' }}>{formatDZD(s.netReceived)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="icon-btn danger" onClick={() => handleDelete(s.agency)}>
                    {lang === 'fr' ? 'Supprimer' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {stats.length === 0 && (
          <div className="empty-state">
            {lang === 'fr' ? 'Aucune agence de livraison configurée.' : 'No delivery agencies added yet.'}
          </div>
        )}
      </div>
    </div>
  );
}

