import React, { useState } from 'react';
import { Loader2, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../components/ToastContext';
import type { UserCategory } from '../types/edna';

interface ProfilePageProps {
  navigate: (path: string) => void;
}

const CATEGORIES: UserCategory[] = [
  'Student',
  'Research Scholar',
  'Environmental Scientist',
  'Researcher',
  'General User',
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ navigate }) => {
  const {
    firebaseUser,
    profile,
    theme,
    setTheme,
    updateUserProfile,
    changeUserPassword,
    logout,
  } = useAuth();
  const { activityLogs } = useData();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [researchInterest, setResearchInterest] = useState(profile?.researchInterest || '');
  const [userCategory, setUserCategory] = useState<UserCategory>(profile?.userCategory || 'Researcher');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notificationsEnabled ?? true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const isPasswordAccount = firebaseUser?.providerData.some((p) => p.providerId === 'password');
  const createdTs = (profile?.createdAt as { seconds?: number } | undefined)?.seconds;
  const createdDisplay = createdTs
    ? new Date(createdTs * 1000).toLocaleDateString()
    : 'Recently created';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      await updateUserProfile({
        fullName,
        institution,
        country,
        researchInterest,
        userCategory,
        photoUrl,
        notificationsEnabled,
      });
      showToast('Profile saved', 'Your researcher profile has been updated.', 'success');
    } catch (err) {
      showToast('Update failed', err instanceof Error ? err.message : 'Unable to save profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changingPw) return;
    if (newPassword.length < 8) {
      showToast('Weak password', 'New password must be at least 8 characters.', 'error');
      return;
    }
    setChangingPw(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password updated', 'Your password was changed successfully.', 'success');
    } catch (err) {
      showToast('Password update failed', err instanceof Error ? err.message : 'Verify your current password.', 'error');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header & Edit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            {profile?.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.fullName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-emerald-900"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#DCFCE7] dark:bg-[#14532D] text-[#14532D] dark:text-[#DCFCE7] flex items-center justify-center text-xl font-bold">
                {(profile?.fullName || 'R').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-[#102A43] dark:text-white">
                {profile?.fullName || 'Researcher'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {profile?.email} · Joined {createdDisplay}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">User Category</label>
                <select
                  value={userCategory}
                  onChange={(e) => setUserCategory(e.target.value as UserCategory)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Institution / University</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Research Interest</label>
              <input
                type="text"
                value={researchInterest}
                onChange={(e) => setResearchInterest(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Profile Picture URL</label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="rounded border-slate-300 text-[#16A34A]"
              />
              Receive dataset upload & analysis completion notifications
            </label>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Profile Changes
            </button>
          </form>
        </section>

        {/* Preferences & Security */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#102A43] dark:text-white">
              Appearance & Session
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-2 ${
                  theme === 'light'
                    ? 'border-[#16A34A] bg-[#DCFCE7] text-[#14532D]'
                    : 'border-slate-200 dark:border-emerald-900'
                }`}
              >
                <Sun className="w-4 h-4" />
                Light Mode
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-xs font-semibold inline-flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'border-[#16A34A] bg-[#14532D] text-white'
                    : 'border-slate-200 dark:border-emerald-900'
                }`}
              >
                <Moon className="w-4 h-4" />
                Dark Mode
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="w-full py-2.5 px-4 text-xs font-semibold border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg inline-flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>

          {isPasswordAccount && (
            <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
              <h3 className="text-base font-bold text-[#102A43] dark:text-white mb-4">
                Change Password
              </h3>
              <form onSubmit={handlePasswordUpdate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={changingPw}
                  className="w-full py-2.5 text-xs font-semibold bg-[#102A43] hover:bg-[#14532D] text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {changingPw ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>

      {/* Account Activity */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
        <h3 className="text-base font-bold text-[#102A43] dark:text-white mb-4">
          Account Activity Log ({activityLogs.length})
        </h3>
        {activityLogs.length === 0 ? (
          <p className="text-xs text-slate-500">No recorded account events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-emerald-950 text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Action</th>
                  <th className="py-2 px-3 font-semibold">Details</th>
                  <th className="py-2 pl-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                {activityLogs.slice(0, 20).map((log) => {
                  const sec = (log.createdAt as { seconds?: number } | undefined)?.seconds;
                  return (
                    <tr key={log.logId}>
                      <td className="py-2.5 pr-4 font-mono font-semibold text-[#14532D] dark:text-[#4ADE80]">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{log.details}</td>
                      <td className="py-2.5 pl-3 text-right font-mono text-slate-500">
                        {sec ? new Date(sec * 1000).toLocaleString() : 'Just now'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
