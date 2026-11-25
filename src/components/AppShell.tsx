import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Dna,
  FileSpreadsheet,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  ShieldAlert,
  Sun,
  UploadCloud,
  UserCircle,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from './ToastContext';

interface AppShellProps {
  currentPath: string;
  navigate: (path: string) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/upload', label: 'Dataset Upload', icon: UploadCloud },
  { path: '/analysis', label: 'eDNA Analysis', icon: Dna },
  { path: '/taxonomy', label: 'Taxonomic ID', icon: GitBranch },
  { path: '/biodiversity', label: 'Biodiversity', icon: BarChart3 },
  { path: '/results', label: 'Results & Reports', icon: FileSpreadsheet },
  { path: '/profile', label: 'Profile & Settings', icon: UserCircle },
];

export const AppShell: React.FC<AppShellProps> = ({
  currentPath,
  navigate,
  title,
  subtitle,
  children,
}) => {
  const {
    firebaseUser,
    profile,
    theme,
    toggleTheme,
    logout,
    resendVerificationEmail,
    refreshVerificationState,
  } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [checkingVerify, setCheckingVerify] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleCheckVerify = async () => {
    setCheckingVerify(true);
    try {
      const ok = await refreshVerificationState();
      if (ok) {
        showToast('Email verified', 'Your account is now verified and active.', 'success');
      } else {
        showToast('Verification pending', 'Please click the verification link in your inbox first.', 'info');
      }
    } catch (err) {
      showToast('Verification check failed', err instanceof Error ? err.message : 'Try again.', 'error');
    } finally {
      setCheckingVerify(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      showToast('Verification email sent', `Sent to ${firebaseUser?.email}`, 'success');
    } catch (err) {
      showToast('Unable to resend', err instanceof Error ? err.message : 'Please wait before retrying.', 'error');
    }
  };

  // Email verification enforcement gate
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B1410] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-8 shadow-sm">
          <BrandLogo size={36} />
          <h1 className="text-xl font-bold text-[#102A43] dark:text-white mt-6 mb-2">
            Verify your email address
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            A verification link was sent to{' '}
            <span className="font-mono text-[#14532D] dark:text-[#4ADE80]">
              {firebaseUser.email}
            </span>
            . Confirm your email before uploading datasets or running analyses.
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={checkingVerify}
              onClick={handleCheckVerify}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${checkingVerify ? 'animate-spin' : ''}`} />
              I have verified my email
            </button>
            <button
              type="button"
              onClick={handleResend}
              className="w-full px-4 py-2.5 text-sm font-medium border border-slate-200 dark:border-emerald-900 text-[#102A43] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
            >
              Resend verification email
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Sign out and switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Deactivated account gate
  if (profile?.accountStatus === 'deactivated') {
    return (
      <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B1410] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-[#111C16] border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
            <ShieldAlert className="w-6 h-6" />
            <h1 className="text-lg font-bold">Account Deactivated</h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
            Your research account has been deactivated by an administrator. Please contact support if you believe this is an error.
          </p>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="w-full px-4 py-2.5 text-sm font-medium bg-[#102A43] text-white rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAF7] dark:bg-[#0B1410] text-[#102A43] dark:text-[#F0F7F2]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#111C16] border-r border-slate-200 dark:border-emerald-950/80 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-emerald-950/80">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] rounded-lg"
          >
            <BrandLogo size={32} />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Workspace Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#DCFCE7] text-[#14532D] dark:bg-[#14532D]/40 dark:text-[#4ADE80]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/40 hover:text-[#102A43] dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-emerald-950/80 space-y-3">
          {profile && (
            <div className="px-2">
              <p className="text-sm font-semibold text-[#102A43] dark:text-white truncate">
                {profile.fullName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {profile.userCategory} · {profile.institution}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-[#111C16] border-b border-slate-200 dark:border-emerald-950/80 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-emerald-900 text-slate-600 dark:text-slate-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#102A43] dark:text-white truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-emerald-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/50 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Toggle notifications"
              className="relative p-2 rounded-lg border border-slate-200 dark:border-emerald-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/50 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#16A34A] text-white text-[10px] font-mono font-semibold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-900 rounded-xl shadow-xl p-4 z-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#102A43] dark:text-white">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs font-medium text-[#16A34A] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                    No notifications yet. Dataset uploads and completed analyses appear here.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.slice(0, 8).map((n) => (
                      <button
                        key={n.notificationId}
                        type="button"
                        onClick={() => markNotificationRead(n.notificationId)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                          n.read
                            ? 'border-slate-100 dark:border-emerald-950/60 bg-transparent text-slate-500 dark:text-slate-400'
                            : 'border-[#DCFCE7] dark:border-emerald-900 bg-[#DCFCE7]/40 dark:bg-emerald-950/40 text-[#102A43] dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 font-semibold">
                          <span className="truncate">{n.title}</span>
                          {!n.read && <Activity className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />}
                        </div>
                        <p className="mt-0.5 line-clamp-2">{n.message}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
