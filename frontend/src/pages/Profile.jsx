import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { changePassword, updateUserProfile } from '../lib/api';
import { User, Building2, Mail, Phone, Shield, Wallet, CreditCard, Clock, ChevronRight, Key, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { userProfile, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    companyName: '',
    registrationNo: '',
    businessType: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (userProfile) {
      setEditForm({
        companyName: userProfile?.companyName ?? '',
        registrationNo: userProfile?.registrationNo ?? '',
        businessType: userProfile?.businessType ?? '',
        phoneNumber: userProfile?.phoneNumber ?? '',
      });
    }
  }, [userProfile]);

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      await updateUserProfile(editForm);
      updateProfile(editForm);
      setIsEditing(false);
    } catch (err) {
      setEditError(err.friendlyMessage || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  if (!userProfile) return null;

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setPwError(err.friendlyMessage || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" /> Company Details
            </h2>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="text-xs font-medium text-tng-blue hover:underline">
                Edit
              </button>
            )}
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {[
              { label: 'Company Name', field: 'companyName', value: userProfile?.companyName ?? '—' },
              { label: 'Registration No.', field: 'registrationNo', value: userProfile?.registrationNo ?? '—' },
              { label: 'Business Type', field: 'businessType', value: userProfile?.businessType ?? '—' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-slate-500">{row.label}</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm[row.field] ?? ''}
                    onChange={(e) => handleEditChange(row.field, e.target.value)}
                    className="flex-1 min-w-0 ml-4 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
                  />
                ) : (
                  <span className="text-slate-900 font-medium truncate ml-4 text-right">{row.value}</span>
                )}
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
              { label: 'Email', value: userProfile?.email ?? '—', editable: false },
              { label: 'Phone', field: 'phoneNumber', value: userProfile?.phoneNumber ?? '—', editable: true },
              { label: 'Last Login', value: userProfile?.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleString() : 'First time', editable: false },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-slate-500">{row.label}</span>
                {isEditing && row.editable ? (
                  <input
                    type="text"
                    value={editForm[row.field] ?? ''}
                    onChange={(e) => handleEditChange(row.field, e.target.value)}
                    className="flex-1 min-w-0 ml-4 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
                  />
                ) : (
                  <span className="text-slate-900 font-medium truncate ml-4 text-right">{row.value}</span>
                )}
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
              { label: 'Wallet Balance', value: `RM ${(userProfile?.walletBalance ?? 0).toLocaleString()}`, highlight: true },
              { label: 'Credit Limit', value: `RM ${(userProfile?.creditLimit ?? 0).toLocaleString()}` },
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
              <span className={`font-medium ${userProfile?.kycStatus === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>{userProfile?.kycStatus ?? 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Risk Tier</span>
              <span className="font-medium text-slate-900">{userProfile?.riskTier ?? 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Password</span>
              <button
                onClick={() => { setShowChangePw(!showChangePw); setPwSuccess(false); setPwError(''); }}
                className="font-medium text-tng-blue hover:underline text-xs flex items-center gap-1"
              >
                <Key className="w-3 h-3" />
                Change
              </button>
            </div>
            {showChangePw && !pwSuccess && (
              <form onSubmit={handleChangePassword} className="mt-3 space-y-2">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Current password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
                />
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="New password (8+ chars, upper, lower, digit, special)"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tng-blue/20 pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tng-blue/20"
                />
                {pwError && <p className="text-xs text-red-600">{pwError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={pwLoading} className="flex-1 px-3 py-2 bg-tng-blue text-white rounded-lg text-xs font-semibold hover:bg-tng-blue-dark transition-colors disabled:opacity-50">
                    {pwLoading ? 'Changing...' : 'Update Password'}
                  </button>
                  <button type="button" onClick={() => { setShowChangePw(false); setPwError(''); }} className="px-3 py-2 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {pwSuccess && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-xs text-green-700 font-medium">Password changed successfully!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="flex items-center justify-end gap-3">
          {editError && <p className="text-xs text-red-600">{editError}</p>}
          <button
            onClick={() => { setIsEditing(false); setEditError(''); }}
            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={editLoading}
            className="px-4 py-2 bg-tng-blue text-white rounded-xl text-sm font-semibold hover:bg-tng-blue-dark transition-colors disabled:opacity-50"
          >
            {editLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

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
