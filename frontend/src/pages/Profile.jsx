import { useAuth } from '../context/AuthContext';
import { User, Building2, Mail, Phone, Shield, Wallet, CreditCard, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  if (!userProfile) return null;

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = (userProfile.companyName || userProfile.email || 'U')
    .split(/[\s@]+/)[0]
    .substring(0, 2)
    .toUpperCase();

  const kycColor = userProfile.kycStatus === 'VERIFIED'
    ? 'bg-emerald-50 text-emerald-700'
    : userProfile.kycStatus === 'PENDING'
    ? 'bg-amber-50 text-amber-700'
    : 'bg-red-50 text-red-700';

  const riskColor = userProfile.riskTier === 'LOW'
    ? 'bg-emerald-50 text-emerald-700'
    : userProfile.riskTier === 'MEDIUM'
    ? 'bg-amber-50 text-amber-700'
    : 'bg-red-50 text-red-700';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Card */}
      <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-tng-blue to-[#2a74c8] text-white text-xl font-bold shadow-lg shadow-blue-950/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-slate-900 truncate">
              {userProfile.companyName || userProfile.email?.split('@')[0] || 'User'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{userProfile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${kycColor}`}>
                KYC: {userProfile.kycStatus || 'Unknown'}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${riskColor}`}>
                Risk: {userProfile.riskTier || 'N/A'}
              </span>
              {userProfile.role === 'admin' && (
                <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Company Info */}
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" /> Company Details
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              { label: 'Company Name', value: userProfile.companyName || '—' },
              { label: 'Registration No.', value: userProfile.registrationNo || '—' },
              { label: 'Business Type', value: userProfile.businessType || '—' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-slate-500">{row.label}</span>
                <span className="text-slate-900 font-medium truncate ml-4 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-400" /> Contact
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              { label: 'Email', value: userProfile.email || '—', icon: Mail },
              { label: 'Phone', value: userProfile.phoneNumber || '—', icon: Phone },
              { label: 'Last Login', value: userProfile.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleString() : 'First time', icon: Clock },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-slate-500">{row.label}</span>
                <span className="text-slate-900 font-medium truncate ml-4 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Info */}
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-400" /> Financial
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            {[
              { label: 'Wallet Balance', value: `RM ${(userProfile.walletBalance || 0).toLocaleString()}`, highlight: true },
              { label: 'Credit Limit', value: `RM ${(userProfile.creditLimit || 0).toLocaleString()}` },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-slate-500">{row.label}</span>
                <span className={`font-medium truncate ml-4 text-right ${row.highlight ? 'text-tng-blue text-base' : 'text-slate-900'}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Info */}
        <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" /> Security
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">KYC Status</span>
              <span className={`font-medium ${userProfile.kycStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>{userProfile.kycStatus || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Risk Tier</span>
              <span className="font-medium text-slate-900">{userProfile.riskTier || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Password</span>
              <span className="font-medium text-slate-400">••••••••</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Session</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your session is secured with a 24-hour JWT token.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
