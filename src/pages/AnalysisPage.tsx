import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Dna,
  Loader2,
  Play,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../components/ToastContext';
import type {
  AnalysisResultRecord,
  AnalysisType,
  ReferenceDatabase,
} from '../types/edna';

interface AnalysisPageProps {
  navigate: (path: string) => void;
}

const ANALYSIS_TYPES: AnalysisType[] = [
  'Taxonomic Identification',
  'Species Diversity Assessment',
  'Taxonomic Composition Analysis',
  'Species Richness Analysis',
  'Biodiversity Comparison',
  'Sequence Quality Assessment',
];

const REFERENCE_DBS: ReferenceDatabase[] = [
  'NCBI BLAST / Taxonomy',
  'SILVA rRNA',
  'MIDORI Mitochondrial',
  'Multi-Reference',
];

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ navigate }) => {
  const { datasets, runAnalysisWorkflow } = useData();
  const { showToast } = useToast();

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [analysisType, setAnalysisType] = useState<AnalysisType>('Taxonomic Identification');
  const [referenceDatabase, setReferenceDatabase] = useState<ReferenceDatabase>('NCBI BLAST / Taxonomy');
  const [minSimilarity, setMinSimilarity] = useState<number>(90);
  const [maxEValue, setMaxEValue] = useState<string>('1e-10');
  const [minQueryCoverage, setMinQueryCoverage] = useState<number>(75);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('');
  const [completedResult, setCompletedResult] = useState<AnalysisResultRecord | null>(null);

  const activeDataset = datasets.find((d) => d.datasetId === selectedDatasetId) || datasets[0];

  const handleStartAnalysis = async () => {
    if (!activeDataset) {
      showToast('No dataset available', 'Upload an eDNA dataset first before starting analysis.', 'error');
      return;
    }
    if (running) return;

    setRunning(true);
    setProgress(8);
    setStageText('Preparing sequence payload...');
    setCompletedResult(null);

    try {
      const result = await runAnalysisWorkflow({
        dataset: activeDataset,
        analysisType,
        referenceDatabase,
        minSimilarity,
        maxEValue,
        minQueryCoverage,
        onProgress: (pct, stage) => {
          setProgress(pct);
          setStageText(stage);
        },
      });
      setCompletedResult(result);
      showToast('Analysis finished', `${result.speciesRichness} taxa processed.`, 'success');
    } catch (err) {
      showToast('Analysis failed', err instanceof Error ? err.message : 'Unable to complete analysis.', 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Steps Card */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#102A43] dark:text-white">
            eDNA Bioinformatics Analysis Workflow
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Supports external NCBI BLAST, NCBI Taxonomy, SILVA, and MIDORI alignment services, with transparent Demonstration Mode when external alignment APIs are unconfigured.
          </p>
        </div>

        {/* Step 1: Select Dataset */}
        <div className="space-y-2">
          <p className="text-xs font-mono font-semibold text-[#16A34A]">STEP 1 · Select Uploaded Dataset</p>
          {datasets.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-emerald-900 flex items-center justify-between">
              <span className="text-xs text-slate-500">No datasets found in your workspace.</span>
              <button
                type="button"
                onClick={() => navigate('/upload')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#14532D] text-white rounded-lg"
              >
                Upload Dataset
              </button>
            </div>
          ) : (
            <select
              value={activeDataset?.datasetId || ''}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
            >
              {datasets.map((d) => (
                <option key={d.datasetId} value={d.datasetId}>
                  {d.datasetName} ({d.fileFormat} · {d.sampleType} · {d.sequenceCount} sequences)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Step 2: Select Analysis Type */}
        <div className="space-y-2">
          <p className="text-xs font-mono font-semibold text-[#16A34A]">STEP 2 · Select Analysis Type</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {ANALYSIS_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAnalysisType(type)}
                className={`text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-colors ${
                  analysisType === type
                    ? 'border-[#16A34A] bg-[#DCFCE7]/50 dark:bg-[#14532D]/40 text-[#14532D] dark:text-[#4ADE80]'
                    : 'border-slate-200 dark:border-emerald-950 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Configure Analysis Parameters */}
        <div className="space-y-3">
          <p className="text-xs font-mono font-semibold text-[#16A34A]">STEP 3 · Configure Analysis Parameters</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Reference Database</label>
              <select
                value={referenceDatabase}
                onChange={(e) => setReferenceDatabase(e.target.value as ReferenceDatabase)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
              >
                {REFERENCE_DBS.map((db) => (
                  <option key={db} value={db}>
                    {db}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Min Similarity ({minSimilarity}%)
              </label>
              <input
                type="range"
                min={70}
                max={99}
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(Number(e.target.value))}
                className="w-full accent-[#16A34A] mt-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">Max E-value Cutoff</label>
              <select
                value={maxEValue}
                onChange={(e) => setMaxEValue(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] font-mono"
              >
                <option value="1e-5">1e-5</option>
                <option value="1e-10">1e-10</option>
                <option value="1e-20">1e-20</option>
                <option value="1e-50">1e-50</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Min Query Coverage ({minQueryCoverage}%)
              </label>
              <input
                type="range"
                min={40}
                max={100}
                value={minQueryCoverage}
                onChange={(e) => setMinQueryCoverage(Number(e.target.value))}
                className="w-full accent-[#16A34A] mt-2"
              />
            </div>
          </div>
        </div>

        {/* Step 4 & 5: Start Analysis & Progress */}
        <div className="pt-2 border-t border-slate-200 dark:border-emerald-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono font-semibold text-[#16A34A]">STEP 4 · </span>
            Ready to execute <span className="font-semibold text-[#102A43] dark:text-white">{analysisType}</span>
          </div>
          <button
            type="button"
            disabled={running || !activeDataset}
            onClick={handleStartAnalysis}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors disabled:opacity-60"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start Analysis
          </button>
        </div>

        {(running || progress > 0) && (
          <div className="p-4 rounded-xl bg-[#F8FAF7] dark:bg-[#0E1913] border border-slate-200 dark:border-emerald-950 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#14532D] dark:text-[#4ADE80]">STEP 5 · {stageText}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-emerald-950 overflow-hidden">
              <div
                className="h-full bg-[#16A34A] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Step 6: Completed Analysis Results */}
      {completedResult && (
        <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              <div>
                <h3 className="text-base font-bold text-[#102A43] dark:text-white">
                  STEP 6 · Completed Analysis Results
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completedResult.datasetName} · {completedResult.referenceDatabase}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/taxonomy')}
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-emerald-900 rounded-lg hover:bg-slate-50 dark:hover:bg-emerald-950/40"
              >
                Explore Taxonomic Tree
              </button>
              <button
                type="button"
                onClick={() => navigate('/biodiversity')}
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-emerald-900 rounded-lg hover:bg-slate-50 dark:hover:bg-emerald-950/40"
              >
                Biodiversity Charts
              </button>
              <button
                type="button"
                onClick={() => navigate('/results')}
                className="px-3.5 py-2 text-xs font-semibold bg-[#14532D] text-white rounded-lg"
              >
                Export Report
              </button>
            </div>
          </div>

          {/* Transparent Scientific Mode Notice */}
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Pipeline Mode:{' '}
                {completedResult.pipelineMode === 'demonstration-mode'
                  ? 'Demonstration / Simulated Taxonomic Mapping'
                  : 'Reference Abundance / External Pipeline'}
              </p>
              <p className="mt-1 leading-relaxed">{completedResult.disclaimer}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Species Richness', value: completedResult.speciesRichness },
              { label: "Shannon H'", value: completedResult.shannonIndex.toFixed(3) },
              { label: 'Simpson 1-D', value: completedResult.simpsonIndex.toFixed(3) },
              { label: "Pielou J'", value: completedResult.pielouEvenness.toFixed(3) },
              { label: 'Total Reads', value: completedResult.totalReads },
              { label: 'Mean GC %', value: `${(completedResult.meanGcContent ?? 0).toFixed(1)}%` },
            ].map((m) => (
              <div
                key={m.label}
                className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#0E1913] border border-slate-200 dark:border-emerald-950"
              >
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.label}</p>
                <p className="text-lg font-bold font-mono tabular-nums text-[#102A43] dark:text-white mt-1">
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {completedResult.dataValidityWarning && (
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Note: {completedResult.dataValidityWarning}
            </p>
          )}
        </section>
      )}
    </div>
  );
};
