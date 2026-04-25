import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('pf_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('pf_remember_email'));
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const sessionExpired = searchParams.get('reason') === 'expired';

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    clearError();

    if (cooldown > 0) return;

    try {
      const role = await login(email, password);

      // Remember email
      if (rememberMe) {
        localStorage.setItem('pf_remember_email', email);
      } else {
        localStorage.removeItem('pf_remember_email');
      }

      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const newFailCount = failedAttempts + 1;
      setFailedAttempts(newFailCount);
      if (newFailCount >= 5) {
        setCooldown(30);
        setFailedAttempts(0);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0B0F1A 0%, #0F2A5C 50%, #0B0F1A 100%)' }}>
      <div
        className="relative z-10 flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '40px',
          width: '420px',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#2563EB] rounded flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '18px' }}>PantasFlow</span>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginTop: '24px', marginBottom: '8px' }}>
          Welcome back
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>
          Sign in to your account
        </p>

        {/* Session expired banner */}
        {sessionExpired && (
          <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FDE68A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Your session has expired. Please sign in again.
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: 'white',
                fontSize: '14px',
                width: '100%',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5 relative">
            <div className="flex items-center justify-between">
              <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                Password
              </label>
              <span
                style={{ fontSize: '12px', color: '#60A5FA', cursor: 'pointer' }}
                title="Contact your administrator to reset your password"
              >
                Forgot password?
              </span>
            </div>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  paddingRight: '40px',
                  color: 'white',
                  fontSize: '14px',
                  width: '100%',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {showPassword ? (
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24m1.42 1.42L3 3m18 18l-6.86-6.86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 bg-transparent text-blue-600 focus:ring-blue-500"
            />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Remember me</span>
          </label>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Rate limit warning */}
          {cooldown > 0 && (
            <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FDE68A', textAlign: 'center' }}>
              Too many failed attempts. Please wait {cooldown}s before trying again.
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || cooldown > 0}
            style={{
              width: '100%',
              background: cooldown > 0 ? '#6B7280' : '#2563EB',
              color: 'white',
              borderRadius: '10px',
              padding: '13px',
              fontSize: '15px',
              fontWeight: 700,
              border: 'none',
              cursor: isLoading || cooldown > 0 ? 'not-allowed' : 'pointer',
              transition: 'all 200ms ease',
              opacity: isLoading ? 0.7 : 1,
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseOver={(e) => { if (!isLoading && cooldown <= 0) { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseOut={(e) => { if (!isLoading && cooldown <= 0) { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'none'; } }}
          >
            {isLoading ? (
              <>
                <span className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ margin: '24px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}></div>

        {/* Demo accounts */}
        <div style={{ padding: '12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demo Accounts</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => { setEmail('user@pantasflow.com'); setPassword('Demo@123'); }}
              disabled={isLoading}
              style={{
                flex: 1,
                fontSize: '12px',
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.8)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              SME User
            </button>
            <button
              type="button"
              onClick={() => { setEmail('admin@pantasflow.com'); setPassword('Admin@123'); }}
              disabled={isLoading}
              style={{
                flex: 1,
                fontSize: '12px',
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.8)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Admin
            </button>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: '24px' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 600, color: '#60A5FA', textDecoration: 'none' }}>Create one free</Link>
        </div>

        {/* Security footer */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
          <span>256-bit Encrypted</span>
          <span>|</span>
          <span>BNM Compliant</span>
          <span>|</span>
          <span>SSM Verified</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
