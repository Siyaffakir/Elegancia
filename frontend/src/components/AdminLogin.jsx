// components/AdminLogin.jsx — Luxury Algerian Beauty Admin Login
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function AdminLogin() {
  const { login } = useAuth();
  const { t, lang } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setStatus({
        loading: false,
        error: lang === 'fr' ? 'Veuillez saisir le nom d’utilisateur et le mot de passe.' : 'Please enter both username and password.',
      });
      return;
    }

    setStatus({ loading: true, error: '' });
    try {
      await login(username.trim(), password);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.message ||
        (lang === 'fr' ? 'Échec de l’authentification. Vérifiez vos identifiants.' : 'Authentication failed. Please verify your credentials.');
      setStatus({ loading: false, error: errorMsg });
    }
  }

  return (
    <div className="container section" style={{ maxWidth: '480px', margin: '40px auto' }}>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e4e4e7',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
          padding: '36px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top Decorative Gold/Green Stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #1e7a46, #000000, #1e7a46)',
          }}
        />

        {/* Language Switcher in Login Card */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <LanguageSwitcher variant="default" />
        </div>

        {/* Brand & Security Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#f4fbf6',
              border: '1px solid #c7eed5',
              color: '#1e7a46',
              marginBottom: '16px',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h2
            style={{
              fontSize: '22px',
              fontWeight: '900',
              letterSpacing: '-0.02em',
              color: '#09090b',
              margin: '0 0 6px 0',
            }}
          >
            {t('admin.login.title')}
          </h2>
          <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>
            {t('admin.login.subtitle')}
          </p>
        </div>

        {/* Error Feedback Banner */}
        {status.error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '13px',
              lineHeight: '1.4',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <div>{status.error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              htmlFor="admin-username"
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#27272a',
                marginBottom: '6px',
              }}
            >
              {t('admin.login.username')}
            </label>
            <input
              id="admin-username"
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              disabled={status.loading}
              style={{
                width: '100%',
                padding: '11px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #d4d4d8',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#27272a',
                marginBottom: '6px',
              }}
            >
              {t('admin.login.password')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={status.loading}
                style={{
                  width: '100%',
                  padding: '11px 42px 11px 14px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid #d4d4d8',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#71717a',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={status.loading}
            style={{
              marginTop: '8px',
              padding: '13px 20px',
              borderRadius: '8px',
              background: '#09090b',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              border: 'none',
              cursor: status.loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
          >
            {status.loading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>{t('admin.login.submitting')}</span>
              </>
            ) : (
              <>
                <span>{t('admin.login.submit')}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Security Feature Highlights footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid #f4f4f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '11px',
            color: '#a1a1aa',
          }}
        >
          <span>✦ Rate-Limited Protection</span>
          <span>•</span>
          <span>✦ Path Traversal Shielded</span>
          <span>•</span>
          <span>✦ JWT Encrypted</span>
        </div>
      </div>
    </div>
  );
}

