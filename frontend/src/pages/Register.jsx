import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    companyName: '', registrationNo: '', businessType: 'Manufacturing',
    industrySector: 'Semiconductor / Electronics', address: '', state: 'Kuala Lumpur',
    ssmDoc: null, icDoc: null, bankDoc: null
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleUpdate = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    clearError();
    setStep(s => Math.min(s + 1, 4));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const validateStep1 = () => {
    const p = formData.password;
    const strong = p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
    return formData.fullName && formData.email && formData.phone && strong && p === formData.confirmPassword;
  };

  const validateStep2 = () => {
    return formData.companyName && formData.registrationNo && formData.address;
  };

  const handleRegister = async () => {
    try {
      await register({
        email: formData.email,
        password: formData.password,
        phone_number: formData.phone,
        companyName: formData.companyName,
        registrationNo: formData.registrationNo,
        businessType: formData.businessType
      });
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2000);
    } catch (err) {
      // Error handled in context
    }
  };

  const getPasswordStrength = () => {
    const p = formData.password;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0 to 4
  };

  const strengthScore = getPasswordStrength();
  const strengthLabels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = ["#EF4444", "#F59E0B", "#EAB308", "#22C55E", "#16A34A"];

  const renderProgress = () => {
    const steps = ["Account", "Company", "KYC", "Confirm"];
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '32px' }}>
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
                  zIndex: 2
                }}>
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : s}
                </div>
                <div style={{ position: 'absolute', top: '38px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{label}</div>
              </div>
              {s < steps.length && (
                <div style={{ flex: 1, height: '2px', minWidth: '40px', background: isCompleted ? '#16A34A' : 'rgba(255,255,255,0.1)' }}></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0B0F1A 0%, #0F2A5C 50%, #0B0F1A 100%)' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px', width: '520px', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'col', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div className="flex flex-col items-center justify-center py-10 w-full animate-[scale-in_0.5s_ease-out]">
            <style>{`@keyframes scale-in { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ color: 'white', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Account Created!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>Redirecting you to your dashboard...</p>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#16A34A', width: '100%', transition: 'width 2s linear', animation: 'progress 2s linear' }}></div>
              <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '12px 14px', color: 'white', fontSize: '14px', width: '100%', outline: 'none'
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-10" style={{ background: 'linear-gradient(135deg, #0B0F1A 0%, #0F2A5C 50%, #0B0F1A 100%)' }}>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px', width: '520px', backdropFilter: 'blur(20px)' }}>
        {renderProgress()}

        <form onSubmit={(e) => e.preventDefault()} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (step === 1 && validateStep1()) nextStep(); else if (step === 2 && validateStep2()) nextStep(); else if (step === 3) nextStep(); else if (step === 4) handleRegister(); } }}>
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Full Name</label>
                <input type="text" style={inputStyle} value={formData.fullName} onChange={e => handleUpdate('fullName', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Email Address</label>
                <input type="email" style={inputStyle} value={formData.email} onChange={e => handleUpdate('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Phone Number (+60XXXXXXXX)</label>
                <input type="text" style={inputStyle} value={formData.phone} onChange={e => handleUpdate('phone', e.target.value)} />
              </div>
              <div className="relative">
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} style={{...inputStyle, paddingRight: '40px'}} value={formData.password} onChange={e => handleUpdate('password', e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">👁</button>
                </div>
                {formData.password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1 h-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`flex-1 rounded-full ${i <= strengthScore ? '' : 'bg-white/10'}`} style={{ backgroundColor: i <= strengthScore ? strengthColors[strengthScore] : undefined }}></div>
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: strengthColors[strengthScore] }}>{strengthLabels[strengthScore]}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Confirm Password</label>
                <input type="password" style={inputStyle} value={formData.confirmPassword} onChange={e => handleUpdate('confirmPassword', e.target.value)} />
              </div>
              <button type="button" disabled={!validateStep1()} onClick={nextStep} className={`w-full py-3 mt-4 rounded-xl font-bold text-white transition-all ${validateStep1() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/50 cursor-not-allowed'}`}>Next →</button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Company Name</label>
                <input type="text" style={inputStyle} value={formData.companyName} onChange={e => handleUpdate('companyName', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">SSM Registration Number (e.g. 202301012345)</label>
                <input type="text" style={inputStyle} value={formData.registrationNo} onChange={e => handleUpdate('registrationNo', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-white/70 mb-1.5">Business Type</label>
                  <select style={inputStyle} value={formData.businessType} onChange={e => handleUpdate('businessType', e.target.value)}>
                    {["Manufacturing", "Technology", "Trading", "Services", "Agriculture", "Construction", "Other"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-white/70 mb-1.5">Industry Sector</label>
                  <select style={inputStyle} value={formData.industrySector} onChange={e => handleUpdate('industrySector', e.target.value)}>
                    {["Semiconductor / Electronics", "Aerospace", "Automotive", "Food & Beverage", "Retail", "Logistics", "Other"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">Company Address</label>
                <textarea rows="3" style={inputStyle} value={formData.address} onChange={e => handleUpdate('address', e.target.value)} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-white/70 mb-1.5">State</label>
                <select style={inputStyle} value={formData.state} onChange={e => handleUpdate('state', e.target.value)}>
                  {["Johor", "Kedah", "Kelantan", "Malacca", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Sabah", "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={prevStep} className="w-1/3 py-3 rounded-xl font-semibold text-white bg-transparent border border-white/20 hover:bg-white/5">← Back</button>
                <button type="button" disabled={!validateStep2()} onClick={nextStep} className={`w-2/3 py-3 rounded-xl font-bold text-white transition-all ${validateStep2() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600/50 cursor-not-allowed'}`}>Next →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-white/60 mb-2 leading-relaxed">
                We are required by Bank Negara Malaysia (BNM) to verify your identity and business registration. Your documents are encrypted and stored securely on AWS S3.
              </p>
              
              {[
                { id: 'ssmDoc', label: 'SSM Certificate', sub: 'PDF, JPG, PNG' },
                { id: 'icDoc', label: 'Director IC / MyKad (Front)', sub: 'JPG, PNG' },
                { id: 'bankDoc', label: 'Latest 3-Month Bank Statement', sub: 'PDF' }
              ].map(doc => {
                const isSelected = !!formData[doc.id];
                return (
                  <label key={doc.id} className="block cursor-pointer" style={{ background: isSelected ? 'rgba(22,163,74,0.05)' : 'rgba(255,255,255,0.03)', border: `1px dashed ${isSelected ? '#16A34A' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '20px', transition: 'all 200ms' }}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-green-600/20 text-green-500' : 'bg-blue-600/20 text-blue-400'}`}>
                        {isSelected ? '✓' : '↑'}
                      </div>
                      <div>
                        <div className={`text-[14px] font-medium ${isSelected ? 'text-green-500' : 'text-white'}`}>{isSelected ? formData[doc.id].name : `Upload ${doc.label}`}</div>
                        <div className="text-[12px] text-white/40">{isSelected ? 'Ready for upload' : doc.sub}</div>
                      </div>
                    </div>
                    <input type="file" style={{ display: 'none' }} onChange={(e) => handleUpdate(doc.id, e.target.files[0])} />
                  </label>
                )
              })}

              <div className="text-center mt-2">
                <button type="button" onClick={nextStep} className="text-[12px] text-blue-400 hover:text-blue-300 underline">Skip for now (Demo Mode)</button>
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={prevStep} className="w-1/3 py-3 rounded-xl font-semibold text-white bg-transparent border border-white/20 hover:bg-white/5">← Back</button>
                <button type="button" onClick={nextStep} className="w-2/3 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">Next →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px' }}>
                <h3 className="text-white font-medium mb-4">Review Details</h3>
                <div className="flex flex-col gap-3 text-[13px]">
                  <div className="flex justify-between"><span className="text-white/50">Full Name</span><span className="text-white">{formData.fullName}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Email</span><span className="text-white">{formData.email}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Company</span><span className="text-white">{formData.companyName}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Registration No.</span><span className="text-white">{formData.registrationNo}</span></div>
                  <div className="flex justify-between"><span className="text-white/50">Type</span><span className="text-white">{formData.businessType}</span></div>
                </div>
              </div>

              <label className="flex items-start gap-3 mt-2 cursor-pointer group">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-300 bg-transparent text-blue-600 focus:ring-blue-600" required />
                <span className="text-[13px] text-white/60 group-hover:text-white/80 transition-colors">I agree to PantasFlow's Terms of Service and Privacy Policy</span>
              </label>

              {error && (
                <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={prevStep} disabled={isLoading} className="w-1/3 py-3 rounded-xl font-semibold text-white bg-transparent border border-white/20 hover:bg-white/5 disabled:opacity-50">← Back</button>
                <button type="button" onClick={handleRegister} disabled={isLoading} className="w-2/3 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  {isLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Creating...</> : "Create My Account"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Register;
