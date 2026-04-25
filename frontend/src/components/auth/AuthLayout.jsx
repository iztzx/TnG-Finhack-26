import React from 'react';

/**
 * Shared layout wrapper for Login / Register auth pages.
 * Provides the dark gradient background, centered glass-morphism card,
 * and staggered entrance animations.
 */
const AuthLayout = ({ children, width = '420px' }) => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg, #0B0F1A 0%, #0F2A5C 50%, #0B0F1A 100%)' }}
  >
    <div
      className="auth-card relative z-10 flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '40px',
        width,
        backdropFilter: 'blur(20px)',
      }}
    >
      {children}
    </div>
  </div>
);

export default AuthLayout;
