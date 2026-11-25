import crypto from 'node:crypto';
import type {
  AnalysisType,
  PipelineMode,
  ReferenceDatabase,
  SampleType,
  SupportedFormat,
  TaxonAssignment,
  TaxonomicGroupSummary,
} from '../src/types/edna.ts';

export interface ParsedSequenceInfo {
  sequenceId: string;
  header: string;
  sequenceLength: number;
  gcContent: number;
  meanQuality: number | null;
  readCount: number;
  providedTaxon?: string;
}

export interface ParsedDatasetSummary {
  sequenceCount: number;
  totalReads: number;
  meanGcContent: number;
  meanReadLength: number;
  previewSnippet: string;
  sequences: ParsedSequenceInfo[];
  hasProvidedTaxonomy: boolean;
  warnings: string[];
}

interface ReferenceTaxonTemplate {
  taxonomicId: string;
  scientificName: string;
  commonName: string;
  rank: 'Species' | 'Genus';
  db: string;
  lineage: {
    domain: string;
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
  };
}

const HABITAT_REFERENCE_LIBRARY: Record<SampleType, ReferenceTaxonTemplate[]> = {
  Freshwater: [
    {
      taxonomicId: 'NCBI:8022',
      scientificName: 'Oncorhynchus mykiss',
      commonName: 'Rainbow trout',
      rank: 'Species',
      db: 'NCBI Taxonomy / MIDORI',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Chordata',
        class: 'Actinopterygii',
        order: 'Salmoniformes',
        family: 'Salmonidae',
        genus: 'Oncorhynchus',
        species: 'Oncorhynchus mykiss',
      },
    },
    {
      taxonomicId: 'NCBI:8355',
      scientificName: 'Xenopus laevis',
      commonName: 'African clawed frog',
      rank: 'Species',
      db: 'NCBI Taxonomy / MIDORI',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Chordata',
        class: 'Amphibia',
        order: 'Anura',
        family: 'Pipidae',
        genus: 'Xenopus',
        species: 'Xenopus laevis',
      },
    },
    {
      taxonomicId: 'NCBI:6669',
      scientificName: 'Daphnia pulex',
      commonName: 'Common water flea',
      rank: 'Species',
      db: 'SILVA / MIDORI',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Arthropoda',
        class: 'Branchiopoda',
        order: 'Diplostraca',
        family: 'Daphniidae',
        genus: 'Daphnia',
        species: 'Daphnia pulex',
      },
    },
    {
      taxonomicId: 'NCBI:2903',
      scientificName: 'Navicula pelliculosa',
      commonName: 'Freshwater pennate diatom',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Chromista',
        phylum: 'Bacillariophyta',
        class: 'Bacillariophyceae',
        order: 'Naviculales',
        family: 'Naviculaceae',
        genus: 'Navicula',
        species: 'Navicula pelliculosa',
      },
    },
    {
      taxonomicId: 'NCBI:1148',
      scientificName: 'Synechocystis sp.',
      commonName: 'Freshwater cyanobacterium',
      rank: 'Genus',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Bacteria',
        kingdom: 'Monera',
        phylum: 'Cyanobacteria',
        class: 'Cyanophyceae',
        order: 'Synechococcales',
        family: 'Merismopediaceae',
        genus: 'Synechocystis',
        species: 'Synechocystis sp.',
      },
    },
    {
      taxonomicId: 'NCBI:3055',
      scientificName: 'Chlamydomonas reinhardtii',
      commonName: 'Green microalga',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Plantae',
        phylum: 'Chlorophyta',
        class: 'Chlorophyceae',
        order: 'Chlamydomonadales',
        family: 'Chlamydomonadaceae',
        genus: 'Chlamydomonas',
        species: 'Chlamydomonas reinhardtii',
      },
    },
    {
      taxonomicId: 'NCBI:45157',
      scientificName: 'Ephemera danica',
      commonName: 'Green drake mayfly',
      rank: 'Species',
      db: 'MIDORI Mitochondrial',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Arthropoda',
        class: 'Insecta',
        order: 'Ephemeroptera',
        family: 'Ephemeridae',
        genus: 'Ephemera',
        species: 'Ephemera danica',
      },
    },
  ],
  'Marine Water': [
    {
      taxonomicId: 'NCBI:7955',
      scientificName: 'Clupea harengus',
      commonName: 'Atlantic herring',
      rank: 'Species',
      db: 'MIDORI Mitochondrial',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Chordata',
        class: 'Actinopterygii',
        order: 'Clupeiformes',
        family: 'Clupeidae',
        genus: 'Clupea',
        species: 'Clupea harengus',
      },
    },
    {
      taxonomicId: 'NCBI:192875',
      scientificName: 'Pelagibacter ubique',
      commonName: 'Marine SAR11 bacterium',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Bacteria',
        kingdom: 'Monera',
        phylum: 'Pseudomonadota',
        class: 'Alphaproteobacteria',
        order: 'Pelagibacterales',
        family: 'Pelagibacteraceae',
        genus: 'Pelagibacter',
        species: 'Pelagibacter ubique',
      },
    },
    {
      taxonomicId: 'NCBI:1219',
      scientificName: 'Prochlorococcus marinus',
      commonName: 'Marine picoplankton',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Bacteria',
        kingdom: 'Monera',
        phylum: 'Cyanobacteria',
        class: 'Cyanophyceae',
        order: 'Synechococcales',
        family: 'Prochlorococcaceae',
        genus: 'Prochlorococcus',
        species: 'Prochlorococcus marinus',
      },
    },
    {
      taxonomicId: 'NCBI:6837',
      scientificName: 'Calanus finmarchicus',
      commonName: 'Marine copepod',
      rank: 'Species',
      db: 'MIDORI Mitochondrial',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Arthropoda',
        class: 'Copepoda',
        order: 'Calanoida',
        family: 'Calanidae',
        genus: 'Calanus',
        species: 'Calanus finmarchicus',
      },
    },
    {
      taxonomicId: 'NCBI:35128',
      scientificName: 'Thalassiosira pseudonana',
      commonName: 'Marine centric diatom',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Chromista',
        phylum: 'Bacillariophyta',
        class: 'Coscinodiscophyceae',
        order: 'Thalassiosirales',
        family: 'Thalassiosiraceae',
        genus: 'Thalassiosira',
        species: 'Thalassiosira pseudonana',
      },
    },
  ],
  Soil: [
    {
      taxonomicId: 'NCBI:6396',
      scientificName: 'Lumbricus terrestris',
      commonName: 'Common earthworm',
      rank: 'Species',
      db: 'MIDORI Mitochondrial',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Annelida',
        class: 'Clitellata',
        order: 'Crassiclitellata',
        family: 'Lumbricidae',
        genus: 'Lumbricus',
        species: 'Lumbricus terrestris',
      },
    },
    {
      taxonomicId: 'NCBI:1902',
      scientificName: 'Streptomyces coelicolor',
      commonName: 'Soil actinobacterium',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Bacteria',
        kingdom: 'Monera',
        phylum: 'Actinomycetota',
        class: 'Actinomycetes',
        order: 'Kitasatosporales',
        family: 'Streptomycetaceae',
        genus: 'Streptomyces',
        species: 'Streptomyces coelicolor',
      },
    },
    {
      taxonomicId: 'NCBI:5061',
      scientificName: 'Rhizophagus irregularis',
      commonName: 'Arbuscular mycorrhizal fungus',
      rank: 'Species',
      db: 'SILVA / NCBI Taxonomy',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Fungi',
        phylum: 'Mucoromycota',
        class: 'Glomeromycetes',
        order: 'Glomerales',
        family: 'Glomeraceae',
        genus: 'Rhizophagus',
        species: 'Rhizophagus irregularis',
      },
    },
    {
      taxonomicId: 'NCBI:6239',
      scientificName: 'Caenorhabditis elegans',
      commonName: 'Free-living soil nematode',
      rank: 'Species',
      db: 'NCBI Taxonomy',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Nematoda',
        class: 'Chromadorea',
        order: 'Rhabditida',
        family: 'Rhabditidae',
        genus: 'Caenorhabditis',
        species: 'Caenorhabditis elegans',
      },
    },
    {
      taxonomicId: 'NCBI:303',
      scientificName: 'Pseudomonas putida',
      commonName: 'Rhizosphere bacterium',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Bacteria',
        kingdom: 'Monera',
        phylum: 'Pseudomonadota',
        class: 'Gammaproteobacteria',
        order: 'Pseudomonadales',
        family: 'Pseudomonadaceae',
        genus: 'Pseudomonas',
        species: 'Pseudomonas putida',
      },
    },
  ],
  Sediment: [
    {
      taxonomicId: 'NCBI:882',
      scientificName: 'Desulfovibrio vulgaris',
      commonName: 'Sulfate-reducing bacterium',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Bacteria',
        kingdom: 'Monera',
        phylum: 'Thermodesulfobacteriota',
        class: 'Desulfovibrionia',
        order: 'Desulfovibrionales',
        family: 'Desulfovibrionaceae',
        genus: 'Desulfovibrio',
        species: 'Desulfovibrio vulgaris',
      },
    },
    {
      taxonomicId: 'NCBI:6344',
      scientificName: 'Capitella teleta',
      commonName: 'Benthic polychaete worm',
      rank: 'Species',
      db: 'MIDORI Mitochondrial',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Annelida',
        class: 'Polychaeta',
        order: 'Capitellida',
        family: 'Capitellidae',
        genus: 'Capitella',
        species: 'Capitella teleta',
      },
    },
    {
      taxonomicId: 'NCBI:2214',
      scientificName: 'Methanosarcina acetivorans',
      commonName: 'Benthic methanogen',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Archaea',
        kingdom: 'Monera',
        phylum: 'Euryarchaeota',
        class: 'Methanomicrobia',
        order: 'Methanosarcinales',
        family: 'Methanosarcinaceae',
        genus: 'Methanosarcina',
        species: 'Methanosarcina acetivorans',
      },
    },
    {
      taxonomicId: 'NCBI:28450',
      scientificName: 'Chironomus riparius',
      commonName: 'Benthic midge larva',
      rank: 'Species',
      db: 'MIDORI Mitochondrial',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Arthropoda',
        class: 'Insecta',
        order: 'Diptera',
        family: 'Chironomidae',
        genus: 'Chironomus',
        species: 'Chironomus riparius',
      },
    },
  ],
  Air: [
    {
      taxonomicId: 'NCBI:5476',
      scientificName: 'Alternaria alternata',
      commonName: 'Airborne fungal spore',
      rank: 'Species',
      db: 'SILVA / NCBI Taxonomy',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Fungi',
        phylum: 'Ascomycota',
        class: 'Dothideomycetes',
        order: 'Pleosporales',
        family: 'Pleosporaceae',
        genus: 'Alternaria',
        species: 'Alternaria alternata',
      },
    },
    {
      taxonomicId: 'NCBI:3702',
      scientificName: 'Betula pendula',
      commonName: 'Silver birch pollen',
      rank: 'Species',
      db: 'NCBI Taxonomy',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Plantae',
        phylum: 'Streptophyta',
        class: 'Magnoliopsida',
        order: 'Fagales',
        family: 'Betulaceae',
        genus: 'Betula',
        species: 'Betula pendula',
      },
    },
    {
      taxonomicId: 'NCBI:1423',
      scientificName: 'Bacillus subtilis',
      commonName: 'Aerosolized endospore bacterium',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Bacteria',
        kingdom: 'Monera',
        phylum: 'Bacillota',
        class: 'Bacilli',
        order: 'Bacillales',
        family: 'Bacillaceae',
        genus: 'Bacillus',
        species: 'Bacillus subtilis',
      },
    },
  ],
  Other: [
    {
      taxonomicId: 'NCBI:562',
      scientificName: 'Escherichia coli',
      commonName: 'Enteric indicator bacterium',
      rank: 'Species',
      db: 'SILVA rRNA',
      lineage: {
        domain: 'Bacteria',
        kingdom: 'Monera',
        phylum: 'Pseudomonadota',
        class: 'Gammaproteobacteria',
        order: 'Enterobacterales',
        family: 'Enterobacteriaceae',
        genus: 'Escherichia',
        species: 'Escherichia coli',
      },
    },
    {
      taxonomicId: 'NCBI:4932',
      scientificName: 'Saccharomyces cerevisiae',
      commonName: 'Ascomycete yeast',
      rank: 'Species',
      db: 'SILVA / NCBI Taxonomy',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Fungi',
        phylum: 'Ascomycota',
        class: 'Saccharomycetes',
        order: 'Saccharomycetales',
        family: 'Saccharomycetaceae',
        genus: 'Saccharomyces',
        species: 'Saccharomyces cerevisiae',
      },
    },
    {
      taxonomicId: 'NCBI:7227',
      scientificName: 'Drosophila melanogaster',
      commonName: 'Dipteran insect',
      rank: 'Species',
      db: 'MIDORI Mitochondrial',
      lineage: {
        domain: 'Eukaryota',
        kingdom: 'Animalia',
        phylum: 'Arthropoda',
        class: 'Insecta',
        order: 'Diptera',
        family: 'Drosophilidae',
        genus: 'Drosophila',
        species: 'Drosophila melanogaster',
      },
    },
  ],
};

