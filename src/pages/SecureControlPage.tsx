import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  Database,
  Eye,
  Loader2,
  LogOut,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import { db } from '../lib/firebase';
import type {
  ActivityLogRecord,
  AnalysisRecord,
  AnalysisResultRecord,
  DatasetRecord,
  SystemHealthStatus,
  UserProfile,
} from '../types/edna';

interface SecureControlPageProps {
  navigate: (path: string) => void;
}

type AdminTab = 'overview' | 'users' | 'datasets' | 'analyses' | 'analytics' | 'settings';

interface AuditEntry {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  details: string;
  createdAt: string;
}

export const SecureControlPage: React.FC<SecureControlPageProps> = ({ navigate }) => {
  const { firebaseUser, authReady, serverRole, getIdToken, loginWithEmail, loginWithGoogle, logout } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [verifying, setVerifying] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allDatasets, setAllDatasets] = useState<DatasetRecord[]>([]);
  const [allAnalyses, setAllAnalyses] = useState<AnalysisRecord[]>([]);
  const [allResults, setAllResults] = useState<AnalysisResultRecord[]>([]);
  const [allActivityLogs, setAllActivityLogs] = useState<ActivityLogRecord[]>([]);

  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [previewDataset, setPreviewDataset] = useState<DatasetRecord | null>(null);

  // Admin gate sign-in state (never allows registration)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const loadAdminWorkspace = useCallback(async () => {
    if (!firebaseUser || !firebaseUser.emailVerified) {
      setAuthorized(false);
      setVerifying(false);
      return;
    }

    setVerifying(true);
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/admin/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        setAuthorized(false);
        setVerifying(false);
        return;
      }

      const serverData = (await resp.json()) as {
        systemHealth: SystemHealthStatus;
        auditLogs: AuditEntry[];
      };
      setSystemHealth(serverData.systemHealth);
      setAuditLogs(serverData.auditLogs || []);
      setAuthorized(true);

      setLoadingData(true);
      const [uSnap, dSnap, aSnap, rSnap, lSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'datasets')),
        getDocs(collection(db, 'analyses')),
        getDocs(collection(db, 'results')),
        getDocs(collection(db, 'activity_logs')),
      ]);

      setAllUsers(uSnap.docs.map((d) => d.data() as UserProfile));
      setAllDatasets(dSnap.docs.map((d) => d.data() as DatasetRecord));
      setAllAnalyses(aSnap.docs.map((d) => d.data() as AnalysisRecord));
      setAllResults(rSnap.docs.map((d) => d.data() as AnalysisResultRecord));
      setAllActivityLogs(lSnap.docs.map((d) => d.data() as ActivityLogRecord));
    } catch (err) {
      showToast(
        'Admin load warning',
        err instanceof Error ? err.message : 'Unable to query admin collections.',
        'error'
      );
    } finally {
      setVerifying(false);
      setLoadingData(false);
    }
  }, [firebaseUser, getIdToken, showToast]);

  useEffect(() => {
    if (authReady) {
      void loadAdminWorkspace();
    }
  }, [authReady, serverRole, loadAdminWorkspace]);

  const recordServerAudit = async (action: string, targetId: string, details: string) => {
    try {
      const token = await getIdToken();
      await fetch('/api/admin/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, targetId, details }),
      });
    } catch {
      // ignore non-critical audit error
    }
  };

  const handleToggleAccountStatus = async (target: UserProfile) => {
    const nextStatus = target.accountStatus === 'active' ? 'deactivated' : 'active';
    try {
      const token = await getIdToken();
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUid: target.uid,
          targetEmail: target.email,
          newRole: target.role,
          accountStatus: nextStatus,
        }),
      });
      await updateDoc(doc(db, 'users', target.uid), {
        accountStatus: nextStatus,
        updatedAt: serverTimestamp(),
      });
      showToast('Account status updated', `${target.email} is now ${nextStatus}.`, 'success');
      await loadAdminWorkspace();
    } catch (err) {
      showToast('Action failed', err instanceof Error ? err.message : 'Unable to update user status.', 'error');
    }
  };

  const handleToggleAdminRole = async (target: UserProfile) => {
    const nextRole = target.role === 'admin' ? 'user' : 'admin';
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUid: target.uid,
          targetEmail: target.email,
          newRole: nextRole,
          accountStatus: target.accountStatus,
        }),
      });
      if (!resp.ok) throw new Error('Server rejected role assignment');

      await updateDoc(doc(db, 'users', target.uid), {
        role: nextRole,
        updatedAt: serverTimestamp(),
      });

      if (nextRole === 'admin') {
        await setDoc(doc(db, 'admins', target.uid), {
          uid: target.uid,
          email: target.email,
          grantedBy: firebaseUser?.uid || 'admin',
          createdAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(doc(db, 'admins', target.uid));
      }

      showToast('Role updated', `${target.email} assigned role "${nextRole}".`, 'success');
      await loadAdminWorkspace();
    } catch (err) {
      showToast('Role update failed', err instanceof Error ? err.message : 'Only authorized admins can change roles.', 'error');
    }
  };

  const handleDeleteDataset = async (ds: DatasetRecord) => {
    try {
      const token = await getIdToken();
      await fetch(`/api/datasets/${ds.datasetId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storagePath: ds.storagePath }),
      });
      await deleteDoc(doc(db, 'datasets', ds.datasetId));
      await recordServerAudit('ADMIN_DELETE_DATASET', ds.datasetId, `Removed dataset ${ds.datasetName}`);
      showToast('Dataset deleted', `${ds.datasetName} removed by admin.`, 'info');
      await loadAdminWorkspace();
    } catch (err) {
      showToast('Delete failed', err instanceof Error ? err.message : 'Unable to delete dataset.', 'error');
    }
  };

  const handleRetryAnalysis = async (analysis: AnalysisRecord) => {
    try {
      await updateDoc(doc(db, 'analyses', analysis.analysisId), {
        status: 'pending',
        progress: 0,
        errorMessage: '',
        updatedAt: serverTimestamp(),
      });
      await recordServerAudit('ADMIN_RETRY_JOB', analysis.analysisId, `Queued retry for ${analysis.datasetName}`);
      showToast('Job reset to pending', `Analysis ${analysis.analysisId} queued for retry.`, 'success');
      await loadAdminWorkspace();
    } catch (err) {
      showToast('Retry failed', err instanceof Error ? err.message : 'Unable to reset job.', 'error');
    }
  };

  const overviewStats = useMemo(() => {
    const activeUsers = allUsers.filter((u) => u.accountStatus === 'active').length;
    const successfulAnalyses = allAnalyses.filter((a) => a.status === 'completed').length;
    const failedAnalyses = allAnalyses.filter((a) => a.status === 'failed').length;
    const storageBytes = allDatasets.reduce((sum, d) => sum + (d.fileSizeBytes || 0), 0);
    return {
      totalUsers: allUsers.length,
      activeUsers,
      totalDatasets: allDatasets.length,
      totalAnalyses: allAnalyses.length,
      successfulAnalyses,
      failedAnalyses,
      storageKb: (storageBytes / 1024).toFixed(1),
    };
  }, [allUsers, allDatasets, allAnalyses]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (userStatusFilter !== 'all' && u.accountStatus !== userStatusFilter) return false;
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.institution.toLowerCase().includes(q)
      );
    });
  }, [allUsers, userSearch, userStatusFilter, userRoleFilter]);

  const analyticsSeries = useMemo(() => {
    const byDate = new Map<string, { date: string; users: number; datasets: number; analyses: number }>();
    const touch = (ts: unknown, key: 'users' | 'datasets' | 'analyses') => {
      const sec = (ts as { seconds?: number } | undefined)?.seconds;
      const dateStr = sec ? new Date(sec * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const cur = byDate.get(dateStr) || { date: dateStr, users: 0, datasets: 0, analyses: 0 };
      cur[key]++;
      byDate.set(dateStr, cur);
    };
    allUsers.forEach((u) => touch(u.createdAt, 'users'));
    allDatasets.forEach((d) => touch(d.createdAt, 'datasets'));
    allAnalyses.forEach((a) => touch(a.createdAt, 'analyses'));
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [allUsers, allDatasets, allAnalyses]);

  const biodiversitySummarySeries = useMemo(() => {
    return allResults.slice(0, 10).map((r) => ({
      dataset: r.datasetName.slice(0, 14),
      richness: r.speciesRichness,
      shannon: Number(r.shannonIndex.toFixed(2)),
    }));
  }, [allResults]);

  if (!authReady || verifying) {
    return (
      <div className="min-h-screen bg-[#0B1410] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-mono">
          <Loader2 className="w-5 h-5 animate-spin text-[#4ADE80]" />
          Verifying server authorization...
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#0B1410] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111C16] border border-emerald-950 rounded-2xl p-8 space-y-5">
          <BrandLogo size={34} />
          <div>
            <h1 className="text-xl font-bold">Protected Operations Portal</h1>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with an authorized administrator credential verified on the server.
            </p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSigningIn(true);
              try {
                await loginWithEmail(adminEmail, adminPassword, false);
                await loadAdminWorkspace();
              } catch (err) {
                showToast('Authentication failed', err instanceof Error ? err.message : 'Invalid credentials.', 'error');
              } finally {
                setSigningIn(false);
              }
            }}
            className="space-y-3"
          >
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Authorized Email"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-emerald-900 bg-[#0B1410]"
            />
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-emerald-900 bg-[#0B1410]"
            />
            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-2.5 text-sm font-semibold bg-[#16A34A] hover:bg-[#14532D] rounded-lg"
            >
              {signingIn ? 'Verifying...' : 'Verify & Enter'}
            </button>
          </form>
          <button
            type="button"
            onClick={async () => {
              setSigningIn(true);
              try {
                await loginWithGoogle();
                await loadAdminWorkspace();
              } finally {
                setSigningIn(false);
              }
            }}
            className="w-full py-2.5 text-xs font-medium border border-emerald-900 rounded-lg hover:bg-emerald-950/40"
          >
            Authenticate with Google
          </button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0B1410] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111C16] border border-rose-900/60 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-lg font-bold">403 · Administrator Verification Required</h1>
          <p className="text-xs text-slate-400">
            The current session ({firebaseUser.email}) does not hold server-verified administrator privileges.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-xs font-semibold bg-[#14532D] rounded-lg"
            >
              Return to User Workspace
            </button>
            <button
              type="button"
              onClick={async () => {
                await logout();
              }}
              className="px-4 py-2 text-xs font-medium border border-slate-700 rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B1410] text-[#102A43] dark:text-[#F0F7F2]">
      {/* Admin Top Header */}
      <header className="bg-[#102A43] text-white border-b border-slate-800 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-[#4ADE80]" />
          <div>
            <p className="text-sm font-bold">eDNA Explorer · Secure Control Console</p>
            <p className="text-[11px] text-slate-300 font-mono">
              Verified Admin: {firebaseUser.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadAdminWorkspace()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded-lg inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-700 hover:bg-rose-600 rounded-lg inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Admin Logout
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-white dark:bg-[#111C16] border-b border-slate-200 dark:border-emerald-950 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-2 py-2.5">
          {(
            [
              ['overview', 'Overview'],
              ['users', 'User Management'],
              ['datasets', 'Dataset Management'],
              ['analyses', 'Analysis Management'],
              ['analytics', 'System Analytics'],
              ['settings', 'System Settings'],
            ] as Array<[AdminTab, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                tab === key
                  ? 'bg-[#14532D] text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* A. Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Registered Users', value: overviewStats.totalUsers },
                { label: 'Active Users', value: overviewStats.activeUsers },
                { label: 'Total Datasets', value: overviewStats.totalDatasets },
                { label: 'Total Analyses', value: overviewStats.totalAnalyses },
                { label: 'Successful Analyses', value: overviewStats.successfulAnalyses },
                { label: 'Failed Analyses', value: overviewStats.failedAnalyses },
              ].map((k) => (
                <div key={k.label} className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-4">
                  <p className="text-[11px] text-slate-500">{k.label}</p>
                  <p className="text-2xl font-bold font-mono tabular-nums mt-1.5">{k.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
              <h2 className="text-base font-bold mb-3">Recent Administrative Audit Events</h2>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500">No server audit events recorded in this session.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {auditLogs.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-emerald-950/60">
                      <div>
                        <span className="font-mono font-semibold text-[#16A34A] mr-2">{entry.action}</span>
                        <span className="text-slate-600 dark:text-slate-300">{entry.details}</span>
                      </div>
                      <span className="font-mono text-slate-400">{entry.createdAt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* B. User Management */}
        {tab === 'users' && (
          <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, or institution..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as 'all' | 'user' | 'admin')}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                >
                  <option value="all">Role: All</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as 'all' | 'active' | 'deactivated')}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                >
                  <option value="all">Status: All</option>
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-emerald-950 text-slate-500">
                    <th className="py-2.5 pr-3 font-semibold">Researcher</th>
                    <th className="py-2.5 px-3 font-semibold">Institution</th>
                    <th className="py-2.5 px-3 font-semibold">Category</th>
                    <th className="py-2.5 px-3 font-semibold">Role</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid}>
                      <td className="py-3 pr-3">
                        <p className="font-semibold">{u.fullName}</p>
                        <p className="text-slate-500 font-mono">{u.email}</p>
                      </td>
                      <td className="py-3 px-3">{u.institution} ({u.country})</td>
                      <td className="py-3 px-3">{u.userCategory}</td>
                      <td className="py-3 px-3 font-mono">{u.role}</td>
                      <td className="py-3 px-3 font-mono">{u.accountStatus}</td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="p-1.5 rounded-md border border-slate-200 dark:border-emerald-900"
                            title="View details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAccountStatus(u)}
                            className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-emerald-900 font-medium inline-flex items-center gap-1"
                          >
                            {u.accountStatus === 'active' ? (
                              <>
                                <UserX className="w-3 h-3 text-rose-600" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3 text-[#16A34A]" />
                                Activate
                              </>
                            )}
                          </button>
                          {u.uid !== firebaseUser.uid && (
                            <button
                              type="button"
                              onClick={() => handleToggleAdminRole(u)}
                              className="px-2.5 py-1 rounded-md bg-[#102A43] text-white font-medium"
                            >
                              {u.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedUser && (
              <div className="p-4 rounded-xl bg-[#F8FAF7] dark:bg-[#0E1913] border border-slate-200 dark:border-emerald-950 text-xs flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-sm">{selectedUser.fullName}</p>
                  <p className="text-slate-500 mt-0.5">
                    UID: {selectedUser.uid} · Research Interest: {selectedUser.researchInterest}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedUser(null)} className="text-[#16A34A] font-semibold">
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* C. Dataset Management */}
        {tab === 'datasets' && (
          <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold">All Uploaded Datasets ({allDatasets.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-emerald-950 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Dataset</th>
                    <th className="py-2 px-3 font-semibold">Owner UID</th>
                    <th className="py-2 px-3 font-semibold">Format</th>
                    <th className="py-2 px-3 font-semibold">Habitat</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 pl-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                  {allDatasets.map((ds) => (
                    <tr key={ds.datasetId}>
                      <td className="py-2.5 pr-3 font-semibold">{ds.datasetName}</td>
                      <td className="py-2.5 px-3 font-mono">{ds.userId.slice(0, 12)}…</td>
                      <td className="py-2.5 px-3 font-mono">{ds.fileFormat}</td>
                      <td className="py-2.5 px-3">{ds.sampleType}</td>
                      <td className="py-2.5 px-3 font-mono">{ds.status}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDataset(ds)}
                            className="p-1.5 rounded border border-slate-200 dark:border-emerald-900"
                            title="Review dataset"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDataset(ds)}
                            className="p-1.5 rounded border border-slate-200 dark:border-emerald-900 text-rose-600"
                            title="Delete dataset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewDataset && (
              <div className="p-4 rounded-xl bg-[#0B1410] text-[#DCFCE7] text-xs font-mono">
                <div className="flex justify-between mb-2">
                  <span>Reviewing: {previewDataset.datasetName} ({previewDataset.storagePath})</span>
                  <button type="button" onClick={() => setPreviewDataset(null)} className="text-emerald-400">Close</button>
                </div>
                <pre className="overflow-auto max-h-48">{previewDataset.previewSnippet || 'No preview available'}</pre>
              </div>
            )}
          </div>
        )}

        {/* D. Analysis Management */}
        {tab === 'analyses' && (
          <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold">Analysis Queue & Job Logs ({allAnalyses.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-emerald-950 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">Analysis ID</th>
                    <th className="py-2 px-3 font-semibold">Dataset</th>
                    <th className="py-2 px-3 font-semibold">Type</th>
                    <th className="py-2 px-3 font-semibold">Mode</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 pl-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                  {allAnalyses.map((a) => (
                    <tr key={a.analysisId}>
                      <td className="py-2.5 pr-3 font-mono">{a.analysisId}</td>
                      <td className="py-2.5 px-3 font-semibold">{a.datasetName}</td>
                      <td className="py-2.5 px-3">{a.analysisType}</td>
                      <td className="py-2.5 px-3 font-mono">{a.pipelineMode}</td>
                      <td className="py-2.5 px-3 font-mono">{a.status} ({a.progress}%)</td>
                      <td className="py-2.5 pl-3 text-right">
                        {a.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleRetryAnalysis(a)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#14532D] text-white font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Retry Job
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* E. System Analytics */}
        {tab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-4">Platform Growth & Activity (Users, Datasets, Analyses)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsSeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" name="Users" stroke="#102A43" strokeWidth={2} />
                    <Line type="monotone" dataKey="datasets" name="Datasets" stroke="#16A34A" strokeWidth={2} />
                    <Line type="monotone" dataKey="analyses" name="Analyses" stroke="#0D9488" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-4">Cross-Platform Biodiversity Statistics</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={biodiversitySummarySeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="dataset" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="richness" name="Species Richness" fill="#14532D" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="shannon" name="Shannon H'" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        )}

        {/* F. System Settings */}
        {tab === 'settings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Database className="w-4 h-4 text-[#16A34A]" />
                  Database & Storage Status
                </div>
                <p>Firebase Admin Token Verifier: {systemHealth?.firebaseAdminReady ? 'Connected' : 'Unavailable'}</p>
                <p>Supabase PostgreSQL: {systemHealth?.supabaseConnected ? 'Connected' : systemHealth?.supabaseConfigured ? 'Configured (check schema)' : 'Not configured'}</p>
                <p>Dataset Storage Used: {overviewStats.storageKb} KB across {overviewStats.totalDatasets} files</p>
              </div>

              <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Activity className="w-4 h-4 text-[#16A34A]" />
                  API & Pipeline Configuration
                </div>
                <p>Gemini AI API: {systemHealth?.geminiConfigured ? 'Configured' : 'Missing GEMINI_API_KEY'}</p>
                <p>Supabase Edge Function: {systemHealth?.edgeFunctionConfigured ? 'Configured' : 'Server fallback active'}</p>
                <p>BLAST/SILVA Endpoint: {systemHealth?.blastPipelineConfigured ? 'Live reference service' : 'Demonstration Mode'}</p>
              </div>

              <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  Access Policy Summary
                </div>
                <p>Email Verification Required: Enabled</p>
                <p>Self-Assigned Admin Blocking: Enforced in Firestore Rules</p>
                <p>Rate Limiting: Active on Upload, Analysis, AI & Admin APIs</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-3">Platform Activity Logs ({allActivityLogs.length})</h3>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-emerald-950 text-slate-500">
                      <th className="py-2 pr-3">Actor</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 pl-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                    {allActivityLogs.slice(0, 40).map((log) => (
                      <tr key={log.logId}>
                        <td className="py-2 pr-3 font-mono">{log.userId.slice(0, 12)}…</td>
                        <td className="py-2 px-3 font-mono">{log.actorRole}</td>
                        <td className="py-2 px-3 font-mono text-[#16A34A]">{log.action}</td>
                        <td className="py-2 pl-3">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
