import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/auth/AuthLayout';

const Register = () => {
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    companyName: '', registrationNo: '', businessType: 'Manufacturing',
    industrySector: 'Semiconductor / Electronics', address: '', state: 'Kuala Lumpur',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleUpdate = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const nextStep = () => { clearError(); setStep(s => Math.min(s + 1, 3)); };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  // --- Password requirements ---
  const passwordRules = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One number', test: (p) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ];

  const getPasswordStrength = () => {
    const p = formData.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength();
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColors = ['#EF4444', '#F59E0B', '#EAB308', '#22C55E', '#16A34A'];

  const validateStep1 = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email format';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';

    const p = formData.password;
    if (!p) errs.password = 'Password is required';
    else {
      const failed = passwordRules.find(r => !r.test(p));
      if (failed) errs.password = failed.label;
    }

    if (p && formData.confirmPassword !== p) errs.confirmPassword = 'Passwords do not match';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.companyName.trim()) errs.companyName = 'Company name is required';
    if (!formData.registrationNo.trim()) errs.registrationNo = 'Registration number is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!termsAccepted) return;
    try {
      await register({
        email: formData.email,
        password: formData.password,
        phone_number: formData.phone,
        companyName: formData.companyName,
        registrationNo: formData.registrationNo,
        businessType: formData.businessType,
      });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2500);
    } catch (err) {
      // Error handled in context
    }
  };

  const renderProgress = () => {
    const steps = ['Account', 'Company', 'Review'];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '36px' }}>
        {steps.map((label, idx) => {
          const s = idx + 1;
          const isCompleted = s < step;
          const isActive = s === step;
          return (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center relative">
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCompleted ? '#16A34A' : isActive ? '#2563EB' : 'transparent',
                  color: (isCompleted || isActive) ? 'white' : 'rgba(255,255,255,0.3)',
                  border: `2px solid ${isCompleted ? '#16A34A' : isActive ? '#2563EB' : 'rgba(255,255,255,0.15)'}`,
                  zIndex: 2,
                  transition: 'all 0.3s ease',
                }}>
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : s}
                </div>
                <div style={{ position: 'absolute', top: '40px', fontSize: '11px', fontWeight: isActive ? 600 : 400, color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {s < steps.length && (
                <div style={{ flex: 1, height: '2px', minWidth: '40px', background: isCompleted ? '#16A34A' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // --- Success screen ---
  if (isSuccess) {
    return (
      <AuthLayout width="480px">
        <div className="flex flex-col items-center justify-center py-10 w-full">
          <div className="auth-success-icon" style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Account Created!</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px' }}>Welcome to OUT&IN, {formData.fullName.split(' ')[0]}!</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '32px' }}>Redirecting you to your dashboard...</p>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #16A34A, #22C55E)', width: '100%', animation: 'progress 2.5s linear' }}></div>
            <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const renderFieldError = (field) => {
    if (!fieldErrors[field]) return null;
    return <p style={{ fontSize: '12px', color: '#FCA5A5', marginTop: '4px' }}>{fieldErrors[field]}</p>;
  };

  return (
    <AuthLayout width="520px">
      {/* Logo */}
      <div className="auth-card-delay-1 flex items-center gap-3" style={{ marginBottom: '4px' }}>
        <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.01em' }}>OUT&IN</span>
      </div>

      {renderProgress()}

      <form onSubmit={(e) => e.preventDefault()}>
        {/* ===== STEP 1: Account ===== */}
        {step === 1 && (
          <div key="step1" className="auth-step-enter flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Full Name</label>
              <input
                type="text"
                className={`auth-input ${fieldErrors.fullName ? 'auth-input-error' : ''}`}
                value={formData.fullName}
                onChange={e => handleUpdate('fullName', e.target.value)}
                placeholder="Ahmad bin Ismail"
                autoFocus
              />
              {renderFieldError('fullName')}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Email Address</label>
              <input
                type="email"
                className={`auth-input ${fieldErrors.email ? 'auth-input-error' : ''}`}
                value={formData.email}
                onChange={e => handleUpdate('email', e.target.value)}
                placeholder="you@company.com"
              />
              {renderFieldError('email')}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Phone Number</label>
              <input
                type="text"
                className={`auth-input ${fieldErrors.phone ? 'auth-input-error' : ''}`}
                value={formData.phone}
                onChange={e => handleUpdate('phone', e.target.value)}
                placeholder="+60XXXXXXXX"
              />
              {renderFieldError('phone')}
            </div>

            <div className="relative">
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input ${fieldErrors.password ? 'auth-input-error' : ''}`}
                  style={{ paddingRight: '40px' }}
                  value={formData.password}
                  onChange={e => handleUpdate('password', e.target.value)}
                  placeholder="Min. 8 characters"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300" aria-label="Toggle password visibility">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showPassword
                      ? <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      : <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    }
                  </svg>
                </button>
              </div>
              {renderFieldError('password')}

              {/* Live password checklist */}
              {formData.password && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(formData.password);
                    return (
                      <div key={rule.label} className="flex items-center gap-2" style={{ transition: 'all 0.2s' }}>
                        <div style={{
                          width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: passed ? '#16A34A' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${passed ? '#16A34A' : 'rgba(255,255,255,0.15)'}`,
                          transition: 'all 0.2s',
                        }}>
                          {passed && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', color: passed ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', transition: 'color 0.2s' }}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                  {/* Strength bar */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex gap-1 flex-1 h-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex-1 rounded-full" style={{
                          background: i <= strengthScore ? strengthColors[strengthScore] : 'rgba(255,255,255,0.08)',
                          transition: 'background 0.2s',
                        }}></div>
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: strengthColors[strengthScore], transition: 'color 0.2s' }}>
                      {strengthLabels[strengthScore]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Confirm Password</label>
              <input
                type="password"
                className={`auth-input ${fieldErrors.confirmPassword ? 'auth-input-error' : ''}`}
                value={formData.confirmPassword}
                onChange={e => handleUpdate('confirmPassword', e.target.value)}
                placeholder="Re-enter your password"
              />
              {renderFieldError('confirmPassword')}
            </div>

            <button
              type="button"
              onClick={() => { if (validateStep1()) nextStep(); }}
              className="w-full py-3 mt-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* ===== STEP 2: Company ===== */}
        {step === 2 && (
          <div key="step2" className="auth-step-enter flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Company Name</label>
              <input
                type="text"
                className={`auth-input ${fieldErrors.companyName ? 'auth-input-error' : ''}`}
                value={formData.companyName}
                onChange={e => handleUpdate('companyName', e.target.value)}
                placeholder="Your Sdn. Bhd. name"
                autoFocus
              />
              {renderFieldError('companyName')}
            </div>

            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">SSM Registration Number</label>
              <input
                type="text"
                className={`auth-input ${fieldErrors.registrationNo ? 'auth-input-error' : ''}`}
                value={formData.registrationNo}
                onChange={e => handleUpdate('registrationNo', e.target.value)}
                placeholder="e.g. 202201184392"
              />
              {renderFieldError('registrationNo')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Business Type</label>
                <select className="auth-input" value={formData.businessType} onChange={e => handleUpdate('businessType', e.target.value)}>
                  {['Manufacturing', 'Technology', 'Trading', 'Services', 'Agriculture', 'Construction', 'Logistics', 'Other'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Industry Sector</label>
                <select className="auth-input" value={formData.industrySector} onChange={e => handleUpdate('industrySector', e.target.value)}>
                  {['Semiconductor / Electronics', 'Aerospace', 'Automotive', 'Food & Beverage', 'Retail', 'Logistics', 'Other'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">Company Address</label>
              <textarea
                rows="2"
                className="auth-input"
                value={formData.address}
                onChange={e => handleUpdate('address', e.target.value)}
                placeholder="Street, city, postcode"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-white/70 mb-1.5">State</label>
              <select className="auth-input" value={formData.state} onChange={e => handleUpdate('state', e.target.value)}>
                {['Johor', 'Kedah', 'Kelantan', 'Malacca', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <div className="flex gap-3 mt-2">
              <button type="button" onClick={prevStep} className="w-1/3 py-3 rounded-xl font-semibold text-white bg-transparent border border-white/20 hover:bg-white/5 transition-all">Back</button>
              <button
                type="button"
                onClick={() => { if (validateStep2()) nextStep(); }}
                className="w-2/3 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Review & Confirm ===== */}
        {step === 3 && (
          <div key="step3" className="auth-step-enter flex flex-col gap-4">
            {/* Account section */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <h4 style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>Account Details</h4>
                </div>
                <button type="button" onClick={() => setStep(1)} style={{ fontSize: '11px', color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
              </div>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between"><span className="text-white/50">Name</span><span className="text-white">{formData.fullName}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Email</span><span className="text-white">{formData.email}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Phone</span><span className="text-white">{formData.phone}</span></div>
              </div>
            </div>

            {/* Company section */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
                  </div>
                  <h4 style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>Company Details</h4>
                </div>
                <button type="button" onClick={() => setStep(2)} style={{ fontSize: '11px', color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
              </div>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between"><span className="text-white/50">Company</span><span className="text-white">{formData.companyName}</span></div>
                <div className="flex justify-between"><span className="text-white/50">SSM No.</span><span className="text-white">{formData.registrationNo}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Type / Sector</span><span className="text-white">{formData.businessType} / {formData.industrySector}</span></div>
                {formData.state && (
                  <div className="flex justify-between"><span className="text-white/50">State</span><span className="text-white">{formData.state}</span></div>
                )}
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 mt-1 cursor-pointer group">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 bg-transparent text-blue-600 focus:ring-blue-600"
              />
              <span className="text-[13px] text-white/60 group-hover:text-white/80 transition-colors">
                I agree to OUT&IN's <span style={{ color: '#60A5FA' }}>Terms of Service</span> and <span style={{ color: '#60A5FA' }}>Privacy Policy</span>
              </span>
            </label>

            {error && (
              <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FCA5A5' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button type="button" onClick={prevStep} disabled={isLoading} className="w-1/3 py-3 rounded-xl font-semibold text-white bg-transparent border border-white/20 hover:bg-white/5 disabled:opacity-50 transition-all">Back</button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={isLoading || !termsAccepted}
                className="w-2/3 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: termsAccepted ? '#16A34A' : 'rgba(255,255,255,0.08)' }}
              >
                {isLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Creating...</>
                ) : 'Create My Account'}
              </button>
            </div>
          </div>
        )}
      </form>

      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: '24px' }}>
        Already have an account? <Link to="/login" style={{ fontWeight: 600, color: '#60A5FA', textDecoration: 'none' }}>Sign in</Link>
      </div>
    </AuthLayout>
  );
};

export default Register;
