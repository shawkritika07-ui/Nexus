import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../components/ToastContext';
import { exportResultToCsv, exportResultToPdf } from '../lib/pdfExport';

interface ResultsPageProps {
  navigate: (path: string) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ navigate }) => {
  const {
    datasets,
    analyses,
    results,
    reports,
    generateAiInterpretation,
    createReportRecord,
    toggleReportSharing,
  } = useData();
  const { showToast } = useToast();

  const [selectedId, setSelectedId] = useState<string>('');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [interpreting, setInterpreting] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [savingReport, setSavingReport] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeResult = results.find((r) => r.resultId === selectedId) || results[0];
  const activeDataset = datasets.find((d) => d.datasetId === activeResult?.datasetId);
  const activeAnalysis = analyses.find((a) => a.analysisId === activeResult?.analysisId);

  const handleAiInterpret = async () => {
    if (!activeResult || interpreting) return;
    setInterpreting(true);
    try {
      await generateAiInterpretation(activeResult, activeDataset);
      showToast('AI interpretation ready', 'Scientific summary attached to this analysis.', 'success');
    } catch (err) {
      showToast(
        'AI interpretation unavailable',
        err instanceof Error ? err.message : 'Check GEMINI_API_KEY configuration.',
        'error'
      );
    } finally {
      setInterpreting(false);
    }
  };

  const handleSaveReport = async () => {
    if (!activeResult || savingReport) return;
    const title = reportTitle.trim() || `${activeResult.datasetName} Biodiversity Assessment`;
    setSavingReport(true);
    try {
      await createReportRecord(activeResult, title);
      setReportTitle('');
      showToast('Report saved', 'Scientific report record created with controlled sharing options.', 'success');
    } catch (err) {
      showToast('Save failed', err instanceof Error ? err.message : 'Could not save report.', 'error');
    } finally {
      setSavingReport(false);
    }
  };

  const toggleCompare = (resultId: string) => {
    setCompareIds((prev) =>
      prev.includes(resultId) ? prev.filter((id) => id !== resultId) : [...prev, resultId].slice(-4)
    );
  };

  if (!activeResult) {
    return (
      <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-12 text-center">
        <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#102A43] dark:text-white">
          No Analysis Results or Reports Yet
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
          Complete an eDNA analysis to export CSV data, generate PDF reports, or compare datasets.
        </p>
        <button
          type="button"
          onClick={() => navigate('/analysis')}
          className="px-5 py-2.5 text-xs font-semibold bg-[#14532D] text-white rounded-lg"
        >
          Start Analysis
        </button>
      </div>
    );
  }

  const comparedResults = results.filter((r) => compareIds.includes(r.resultId));

  return (
    <div className="space-y-6">
      {/* Selected Result Header & Exports */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-[#16A34A] uppercase tracking-wider">
              {activeResult.analysisType} · {activeAnalysis?.status || 'completed'}
            </p>
            <h2 className="text-xl font-bold text-[#102A43] dark:text-white mt-0.5">
              {activeResult.datasetName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {activeDataset?.collectionLocation || 'Location not specified'} · {activeResult.referenceDatabase} ·{' '}
              {activeResult.pipelineMode === 'demonstration-mode' ? 'Demonstration Mode' : 'Reference Pipeline'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={activeResult.resultId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
            >
              {results.map((r) => (
                <option key={r.resultId} value={r.resultId}>
                  {r.datasetName} ({r.analysisType})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => exportResultToCsv(activeResult)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-emerald-900 rounded-lg hover:bg-slate-50 dark:hover:bg-emerald-950/40"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>

            <button
              type="button"
              onClick={() =>
                exportResultToPdf(
                  activeResult,
                  activeDataset,
                  reportTitle.trim() || `${activeResult.datasetName} Report`
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Export PDF Report
            </button>
          </div>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Identified Taxa', value: activeResult.speciesRichness },
            { label: "Shannon H'", value: activeResult.shannonIndex.toFixed(4) },
            { label: 'Simpson 1-D', value: activeResult.simpsonIndex.toFixed(4) },
            { label: "Pielou J'", value: activeResult.pielouEvenness.toFixed(4) },
            { label: 'Classified Reads', value: `${activeResult.classifiedReads}/${activeResult.totalReads}` },
          ].map((m) => (
            <div key={m.label} className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#0E1913] border border-slate-200 dark:border-emerald-950">
              <p className="text-[11px] text-slate-500">{m.label}</p>
              <p className="text-lg font-bold font-mono tabular-nums text-[#102A43] dark:text-white mt-0.5">
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* AI-Assisted Biodiversity Interpretation */}
        <div className="p-5 rounded-xl bg-[#F8FAF7] dark:bg-[#0E1913] border border-slate-200 dark:border-emerald-950 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#102A43] dark:text-white">
                AI-Assisted Biodiversity Interpretation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Summarizes verified diversity metrics and taxonomic structure without inventing unverified species.
              </p>
            </div>
            <button
              type="button"
              disabled={interpreting}
              onClick={handleAiInterpret}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#102A43] hover:bg-[#14532D] text-white rounded-lg transition-colors disabled:opacity-60 shrink-0"
            >
              {interpreting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {activeResult.aiInterpretation ? 'Regenerate Interpretation' : 'Interpret Metrics with AI'}
            </button>
          </div>
          {activeResult.aiInterpretation && (
            <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed pt-2 border-t border-slate-200 dark:border-emerald-950">
              {activeResult.aiInterpretation}
            </div>
          )}
        </div>

        {/* Save Report Record & Controlled Sharing */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-200 dark:border-emerald-950">
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="Custom report title (e.g., Monsoon Basin Survey Report 2026)"
            className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
          />
          <button
            type="button"
            disabled={savingReport}
            onClick={handleSaveReport}
            className="px-4 py-2 text-xs font-semibold bg-[#16A34A] hover:bg-[#14532D] text-white rounded-lg transition-colors disabled:opacity-60"
          >
            Save Report Record
          </button>
        </div>
      </section>

      {/* Previous Analyses & Multi-Dataset Comparison */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#102A43] dark:text-white">
              Previous Analyses & Dataset Comparison
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select up to 4 analyses to compare biodiversity metrics side by side.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-emerald-950 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Compare</th>
                <th className="py-2 px-3 font-semibold">Dataset</th>
                <th className="py-2 px-3 font-semibold">Analysis Type</th>
                <th className="py-2 px-3 font-semibold text-right">Richness</th>
                <th className="py-2 px-3 font-semibold text-right">Shannon H&apos;</th>
                <th className="py-2 px-3 font-semibold text-right">Simpson 1-D</th>
                <th className="py-2 px-3 font-semibold text-right">Pielou J&apos;</th>
                <th className="py-2 pl-3 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
              {results.map((r) => (
                <tr key={r.resultId}>
                  <td className="py-2.5 pr-3">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(r.resultId)}
                      onChange={() => toggleCompare(r.resultId)}
                      className="rounded border-slate-300 text-[#16A34A]"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#102A43] dark:text-white">{r.datasetName}</td>
                  <td className="py-2.5 px-3">{r.analysisType}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.speciesRichness}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.shannonIndex.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.simpsonIndex.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.pielouEvenness.toFixed(3)}</td>
                  <td className="py-2.5 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.resultId)}
                      className="text-[#16A34A] font-semibold hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {comparedResults.length >= 2 && (
          <div className="pt-4 border-t border-slate-200 dark:border-emerald-950">
            <p className="text-xs font-semibold text-[#102A43] dark:text-white mb-3">
              Side-by-Side Comparison ({comparedResults.length} datasets)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {comparedResults.map((r) => (
                <div key={r.resultId} className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#0E1913] border border-slate-200 dark:border-emerald-950 text-xs space-y-1">
                  <p className="font-bold text-[#102A43] dark:text-white truncate">{r.datasetName}</p>
                  <p className="font-mono">Richness: {r.speciesRichness}</p>
                  <p className="font-mono">Shannon H&apos;: {r.shannonIndex.toFixed(4)}</p>
                  <p className="font-mono">Simpson 1-D: {r.simpsonIndex.toFixed(4)}</p>
                  <p className="font-mono">Pielou J&apos;: {r.pielouEvenness.toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Saved Reports & Controlled Access Sharing */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
        <h3 className="text-base font-bold text-[#102A43] dark:text-white mb-4">
          Saved Reports & Controlled Sharing ({reports.length})
        </h3>
        {reports.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            Save a report above to manage controlled sharing links.
          </p>
        ) : (
          <div className="space-y-2.5">
            {reports.map((rep) => {
              const shareUrl = `${window.location.origin}/results?report=${rep.reportId}&code=${rep.shareCode || ''}`;
              return (
                <div
                  key={rep.reportId}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-emerald-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#102A43] dark:text-white">{rep.title}</p>
                    <p className="text-slate-500 font-mono mt-0.5">
                      {rep.isShared ? `Controlled Sharing Enabled · Access Code: ${rep.shareCode}` : 'Private (Owner only)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleReportSharing(rep)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-emerald-900 font-medium"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {rep.isShared ? 'Disable Sharing' : 'Enable Controlled Share'}
                    </button>
                    {rep.isShared && (
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(shareUrl);
                          setCopiedId(rep.reportId);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#DCFCE7] text-[#14532D] font-semibold"
                      >
                        {copiedId === rep.reportId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy Link
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
