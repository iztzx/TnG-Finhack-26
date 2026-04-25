import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { forgotPassword, resetPassword } from '../lib/api';
import AuthLayout from '../components/auth/AuthLayout';

const DEMO_SME = { email: 'user@outandin.com', password: 'Demo@123' };
const DEMO_ADMIN = { email: 'admin@outandin.com', password: 'Admin@123' };

const Login = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('pf_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('pf_remember_email'));
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [resetData, setResetData] = useState(null); // { resetToken, tempPassword }
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

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

  const fillDemo = (creds) => {
    setEmail(creds.email);
    setPassword(creds.password);
    clearError();
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      const data = await forgotPassword(forgotEmail);
      if (data.resetToken) {
        setResetData({ resetToken: data.resetToken, tempPassword: data.tempPassword });
      } else {
        setForgotError('If an account exists, a reset code has been sent.');
      }
    } catch (err) {
      setForgotError(err.friendlyMessage || 'Failed to request password reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    try {
      await resetPassword(forgotEmail, resetData.resetToken, newPassword);
      setResetSuccess(true);
    } catch (err) {
      setResetError(err.friendlyMessage || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Logo + brand */}
      <div className="auth-card-delay-1 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.01em' }}>OUT&IN</span>
      </div>

      <h2 className="auth-card-delay-1" style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginTop: '28px', marginBottom: '6px' }}>
        Welcome back
      </h2>
      <p className="auth-card-delay-2" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>
        Sign in to your SME financing account
      </p>

      {/* Session expired banner */}
      {sessionExpired && (
        <div className="auth-card-delay-2" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FDE68A', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Your session has expired. Please sign in again.
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-card-delay-2 flex flex-col gap-5">
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
            className="auth-input"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5 relative">
          <div className="flex items-center justify-between">
            <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
              Password
            </label>
            <span
              onClick={() => { setShowForgot(true); setForgotEmail(email); }}
              style={{ fontSize: '12px', color: '#60A5FA', cursor: 'pointer' }}
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
              className="auth-input"
              style={{ paddingRight: '40px' }}
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
          onMouseOver={(e) => { if (!isLoading && cooldown <= 0) { e.currentTarget.style.background = '#1D4ED8'; } }}
          onMouseOut={(e) => { if (!isLoading && cooldown <= 0) { e.currentTarget.style.background = '#2563EB'; } }}
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
      <div className="auth-card-delay-3" style={{ margin: '24px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}></div>

      {/* Demo accounts - refined */}
      <div className="auth-card-delay-3" style={{ padding: '14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>Quick Demo</p>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>Pre-filled</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => fillDemo(DEMO_SME)}
            disabled={isLoading}
            style={{
              flex: 1,
              fontSize: '12px',
              padding: '10px 12px',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.85)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }}></span>
            SME User
          </button>
          <button
            type="button"
            onClick={() => fillDemo(DEMO_ADMIN)}
            disabled={isLoading}
            style={{
              flex: 1,
              fontSize: '12px',
              padding: '10px 12px',
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.85)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A855F7', flexShrink: 0 }}></span>
            Admin
          </button>
        </div>
      </div>

      <div className="auth-card-delay-3" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: '24px' }}>
        Don't have an account? <Link to="/register" style={{ fontWeight: 600, color: '#60A5FA', textDecoration: 'none' }}>Create one free</Link>
      </div>

      {/* Security footer */}
      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          256-bit Encrypted
        </div>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
        <span>BNM Compliant</span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
        <span>SSM Verified</span>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px', margin: '16px' }}>
            {!resetData && !resetSuccess && (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Reset Your Password</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>Enter your email and we'll generate a secure temporary password for you.</p>
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="auth-input"
                  />
                  {forgotError && <p style={{ fontSize: '12px', color: '#FCA5A5' }}>{forgotError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" disabled={forgotLoading} style={{ flex: 1, padding: '10px', background: '#2563EB', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: forgotLoading ? 'not-allowed' : 'pointer' }}>
                      {forgotLoading ? 'Generating...' : 'Generate Reset Code'}
                    </button>
                    <button type="button" onClick={() => { setShowForgot(false); setResetData(null); setResetSuccess(false); setForgotError(''); }} style={{ padding: '10px 16px', background: 'transparent', color: 'rgba(255,255,255,0.5)', borderRadius: '8px', fontSize: '14px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}

            {resetData && !resetSuccess && (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Set New Password</h3>
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Your temporary password (auto-generated):</p>
                  <p style={{ fontSize: '16px', fontFamily: 'monospace', color: '#4ADE80', fontWeight: 700, letterSpacing: '0.5px' }}>{resetData.tempPassword}</p>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>Set a new password below. Must be 8+ chars with uppercase, lowercase, digit, and special character.</p>
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="auth-input"
                  />
                  {resetError && <p style={{ fontSize: '12px', color: '#FCA5A5' }}>{resetError}</p>}
                  <button type="submit" disabled={resetLoading} style={{ width: '100%', padding: '10px', background: '#16A34A', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: resetLoading ? 'not-allowed' : 'pointer' }}>
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </>
            )}

            {resetSuccess && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Password Reset!</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>You can now sign in with your new password.</p>
                <button
                  onClick={() => { setShowForgot(false); setResetData(null); setResetSuccess(false); setPassword(''); setEmail(forgotEmail); }}
                  style={{ width: '100%', padding: '10px', background: '#2563EB', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default Login;