function computeGc(seq: string): number {
  const clean = seq.toUpperCase().replace(/[^ATGCN]/g, '');
  if (!clean.length) return 0;
  let gc = 0;
  let valid = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === 'G' || ch === 'C') {
      gc++;
      valid++;
    } else if (ch === 'A' || ch === 'T') {
      valid++;
    }
  }
  return valid > 0 ? Number(((gc / valid) * 100).toFixed(2)) : 0;
}

function computePhredMean(qualLine: string): number {
  if (!qualLine.length) return 30;
  let total = 0;
  for (let i = 0; i < qualLine.length; i++) {
    total += Math.max(0, qualLine.charCodeAt(i) - 33);
  }
  return Number((total / qualLine.length).toFixed(2));
}

export function parseDatasetContent(rawText: string, fileFormat: SupportedFormat): ParsedDatasetSummary {
  const lines = rawText.split(/\r?\n/);
  const previewSnippet = lines.slice(0, 14).join('\n').slice(0, 1800);
  const warnings: string[] = [];
  const sequences: ParsedSequenceInfo[] = [];
  let hasProvidedTaxonomy = false;

  if (fileFormat === 'FASTA') {
    let currentHeader = '';
    let currentSeq = '';
    let idx = 0;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith('>')) {
        if (currentHeader && currentSeq.length > 0) {
          idx++;
          sequences.push({
            sequenceId: currentHeader.split(/\s+/)[0].replace(/^>/, '') || `SEQ_${idx}`,
            header: currentHeader.slice(1, 140),
            sequenceLength: currentSeq.length,
            gcContent: computeGc(currentSeq),
            meanQuality: null,
            readCount: 1,
          });
        }
        currentHeader = line;
        currentSeq = '';
      } else {
        currentSeq += line;
      }
    }
    if (currentHeader && currentSeq.length > 0) {
      idx++;
      sequences.push({
        sequenceId: currentHeader.split(/\s+/)[0].replace(/^>/, '') || `SEQ_${idx}`,
        header: currentHeader.slice(1, 140),
        sequenceLength: currentSeq.length,
        gcContent: computeGc(currentSeq),
        meanQuality: null,
        readCount: 1,
      });
    }
    if (sequences.length === 0) {
      warnings.push('No valid FASTA records starting with ">" were detected in this file.');
    }
  } else if (fileFormat === 'FASTQ') {
    const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i + 3 < nonEmpty.length; i += 4) {
      const header = nonEmpty[i];
      const seq = nonEmpty[i + 1];
      const plus = nonEmpty[i + 2];
      const qual = nonEmpty[i + 3];
      if (!header.startsWith('@') || !plus.startsWith('+')) continue;
      sequences.push({
        sequenceId: header.split(/\s+/)[0].replace(/^@/, '') || `READ_${sequences.length + 1}`,
        header: header.slice(1, 140),
        sequenceLength: seq.length,
        gcContent: computeGc(seq),
        meanQuality: computePhredMean(qual),
        readCount: 1,
      });
    }
    if (sequences.length === 0) {
      warnings.push('No valid 4-line FASTQ blocks (@header, sequence, +, quality) were detected.');
    }
  } else {
    // CSV, TSV, TXT
    const delimiter = fileFormat === 'TSV' ? '\t' : ',';
    const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
    if (nonEmpty.length > 0) {
      const headerCols = nonEmpty[0].split(delimiter).map((c) => c.trim().toLowerCase());
      const hasHeader =
        headerCols.some((c) =>
          ['sequence', 'seq', 'species', 'taxon', 'scientific_name', 'id', 'sequence_id', 'reads', 'abundance', 'count'].includes(c)
        );
      const startRow = hasHeader ? 1 : 0;
      const idIdx = headerCols.findIndex((c) => ['sequence_id', 'seq_id', 'id', 'sample_id'].includes(c));
      const seqIdx = headerCols.findIndex((c) => ['sequence', 'seq', 'dna_sequence', 'amplicon'].includes(c));
      const taxonIdx = headerCols.findIndex((c) => ['species', 'scientific_name', 'taxon', 'taxonomy'].includes(c));
      const countIdx = headerCols.findIndex((c) => ['reads', 'read_count', 'abundance', 'count'].includes(c));

      if (taxonIdx >= 0) {
        hasProvidedTaxonomy = true;
      }

      for (let i = startRow; i < nonEmpty.length; i++) {
        const cols = nonEmpty[i].split(delimiter).map((c) => c.trim());
        if (cols.length === 0) continue;
        const seqId = idIdx >= 0 && cols[idIdx] ? cols[idIdx] : `REC_${i + 1}`;
        const rawSeq = seqIdx >= 0 && cols[seqIdx] ? cols[seqIdx] : '';
        const providedTaxon = taxonIdx >= 0 && cols[taxonIdx] ? cols[taxonIdx] : undefined;
        const parsedCount = countIdx >= 0 ? Number.parseInt(cols[countIdx] || '1', 10) : 1;
        const readCount = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1;
        const isDnaLine = /^[ATGCNatgcn\s]+$/.test(cols[0]) && cols[0].length >= 12;
        const seqStr = rawSeq || (isDnaLine ? cols[0] : '');

        sequences.push({
          sequenceId: seqId.slice(0, 64),
          header: providedTaxon || seqId,
          sequenceLength: seqStr.length || 240,
          gcContent: seqStr ? computeGc(seqStr) : 48.5,
          meanQuality: null,
          readCount,
          providedTaxon,
        });
      }
    }
    if (sequences.length === 0) {
      warnings.push('No parseable sequence or abundance rows were found.');
    }
  }

  const totalReads = sequences.reduce((acc, s) => acc + s.readCount, 0);
  const meanGcContent =
    sequences.length > 0
      ? Number((sequences.reduce((acc, s) => acc + s.gcContent, 0) / sequences.length).toFixed(2))
      : 0;
  const meanReadLength =
    sequences.length > 0
      ? Number((sequences.reduce((acc, s) => acc + s.sequenceLength, 0) / sequences.length).toFixed(1))
      : 0;

  return {
    sequenceCount: sequences.length,
    totalReads,
    meanGcContent,
    meanReadLength,
    previewSnippet,
    sequences,
    hasProvidedTaxonomy,
    warnings,
  };
}

