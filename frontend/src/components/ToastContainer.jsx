import { useState, useEffect, useCallback } from 'react';
import { subscribeToToasts } from '../lib/api';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToToasts(addToast);
    return unsubscribe;
  }, [addToast]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  const iconMap = {
    error: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    info: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  };

  const colorMap = {
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#FCA5A5', icon: '#EF4444' },
    success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', text: '#86EFAC', icon: '#22C55E' },
    info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', text: '#93C5FD', icon: '#3B82F6' },
  };

  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '380px' }}>
      {toasts.map((toast) => {
        const colors = colorMap[toast.type] || colorMap.info;
        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              animation: 'toast-slide-in 0.3s ease-out',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span style={{ color: colors.icon, flexShrink: 0 }}>{iconMap[toast.type] || iconMap.info}</span>
            <span style={{ fontSize: '13px', color: colors.text, lineHeight: '1.4' }}>{toast.message}</span>
            <style>{`@keyframes toast-slide-in { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
          </div>
        );
      })}
    </div>
  );
}
