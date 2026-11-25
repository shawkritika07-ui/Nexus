import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { useData } from '../context/DataContext';

interface BiodiversityPageProps {
  navigate: (path: string) => void;
}

const COLORS = ['#14532D', '#16A34A', '#22C55E', '#0D9488', '#0284C7', '#6366F1', '#64748B'];

const METRIC_GUIDES = [
  {
    name: 'Species Richness (S)',
    formula: 'S = count of distinct classified taxa',
    meaning: 'Measures total taxonomic breadth detected in the sample. Sensitive to sequencing depth and primer coverage.',
  },
  {
    name: "Shannon Diversity Index (H')",
    formula: "H' = -Σ p_i · ln(p_i)",
    meaning: 'Combines richness and relative abundance evenness. Typical aquatic eDNA samples range between 1.0 and 3.5.',
  },
  {
    name: 'Simpson Diversity Index (1 - D)',
    formula: '1 - D = 1 - Σ p_i²',
    meaning: 'Probability (0 to 1) that two randomly sampled sequence reads belong to different taxa; values near 1 indicate high diversity.',
  },
  {
    name: "Pielou's Evenness Index (J')",
    formula: "J' = H' / ln(S)",
    meaning: 'Quantifies how evenly reads are distributed across species (0 = single-taxon dominance, 1 = complete equitability).',
  },
];

export const BiodiversityPage: React.FC<BiodiversityPageProps> = ({ navigate }) => {
  const { datasets, results } = useData();
  const [primaryId, setPrimaryId] = useState<string>('');
  const [compareId, setCompareId] = useState<string>('');

  const primary = results.find((r) => r.resultId === primaryId) || results[0];
  const secondary = results.find((r) => r.resultId === compareId) || results[1] || results[0];

  const primaryDataset = datasets.find((d) => d.datasetId === primary?.datasetId);
  const secondaryDataset = datasets.find((d) => d.datasetId === secondary?.datasetId);

  const taxonomicDiversityCount = useMemo(() => {
    if (!primary) return 0;
    return new Set(
      primary.taxaAssignments
        .filter((t) => t.matchStatus !== 'Unclassified')
        .map((t) => t.lineage.family)
    ).size;
  }, [primary]);

  const sampleComparisonData = useMemo(() => {
    return results.slice(0, 8).map((r) => {
      const ds = datasets.find((d) => d.datasetId === r.datasetId);
      return {
        sample: ds?.sampleId || r.datasetName.slice(0, 14),
        location: ds?.collectionLocation || r.datasetName,
        richness: r.speciesRichness,
        shannon: Number(r.shannonIndex.toFixed(3)),
        simpson: Number(r.simpsonIndex.toFixed(3)),
        pielou: Number(r.pielouEvenness.toFixed(3)),
      };
    });
  }, [results, datasets]);

  const sideBySideComparison = useMemo(() => {
    if (!primary || !secondary) return [];
    return [
      { metric: "Shannon H'", Primary: primary.shannonIndex, Comparison: secondary.shannonIndex },
      { metric: 'Simpson 1-D', Primary: primary.simpsonIndex, Comparison: secondary.simpsonIndex },
      { metric: "Pielou J'", Primary: primary.pielouEvenness, Comparison: secondary.pielouEvenness },
    ];
  }, [primary, secondary]);

  if (!primary) {
    return (
      <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-12 text-center">
        <BarChart3 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#102A43] dark:text-white">
          No Biodiversity Assessments Available
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
          Upload a dataset and run an analysis to calculate Shannon, Simpson, Pielou, and Richness indices.
        </p>
        <button
          type="button"
          onClick={() => navigate('/analysis')}
          className="px-5 py-2.5 text-xs font-semibold bg-[#14532D] text-white rounded-lg"
        >
          Run Biodiversity Analysis
        </button>
      </div>
    );
  }

  const pieData = primary.taxaAssignments.slice(0, 7).map((t) => ({
    name: t.scientificName,
    value: t.relativeAbundance,
  }));

  const barData = (primary.taxonomicSummary || []).slice(0, 8).map((g) => ({
    group: g.groupName,
    reads: g.readCount,
    species: g.speciesCount,
  }));

  return (
    <div className="space-y-6">
      {/* Sample Selector & Warnings */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#102A43] dark:text-white">
              Biodiversity Assessment Dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {primaryDataset?.collectionLocation || primary.datasetName} · {primaryDataset?.sampleType || 'Environmental Sample'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Primary Sample</label>
              <select
                value={primary.resultId}
                onChange={(e) => setPrimaryId(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
              >
                {results.map((r) => (
                  <option key={r.resultId} value={r.resultId}>
                    {r.datasetName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Compare Against</label>
              <select
                value={secondary?.resultId || ''}
                onChange={(e) => setCompareId(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
              >
                {results.map((r) => (
                  <option key={r.resultId} value={r.resultId}>
                    {r.datasetName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {(primary.dataValidityWarning || primary.speciesRichness <= 1 || primary.classifiedReads < 5) && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Data Completeness Notice</p>
              <p className="mt-0.5">
                {primary.dataValidityWarning ||
                  'Insufficient classified taxa or read counts for stable alpha-diversity estimation.'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 6 Core Biodiversity Indicators */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Species Richness (S)', value: primary.speciesRichness },
          { label: "Shannon Index (H')", value: primary.shannonIndex.toFixed(4) },
          { label: 'Simpson Index (1-D)', value: primary.simpsonIndex.toFixed(4) },
          { label: "Pielou's Evenness (J')", value: primary.pielouEvenness.toFixed(4) },
          {
            label: 'Top Taxon Abundance',
            value: `${(primary.taxaAssignments[0]?.relativeAbundance ?? 0).toFixed(1)}%`,
          },
          { label: 'Taxonomic Diversity (Families)', value: taxonomicDiversityCount },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-4"
          >
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#102A43] dark:text-white mt-1.5">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Species Distribution Pie Chart */}
        <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-[#102A43] dark:text-white mb-4">
            Species Distribution (% Relative Abundance)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92} innerRadius={48}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Taxonomic Composition Bar Chart */}
        <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-[#102A43] dark:text-white mb-4">
            Taxonomic Composition (Reads per Phylum)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="group" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="reads" name="Read Count" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sample-wise Richness & Biodiversity Comparison */}
        <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-[#102A43] dark:text-white mb-4">
            Sample-wise Species Richness & Diversity
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sampleComparisonData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="sample" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="richness" name="Species Richness" stroke="#14532D" strokeWidth={2} />
                <Line type="monotone" dataKey="shannon" name="Shannon H'" stroke="#16A34A" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Location / Sample Biodiversity Comparison */}
        <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-[#102A43] dark:text-white mb-1">
            Habitat Comparison Graph
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {primaryDataset?.collectionLocation || primary.datasetName} vs. {secondaryDataset?.collectionLocation || secondary?.datasetName}
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sideBySideComparison}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Primary" name={primary.datasetName.slice(0, 18)} fill="#14532D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Comparison" name={secondary?.datasetName.slice(0, 18) || 'Comparison'} fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Scientific Interpretations */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
        <h3 className="text-base font-bold text-[#102A43] dark:text-white mb-4">
          Scientific Guide to Biodiversity Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METRIC_GUIDES.map((m) => (
            <div
              key={m.name}
              className="p-4 rounded-xl bg-[#F8FAF7] dark:bg-[#0E1913] border border-slate-200 dark:border-emerald-950"
            >
              <p className="text-sm font-bold text-[#102A43] dark:text-white">{m.name}</p>
              <p className="text-xs font-mono text-[#16A34A] mt-0.5">{m.formula}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {m.meaning}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