export interface RunAnalysisInput {
  datasetName: string;
  fileFormat: SupportedFormat;
  sampleType: SampleType;
  analysisType: AnalysisType;
  referenceDatabase: ReferenceDatabase;
  minSimilarity: number;
  maxEValue: string;
  minQueryCoverage: number;
  rawContent: string;
  blastEndpoint?: string;
}

export interface ComputedAnalysisOutput {
  pipelineMode: PipelineMode;
  disclaimer: string;
  speciesRichness: number;
  shannonIndex: number;
  simpsonIndex: number;
  pielouEvenness: number;
  totalReads: number;
  classifiedReads: number;
  meanGcContent: number;
  meanReadLength: number;
  dataValidityWarning?: string;
  taxaAssignments: TaxonAssignment[];
  taxonomicSummary: TaxonomicGroupSummary[];
}

export async function executeBioinformaticsPipeline(
  input: RunAnalysisInput
): Promise<ComputedAnalysisOutput> {
  const parsed = parseDatasetContent(input.rawContent, input.fileFormat);

  // If an external real BLAST/SILVA/MIDORI service is configured, call it securely from the server
  if (input.blastEndpoint) {
    try {
      const response = await fetch(input.blastEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileFormat: input.fileFormat,
          sampleType: input.sampleType,
          referenceDatabase: input.referenceDatabase,
          minSimilarity: input.minSimilarity,
          maxEValue: input.maxEValue,
          minQueryCoverage: input.minQueryCoverage,
          rawContent: input.rawContent,
        }),
      });
      if (response.ok) {
        const external = (await response.json()) as Partial<ComputedAnalysisOutput>;
        if (Array.isArray(external.taxaAssignments) && external.taxaAssignments.length > 0) {
          return {
            pipelineMode: 'reference-pipeline',
            disclaimer: `Aligned against ${input.referenceDatabase} via configured bioinformatics pipeline service.`,
            speciesRichness: external.speciesRichness ?? 0,
            shannonIndex: external.shannonIndex ?? 0,
            simpsonIndex: external.simpsonIndex ?? 0,
            pielouEvenness: external.pielouEvenness ?? 0,
            totalReads: external.totalReads ?? parsed.totalReads,
            classifiedReads: external.classifiedReads ?? 0,
            meanGcContent: parsed.meanGcContent,
            meanReadLength: parsed.meanReadLength,
            dataValidityWarning: external.dataValidityWarning,
            taxaAssignments: external.taxaAssignments,
            taxonomicSummary: external.taxonomicSummary ?? [],
          };
        }
      }
    } catch {
      // Fall through cleanly to explicitly labeled Demonstration Mode if upstream fails
    }
  }

  // Demonstration Mode (never disguised as live NCBI BLAST)
  const library = HABITAT_REFERENCE_LIBRARY[input.sampleType] ?? HABITAT_REFERENCE_LIBRARY.Other;
  const taxaMap = new Map<string, TaxonAssignment>();

  const effectiveSequences =
    parsed.sequences.length > 0
      ? parsed.sequences.slice(0, 500)
      : [
          {
            sequenceId: 'EMPTY_001',
            header: 'No valid sequences detected',
            sequenceLength: 0,
            gcContent: 0,
            meanQuality: null,
            readCount: 0,
          },
        ];

  let classifiedReads = 0;

  for (const seq of effectiveSequences) {
    if (seq.readCount <= 0) continue;

    // If the user uploaded a CSV/TSV with explicit taxonomic names, preserve them honestly
    if (seq.providedTaxon) {
      const cleanName = seq.providedTaxon.trim();
      const parts = cleanName.split(/\s+/);
      const genus = parts[0] || 'Unclassified';
      const existing = taxaMap.get(cleanName);
      if (existing) {
        existing.readCount += seq.readCount;
      } else {
        taxaMap.set(cleanName, {
          sequenceId: seq.sequenceId,
          scientificName: cleanName,
          taxonomicRank: parts.length >= 2 ? 'Species' : 'Genus',
          taxonomicId: 'USER-TABLE',
          referenceDatabase: 'Uploaded Abundance Table',
          similarityPercentage: 100,
          queryCoverage: 100,
          eValue: '0.0',
          confidence: 'High',
          matchStatus: 'Matched',
          readCount: seq.readCount,
          relativeAbundance: 0,
          gcContent: seq.gcContent,
          readLength: seq.sequenceLength,
          lineage: {
            domain: 'Cellular organisms',
            kingdom: 'User-Provided',
            phylum: 'User-Provided',
            class: 'User-Provided',
            order: 'User-Provided',
            family: 'User-Provided',
            genus,
            species: cleanName,
          },
        });
      }
      classifiedReads += seq.readCount;
      continue;
    }

    // Deterministic hash of sequence ID + dataset name for repeatable demonstration assignments
    const digest = crypto
      .createHash('sha256')
      .update(`${seq.sequenceId}:${seq.gcContent}:${seq.sequenceLength}:${input.referenceDatabase}`)
      .digest();
    const refIndex = digest[0] % library.length;
    const simRaw = 87 + (digest[1] % 13) + (digest[2] % 99) / 100;
    const covRaw = 78 + (digest[3] % 22);
    const similarity = Number(Math.min(99.9, simRaw).toFixed(2));
    const coverage = Number(Math.min(100, covRaw).toFixed(1));
    const passedThresholds = similarity >= input.minSimilarity && coverage >= input.minQueryCoverage;

    const ref = library[refIndex];
    const key = passedThresholds ? ref.scientificName : `Unclassified (${seq.sequenceId})`;
    const confidence: TaxonAssignment['confidence'] = !passedThresholds
      ? 'Unverified'
      : similarity >= 97
      ? 'High'
      : similarity >= 92
      ? 'Moderate'
      : 'Low';

    if (passedThresholds) {
      classifiedReads += seq.readCount;
    }

    const existing = taxaMap.get(key);
    if (existing) {
      existing.readCount += seq.readCount;
    } else if (passedThresholds) {
      const exp = Math.max(12, Math.min(160, Math.round((similarity - 80) * 6)));
      taxaMap.set(key, {
        sequenceId: seq.sequenceId,
        scientificName: ref.scientificName,
        commonName: ref.commonName,
        taxonomicRank: ref.rank,
        taxonomicId: ref.taxonomicId,
        referenceDatabase: `${input.referenceDatabase} (Demo)`,
        similarityPercentage: similarity,
        queryCoverage: coverage,
        eValue: `1.2e-${exp}`,
        confidence,
        matchStatus: 'Demonstrated',
        readCount: seq.readCount,
        relativeAbundance: 0,
        gcContent: seq.gcContent,
        readLength: seq.sequenceLength,
        lineage: ref.lineage,
      });
    } else {
      taxaMap.set(key, {
        sequenceId: seq.sequenceId,
        scientificName: 'Unclassified environmental read',
        taxonomicRank: 'Domain',
        taxonomicId: 'UNCLASSIFIED',
        referenceDatabase: input.referenceDatabase,
        similarityPercentage: similarity,
        queryCoverage: coverage,
        eValue: '1.0e-04',
        confidence: 'Unverified',
        matchStatus: 'Unclassified',
        readCount: seq.readCount,
        relativeAbundance: 0,
        gcContent: seq.gcContent,
        readLength: seq.sequenceLength,
        lineage: {
          domain: 'Unclassified',
          kingdom: 'Unclassified',
          phylum: 'Unclassified',
          class: 'Unclassified',
          order: 'Unclassified',
          family: 'Unclassified',
          genus: 'Unclassified',
          species: 'Unclassified environmental read',
        },
      });
    }
  }

  const allAssignments = Array.from(taxaMap.values()).sort((a, b) => b.readCount - a.readCount);
  const totalReads = Math.max(parsed.totalReads, allAssignments.reduce((s, t) => s + t.readCount, 0));

  // Compute exact relative abundances over total reads
  for (const taxon of allAssignments) {
    taxon.relativeAbundance = totalReads > 0 ? Number(((taxon.readCount / totalReads) * 100).toFixed(2)) : 0;
  }

  // Biodiversity metrics calculated strictly over classified taxa
  const classifiedTaxa = allAssignments.filter((t) => t.matchStatus !== 'Unclassified' && t.readCount > 0);
  const speciesRichness = classifiedTaxa.length;
  const totalClassified = classifiedTaxa.reduce((sum, t) => sum + t.readCount, 0);

  let shannonIndex = 0;
  let simpsonSumSq = 0;
  if (totalClassified > 0 && speciesRichness > 0) {
    for (const t of classifiedTaxa) {
      const p = t.readCount / totalClassified;
      if (p > 0) {
        shannonIndex -= p * Math.log(p);
        simpsonSumSq += p * p;
      }
    }
  }
  const simpsonIndex = totalClassified > 0 && speciesRichness > 0 ? Math.max(0, 1 - simpsonSumSq) : 0;
  const pielouEvenness = speciesRichness > 1 ? shannonIndex / Math.log(speciesRichness) : 0;

  // Group by Phylum / Major taxonomic group
  const groupMap = new Map<string, { phylum: string; readCount: number; speciesSet: Set<string> }>();
  for (const t of allAssignments) {
    const groupKey = t.lineage.phylum || 'Unclassified';
    const current = groupMap.get(groupKey) ?? { phylum: groupKey, readCount: 0, speciesSet: new Set() };
    current.readCount += t.readCount;
    if (t.matchStatus !== 'Unclassified') {
      current.speciesSet.add(t.scientificName);
    }
    groupMap.set(groupKey, current);
  }
  const taxonomicSummary: TaxonomicGroupSummary[] = Array.from(groupMap.entries())
    .map(([groupName, item]) => ({
      groupName,
      phylum: item.phylum,
      readCount: item.readCount,
      speciesCount: item.speciesSet.size,
      relativeAbundance: totalReads > 0 ? Number(((item.readCount / totalReads) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.readCount - a.readCount);

  const warnings: string[] = [...parsed.warnings];
  if (totalReads === 0) {
    warnings.push('Dataset contains zero valid reads; diversity metrics cannot be reliably calculated.');
  } else if (speciesRichness <= 1) {
    warnings.push(
      'Fewer than 2 classified taxa met the similarity/coverage thresholds. Pielou evenness and diversity comparisons require at least 2 distinct taxa.'
    );
  } else if (totalClassified < 5) {
    warnings.push(
      `Only ${totalClassified} classified reads passed filters. Small sample sizes yield unstable Shannon and Simpson diversity estimates.`
    );
  }

  const pipelineMode: PipelineMode = parsed.hasProvidedTaxonomy ? 'reference-pipeline' : 'demonstration-mode';
  const disclaimer = parsed.hasProvidedTaxonomy
    ? 'Metrics computed directly from user-supplied taxonomic abundance table.'
    : 'Demonstration Mode: External NCBI BLAST, SILVA, or MIDORI alignment services are not configured. Sequence counts and GC metrics are parsed directly from your uploaded file, while taxonomic assignments are simulated reference demonstrations and must not be reported as verified biological identifications.';

  return {
    pipelineMode,
    disclaimer,
    speciesRichness,
    shannonIndex: Number(shannonIndex.toFixed(4)),
    simpsonIndex: Number(simpsonIndex.toFixed(4)),
    pielouEvenness: Number(pielouEvenness.toFixed(4)),
    totalReads,
    classifiedReads: totalClassified,
    meanGcContent: parsed.meanGcContent,
    meanReadLength: parsed.meanReadLength,
    dataValidityWarning: warnings.length > 0 ? warnings.join(' ') : undefined,
    taxaAssignments: allAssignments.slice(0, 150),
    taxonomicSummary,
  };
}
