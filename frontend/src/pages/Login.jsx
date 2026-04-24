import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetMsg, setShowResetMsg] = useState(false);
  
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const role = await login(email, password);
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      // Error is handled in context
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
          backdropFilter: 'blur(20px)' 
        }}
      >
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

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
              Email address
            </label>
            <input 
              type="email" 
              required
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
                transition: 'all 0.2s'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <div className="flex items-center justify-between">
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                Password
              </label>
              <span 
                onClick={() => setShowResetMsg(true)}
                style={{ fontSize: '12px', color: '#60A5FA', cursor: 'pointer' }}
              >
                Forgot password?
              </span>
            </div>
            
            {showResetMsg && (
              <div style={{ fontSize: '12px', color: '#FCA5A5', marginBottom: '4px' }}>
                Contact admin@pantasflow.com to reset your password.
              </div>
            )}
            
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
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

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              width: '100%', 
              background: '#2563EB', 
              color: 'white', 
              borderRadius: '10px', 
              padding: '13px', 
              fontSize: '15px', 
              fontWeight: 700, 
              border: 'none', 
              cursor: isLoading ? 'not-allowed' : 'pointer', 
              transition: 'all 200ms ease',
              opacity: isLoading ? 0.7 : 1,
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => { if(!isLoading) { e.currentTarget.style.background = '#1D4ED8'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseOut={(e) => { if(!isLoading) { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.transform = 'none'; } }}
          >
            {isLoading ? (
              <>
                <span className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Signing in...
              </>
            ) : "Sign In"}
          </button>
        </form>

        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: '32px' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 600, color: '#60A5FA', textDecoration: 'none' }}>Create one free →</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
