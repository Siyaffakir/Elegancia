import { useState, useEffect } from 'react';
import { getDeliveryPricing, updateDeliveryPricing } from '../api';
import { useLanguage } from '../context/LanguageContext';

export default function AdminDeliveryPricing() {
  const { lang } = useLanguage();
  const [pricing, setPricing] = useState([]);
  const [threshold, setThreshold] = useState(10000);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [savingCode, setSavingCode] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  function load() {
    setLoading(true);
    return getDeliveryPricing()
      .then((data) => {
        setPricing(data.pricing || []);
        setThreshold(data.freeDeliveryThreshold || 10000);
      })
      .catch(() => setStatus({ state: 'error', message: lang === 'fr' ? 'Échec de chargement des tarifs.' : 'Failed to load delivery pricing.' }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function draftFor(row) {
    return drafts[row.wilaya_code] || { home_fee: row.home_fee, stopdesk_fee: row.stopdesk_fee };
  }

  // Takes the full row (not just its code) so the untouched field falls back to its real
  // current value instead of an arbitrary default when this is the row's first edit.
  function setDraft(row, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [row.wilaya_code]: { ...draftFor(row), ...prev[row.wilaya_code], [field]: value },
    }));
  }

  async function handleSave(row) {
    const draft = draftFor(row);
    const homeFee = Number(draft.home_fee);
    const stopdeskFee = Number(draft.stopdesk_fee);
    if (!Number.isFinite(homeFee) || homeFee < 0 || !Number.isFinite(stopdeskFee) || stopdeskFee < 0) {
      setStatus({ state: 'error', message: lang === 'fr' ? 'Les tarifs doivent être des nombres positifs.' : 'Fees must be non-negative numbers.' });
      return;
    }
    setSavingCode(row.wilaya_code);
    setStatus({ state: 'idle', message: '' });
    try {
      await updateDeliveryPricing(row.wilaya_code, homeFee, stopdeskFee);
      await load();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.wilaya_code];
        return next;
      });
      setStatus({
        state: 'success',
        message: lang === 'fr' ? `Tarifs mis à jour pour ${row.wilaya_name}.` : `Updated ${row.wilaya_name} delivery fees.`,
      });
    } catch (err) {
      setStatus({ state: 'error', message: err?.response?.data?.error || (lang === 'fr' ? 'Échec de mise à jour.' : 'Failed to update pricing.') });
    } finally {
      setSavingCode(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>{lang === 'fr' ? 'Chargement des tarifs de livraison...' : 'Loading Delivery Pricing...'}</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {lang === 'fr' ? 'Tarifs de Livraison par Wilaya' : 'Delivery Pricing by Wilaya'}
        </h3>
        <p style={{ fontSize: '12.5px', color: '#71717a', marginTop: '6px' }}>
          {lang === 'fr'
            ? `Les frais de livraison à domicile sont appliqués sauf si la commande atteint le seuil de gratuité (${Number(threshold).toLocaleString('en-US')} DZD). Ajustez ces montants selon vos contrats avec les agences.`
            : `Home delivery fee is charged at checkout unless the order subtotal reaches the free-delivery threshold (${Number(threshold).toLocaleString('en-US')} DZD). Values seeded from public courier research are starting points — adjust to match your actual delivery contracts.`}
        </p>
        {status.message && (
          <p className={`form-msg ${status.state === 'success' ? 'success' : 'error'}`} style={{ marginTop: '8px' }}>
            {status.message}
          </p>
        )}
      </div>

      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>{lang === 'fr' ? 'Code' : 'Code'}</th>
              <th>{lang === 'fr' ? 'Wilaya' : 'Wilaya'}</th>
              <th>{lang === 'fr' ? 'Frais Domicile (DZD)' : 'Home Delivery Fee (DZD)'}</th>
              <th>{lang === 'fr' ? 'Frais Point Relais (DZD)' : 'Stop Desk Fee (DZD)'}</th>
              <th style={{ textAlign: 'right' }}>{lang === 'fr' ? 'Actions' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((row) => {
              const draft = draftFor(row);
              const dirty = drafts[row.wilaya_code] !== undefined;
              return (
                <tr key={row.wilaya_code}>
                  <td style={{ color: '#71717a' }}>{row.wilaya_code}</td>
                  <td style={{ fontWeight: '700' }}>{row.wilaya_name}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.home_fee}
                      onChange={(e) => setDraft(row, 'home_fee', e.target.value)}
                      style={{ width: '110px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.stopdesk_fee}
                      onChange={(e) => setDraft(row, 'stopdesk_fee', e.target.value)}
                      style={{ width: '110px' }}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="icon-btn"
                      disabled={!dirty || savingCode === row.wilaya_code}
                      onClick={() => handleSave(row)}
                    >
                      {savingCode === row.wilaya_code
                        ? (lang === 'fr' ? 'Enregistrement...' : 'Saving...')
                        : (lang === 'fr' ? 'Enregistrer' : 'Save')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

