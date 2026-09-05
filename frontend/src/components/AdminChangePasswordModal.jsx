// components/AdminChangePasswordModal.jsx — Change Admin Password Modal
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function AdminChangePasswordModal({ isOpen, onClose }) {
  const { changePassword } = useAuth();
  const { lang } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ loading: false, error: '', success: '' });

    if (newPassword !== confirmPassword) {
      setStatus({
        loading: false,
        error: lang === 'fr' ? 'Les nouveaux mots de passe ne correspondent pas.' : 'New passwords do not match.',
        success: '',
      });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({
        loading: false,
        error: lang === 'fr' ? 'Le mot de passe doit comporter au moins 6 caractères.' : 'New password must be at least 6 characters.',
        success: '',
      });
      return;
    }

    setStatus({ loading: true, error: '', success: '' });
    try {
      await changePassword(currentPassword, newPassword);
      setStatus({
        loading: false,
        error: '',
        success: lang === 'fr'
          ? 'Mot de passe mis à jour avec succès !'
          : 'Password updated successfully! Next login will require your new password.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setStatus({ loading: false, error: '', success: '' });
      }, 1500);
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || (lang === 'fr' ? 'Échec de mise à jour du mot de passe.' : 'Failed to update password.');
      setStatus({ loading: false, error: msg, success: '' });
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
            {lang === 'fr' ? 'Modifier le Mot de Passe Admin' : 'Change Administrator Password'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#71717a',
            }}
          >
            ✕
          </button>
        </div>

        {status.error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {status.error}
          </div>
        )}

        {status.success && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {status.success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#3f3f46',
                marginBottom: '4px',
              }}
            >
              {lang === 'fr' ? 'Mot de Passe Actuel' : 'Current Password'}
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={lang === 'fr' ? 'Saisir le mot de passe actuel' : 'Enter current password'}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#3f3f46',
                marginBottom: '4px',
              }}
            >
              {lang === 'fr' ? 'Nouveau Mot de Passe (min 6 car.)' : 'New Password (min 6 characters)'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={lang === 'fr' ? 'Nouveau mot de passe fort' : 'Enter new strong password'}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#3f3f46',
                marginBottom: '4px',
              }}
            >
              {lang === 'fr' ? 'Confirmer le Nouveau Mot de Passe' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={lang === 'fr' ? 'Confirmez le nouveau mot de passe' : 'Confirm new password'}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              type="submit"
              disabled={status.loading}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: '6px',
                background: '#09090b',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '13.5px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {status.loading
                ? (lang === 'fr' ? 'Mise à jour...' : 'Updating...')
                : (lang === 'fr' ? 'Mettre à Jour le Mot de Passe' : 'Update Password')}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 16px',
                borderRadius: '6px',
                background: '#f4f4f5',
                color: '#18181b',
                fontWeight: '600',
                fontSize: '13.5px',
                border: '1px solid #e4e4e7',
                cursor: 'pointer',
              }}
            >
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

