import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, GitBranch, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { TaxonAssignment } from '../types/edna';

interface TaxonomyPageProps {
  navigate: (path: string) => void;
}

interface TreeNode {
  name: string;
  rank: string;
  reads: number;
  children: Map<string, TreeNode>;
}

function buildTaxonomyTree(taxa: TaxonAssignment[]): TreeNode {
  const root: TreeNode = { name: 'All Classified Taxa', rank: 'Root', reads: 0, children: new Map() };
  for (const t of taxa) {
    const path: Array<[string, string]> = [
      ['Domain', t.lineage.domain],
      ['Kingdom', t.lineage.kingdom],
      ['Phylum', t.lineage.phylum],
      ['Class', t.lineage.class],
      ['Order', t.lineage.order],
      ['Family', t.lineage.family],
      ['Genus', t.lineage.genus],
      ['Species', t.lineage.species],
    ];
    let current = root;
    current.reads += t.readCount;
    for (const [rank, label] of path) {
      const key = `${rank}:${label}`;
      let child = current.children.get(key);
      if (!child) {
        child = { name: label, rank, reads: 0, children: new Map() };
        current.children.set(key, child);
      }
      child.reads += t.readCount;
      current = child;
    }
  }
  return root;
}

const TaxonomyTreeBranch: React.FC<{ node: TreeNode; depth?: number }> = ({ node, depth = 0 }) => {
  const [expanded, setExpanded] = useState(depth < 3);
  const children = Array.from(node.children.values());

  return (
    <div className={depth > 0 ? 'ml-4 pl-3 border-l border-slate-200 dark:border-emerald-950' : ''}>
      <button
        type="button"
        onClick={() => children.length > 0 && setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-emerald-950/30 text-left text-xs"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {children.length > 0 ? (
            expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <span className="text-[11px] font-mono text-[#16A34A] dark:text-[#4ADE80] shrink-0">
            {node.rank}
          </span>
          <span className={`truncate ${node.rank === 'Species' ? 'italic font-semibold' : 'font-medium'} text-[#102A43] dark:text-white`}>
            {node.name}
          </span>
        </span>
        <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
          {node.reads} reads
        </span>
      </button>
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TaxonomyTreeBranch key={`${child.rank}_${child.name}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const TaxonomyPage: React.FC<TaxonomyPageProps> = ({ navigate }) => {
  const { results } = useData();
  const [selectedResultId, setSelectedResultId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [kingdomFilter, setKingdomFilter] = useState('All');
  const [phylumFilter, setPhylumFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [orderFilter, setOrderFilter] = useState('All');
  const [familyFilter, setFamilyFilter] = useState('All');
  const [genusFilter, setGenusFilter] = useState('All');
  const [speciesFilter, setSpeciesFilter] = useState('All');

  const activeResult = results.find((r) => r.resultId === selectedResultId) || results[0];
  const allTaxa = activeResult?.taxaAssignments || [];

  const filterOptions = useMemo(() => {
    const uniq = (getter: (t: TaxonAssignment) => string) =>
      ['All', ...Array.from(new Set(allTaxa.map(getter).filter(Boolean))).sort()];
    return {
      kingdoms: uniq((t) => t.lineage.kingdom),
      phylums: uniq((t) => t.lineage.phylum),
      classes: uniq((t) => t.lineage.class),
      orders: uniq((t) => t.lineage.order),
      families: uniq((t) => t.lineage.family),
      genera: uniq((t) => t.lineage.genus),
      species: uniq((t) => t.lineage.species),
    };
  }, [allTaxa]);

  const filteredTaxa = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allTaxa.filter((t) => {
      if (kingdomFilter !== 'All' && t.lineage.kingdom !== kingdomFilter) return false;
      if (phylumFilter !== 'All' && t.lineage.phylum !== phylumFilter) return false;
      if (classFilter !== 'All' && t.lineage.class !== classFilter) return false;
      if (orderFilter !== 'All' && t.lineage.order !== orderFilter) return false;
      if (familyFilter !== 'All' && t.lineage.family !== familyFilter) return false;
      if (genusFilter !== 'All' && t.lineage.genus !== genusFilter) return false;
      if (speciesFilter !== 'All' && t.lineage.species !== speciesFilter) return false;
      if (!q) return true;
      return (
        t.scientificName.toLowerCase().includes(q) ||
        (t.commonName || '').toLowerCase().includes(q) ||
        t.taxonomicId.toLowerCase().includes(q) ||
        t.sequenceId.toLowerCase().includes(q) ||
        t.lineage.phylum.toLowerCase().includes(q) ||
        t.lineage.family.toLowerCase().includes(q)
      );
    });
  }, [
    allTaxa,
    searchTerm,
    kingdomFilter,
    phylumFilter,
    classFilter,
    orderFilter,
    familyFilter,
    genusFilter,
    speciesFilter,
  ]);

  const treeRoot = useMemo(() => buildTaxonomyTree(filteredTaxa), [filteredTaxa]);

  if (!activeResult) {
    return (
      <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-12 text-center">
        <GitBranch className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#102A43] dark:text-white">
          No Taxonomic Identification Results Yet
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
          Run an analysis on an uploaded dataset to inspect hierarchical taxonomic classifications.
        </p>
        <button
          type="button"
          onClick={() => navigate('/analysis')}
          className="px-5 py-2.5 text-xs font-semibold bg-[#14532D] text-white rounded-lg"
        >
          Start eDNA Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls & Search */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#102A43] dark:text-white">
              Taxonomic Classification Explorer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeResult.pipelineMode === 'demonstration-mode'
                ? 'Demonstration Mode · Simulated ecological reference mapping'
                : 'Reference Abundance / Pipeline'} · {activeResult.referenceDatabase}
            </p>
          </div>

          <select
            value={activeResult.resultId}
            onChange={(e) => setSelectedResultId(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
          >
            {results.map((r) => (
              <option key={r.resultId} value={r.resultId}>
                {r.datasetName} ({r.analysisType})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search species, scientific name, taxon ID, or sequence ID..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
            />
          </div>

          {[
            { label: 'Kingdom', value: kingdomFilter, set: setKingdomFilter, opts: filterOptions.kingdoms },
            { label: 'Phylum', value: phylumFilter, set: setPhylumFilter, opts: filterOptions.phylums },
            { label: 'Class', value: classFilter, set: setClassFilter, opts: filterOptions.classes },
            { label: 'Order', value: orderFilter, set: setOrderFilter, opts: filterOptions.orders },
            { label: 'Family', value: familyFilter, set: setFamilyFilter, opts: filterOptions.families },
            { label: 'Genus', value: genusFilter, set: setGenusFilter, opts: filterOptions.genera },
            { label: 'Species', value: speciesFilter, set: setSpeciesFilter, opts: filterOptions.species },
          ].map((f) => (
            <select
              key={f.label}
              aria-label={`Filter by ${f.label}`}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
            >
              {f.opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'All' ? `${f.label}: All` : opt}
                </option>
              ))}
            </select>
          ))}
        </div>
      </section>

      {/* Hierarchical Taxonomy Tree + Detailed Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-4 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#102A43] dark:text-white mb-3">
            Hierarchical Taxonomy Tree
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Domain → Kingdom → Phylum → Class → Order → Family → Genus → Species
          </p>
          <div className="max-h-[540px] overflow-y-auto pr-1">
            <TaxonomyTreeBranch node={treeRoot} />
          </div>
        </section>

        <section className="xl:col-span-8 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#102A43] dark:text-white">
              Taxonomic Assignments ({filteredTaxa.length})
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Showing filtered identifications
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-emerald-950 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-3 font-semibold">Scientific Name</th>
                  <th className="py-2.5 px-2.5 font-semibold">Rank</th>
                  <th className="py-2.5 px-2.5 font-semibold">Taxon ID</th>
                  <th className="py-2.5 px-2.5 font-semibold">Seq ID</th>
                  <th className="py-2.5 px-2.5 font-semibold">Reference DB</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Sim %</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Cov %</th>
                  <th className="py-2.5 px-2.5 font-semibold">E-value</th>
                  <th className="py-2.5 px-2.5 font-semibold">Confidence</th>
                  <th className="py-2.5 pl-2.5 font-semibold">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                {filteredTaxa.map((t, i) => (
                  <tr key={`${t.sequenceId}_${i}`} className="hover:bg-slate-50/70 dark:hover:bg-emerald-950/20">
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold italic text-[#102A43] dark:text-white">
                        {t.scientificName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {t.lineage.phylum} · {t.lineage.family}
                      </p>
                    </td>
                    <td className="py-2.5 px-2.5">{t.taxonomicRank}</td>
                    <td className="py-2.5 px-2.5 font-mono">{t.taxonomicId}</td>
                    <td className="py-2.5 px-2.5 font-mono">{t.sequenceId}</td>
                    <td className="py-2.5 px-2.5">{t.referenceDatabase}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                      {t.similarityPercentage.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                      {t.queryCoverage.toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-2.5 font-mono">{t.eValue}</td>
                    <td className="py-2.5 px-2.5">{t.confidence}</td>
                    <td className="py-2.5 pl-2.5 font-mono text-[#16A34A]">{t.matchStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
