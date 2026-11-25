import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpRight,
  Bell,
  Dna,
  FileSpreadsheet,
  FolderPlus,
  Play,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface DashboardPageProps {
  navigate: (path: string) => void;
}

const CHART_COLORS = ['#14532D', '#16A34A', '#22C55E', '#0D9488', '#0284C7', '#64748B'];

export const DashboardPage: React.FC<DashboardPageProps> = ({ navigate }) => {
  const { profile } = useAuth();
  const { datasets, analyses, results, reports, notifications, loadingData, markNotificationRead } = useData();

  const stats = useMemo(() => {
    const completed = analyses.filter((a) => a.status === 'completed');
    const speciesSet = new Set<string>();
    const phylumSet = new Set<string>();
    for (const r of results) {
      for (const t of r.taxaAssignments) {
        if (t.matchStatus !== 'Unclassified') {
          speciesSet.add(t.scientificName);
          if (t.lineage?.phylum) phylumSet.add(t.lineage.phylum);
        }
      }
    }
    const latestResult = results[0];
    return {
      totalDatasets: datasets.length,
      samplesAnalysed: datasets.filter((d) => d.status === 'analysed').length,
      speciesIdentified: speciesSet.size,
      taxonomicGroups: phylumSet.size,
      completedAnalyses: completed.length,
      latestResult,
    };
  }, [datasets, analyses, results]);

  const speciesChartData = useMemo(() => {
    if (!stats.latestResult) return [];
    return stats.latestResult.taxaAssignments.slice(0, 6).map((t) => ({
      name: t.scientificName.length > 20 ? `${t.scientificName.slice(0, 18)}…` : t.scientificName,
      abundance: t.relativeAbundance,
      reads: t.readCount,
    }));
  }, [stats.latestResult]);

  const phylumChartData = useMemo(() => {
    if (!stats.latestResult?.taxonomicSummary) return [];
    return stats.latestResult.taxonomicSummary.slice(0, 6).map((g) => ({
      name: g.groupName,
      reads: g.readCount,
    }));
  }, [stats.latestResult]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#16A34A] dark:text-[#4ADE80]">
            Research Workspace · {profile?.userCategory || 'Researcher'}
          </p>
          <h2 className="text-2xl font-bold text-[#102A43] dark:text-white mt-1">
            Welcome to eDNA Explorer!
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {profile?.fullName ? `Signed in as ${profile.fullName}` : 'Manage environmental DNA datasets, taxonomic runs, and biodiversity reports.'}
            {profile?.institution ? ` · ${profile.institution}` : ''}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            Upload New Dataset
          </button>
          <button
            type="button"
            onClick={() => navigate('/analysis')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-emerald-900 hover:bg-slate-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors whitespace-nowrap"
          >
            <Play className="w-4 h-4 text-[#16A34A]" />
            Start New Analysis
          </button>
          <button
            type="button"
            onClick={() => navigate('/results')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-emerald-900 hover:bg-slate-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            View Previous Results
          </button>
          <button
            type="button"
            onClick={() => navigate('/results')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-emerald-900 hover:bg-slate-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors whitespace-nowrap"
          >
            Generate Report
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 5 Statistics */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Datasets Uploaded', value: stats.totalDatasets },
          { label: 'Total Samples Analysed', value: stats.samplesAnalysed },
          { label: 'Species Identified', value: stats.speciesIdentified },
          { label: 'Taxonomic Groups Found', value: stats.taxonomicGroups },
          { label: 'Completed Analyses', value: stats.completedAnalyses },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-5"
          >
            <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#102A43] dark:text-white mt-2">
              {loadingData ? '—' : kpi.value}
            </p>
          </div>
        ))}
      </section>

      {/* Biodiversity Overview & Recent Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <div>
              <h3 className="text-base font-bold text-[#102A43] dark:text-white">
                Biodiversity Overview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {stats.latestResult
                  ? `Latest completed run: ${stats.latestResult.datasetName} (${stats.latestResult.pipelineMode === 'demonstration-mode' ? 'Demonstration Mode' : 'Reference Pipeline'})`
                  : 'Run an eDNA analysis to populate species distribution and diversity metrics.'}
              </p>
            </div>
            {stats.latestResult && (
              <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                <span>Richness: {stats.latestResult.speciesRichness}</span>
                <span>·</span>
                <span>Shannon H&apos;: {stats.latestResult.shannonIndex.toFixed(3)}</span>
              </div>
            )}
          </div>

          {!stats.latestResult ? (
            <div className="py-14 text-center border border-dashed border-slate-200 dark:border-emerald-900 rounded-xl">
              <Dna className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-[#102A43] dark:text-white">
                No completed biodiversity assessments yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Upload a FASTA, FASTQ, CSV, or TSV file and start an analysis to visualize community composition.
              </p>
              <button
                type="button"
                onClick={() => navigate('/upload')}
                className="px-4 py-2 text-xs font-semibold bg-[#14532D] text-white rounded-lg"
              >
                Upload Dataset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Species Distribution (% Abundance)
                </p>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={speciesChartData}
                      dataKey="abundance"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={2}
                    >
                      {speciesChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => `${Number(val).toFixed(2)}%`}
                      contentStyle={{
                        backgroundColor: '#102A43',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="h-64">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Taxonomic Composition (Reads by Phylum)
                </p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phylumChartData} margin={{ top: 8, right: 8, left: -12, bottom: 16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#102A43',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="reads" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        {/* Recent Notifications */}
        <section className="lg:col-span-4 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#102A43] dark:text-white">
              Recent Notifications
            </h3>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>
          {notifications.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center py-8">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dataset uploads and analysis completion alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-64">
              {notifications.slice(0, 6).map((n) => (
                <button
                  key={n.notificationId}
                  type="button"
                  onClick={() => markNotificationRead(n.notificationId)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                    n.read
                      ? 'border-slate-100 dark:border-emerald-950/60 text-slate-500 dark:text-slate-400'
                      : 'border-[#DCFCE7] dark:border-emerald-900 bg-[#DCFCE7]/35 dark:bg-emerald-950/35 text-[#102A43] dark:text-slate-100'
                  }`}
                >
                  <p className="font-semibold">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2">{n.message}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Activities */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
        <h3 className="text-base font-bold text-[#102A43] dark:text-white mb-4">
          Recent Activities
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Datasets */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Recently Uploaded Datasets
            </p>
            {datasets.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No datasets uploaded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                {datasets.slice(0, 4).map((d) => (
                  <li key={d.datasetId} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#102A43] dark:text-white truncate">{d.datasetName}</p>
                      <p className="text-slate-500 dark:text-slate-400 truncate">
                        {d.fileFormat} · {d.sampleType} · {d.sequenceCount} seqs
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-[#16A34A] shrink-0">{d.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Analyses */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Recent Analysis Results
            </p>
            {analyses.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No analyses started yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                {analyses.slice(0, 4).map((a) => (
                  <li key={a.analysisId} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#102A43] dark:text-white truncate">{a.datasetName}</p>
                      <p className="text-slate-500 dark:text-slate-400 truncate">{a.analysisType}</p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Reports */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Recent Reports
            </p>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No saved reports yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                {reports.slice(0, 4).map((r) => (
                  <li key={r.reportId} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#102A43] dark:text-white truncate">{r.title}</p>
                      <p className="text-slate-500 dark:text-slate-400 truncate">
                        {r.isShared ? `Shared (${r.shareCode})` : 'Private report'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/results')}
                      className="text-[#16A34A] hover:underline shrink-0"
                    >
                      Open
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
