export type UserCategory =
  | 'Student'
  | 'Research Scholar'
  | 'Environmental Scientist'
  | 'Researcher'
  | 'General User';

export type UserRole = 'user' | 'admin';
export type AccountStatus = 'active' | 'deactivated';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  institution: string;
  country: string;
  researchInterest: string;
  userCategory: UserCategory;
  role: UserRole;
  accountStatus: AccountStatus;
  photoUrl?: string;
  notificationsEnabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SupportedFormat = 'FASTA' | 'FASTQ' | 'CSV' | 'TSV' | 'TXT';
export type SampleType = 'Freshwater' | 'Marine Water' | 'Soil' | 'Sediment' | 'Air' | 'Other';
export type DatasetStatus = 'uploaded' | 'processing' | 'analysed' | 'failed';

export interface DatasetRecord {
  datasetId: string;
  userId: string;
  datasetName: string;
  sampleId: string;
  fileName: string;
  fileFormat: SupportedFormat;
  fileSizeBytes: number;
  sequenceCount: number;
  sampleType: SampleType;
  collectionLocation: string;
  collectionDate: string;
  environmentalDescription?: string;
  notes?: string;
  storagePath: string;
  supabaseDatasetId: string;
  previewSnippet?: string;
  status: DatasetStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AnalysisType =
  | 'Taxonomic Identification'
  | 'Species Diversity Assessment'
  | 'Taxonomic Composition Analysis'
  | 'Species Richness Analysis'
  | 'Biodiversity Comparison'
  | 'Sequence Quality Assessment';

export type ReferenceDatabase =
  | 'NCBI BLAST / Taxonomy'
  | 'SILVA rRNA'
  | 'MIDORI Mitochondrial'
  | 'Multi-Reference';

export type PipelineMode = 'reference-pipeline' | 'demonstration-mode';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AnalysisRecord {
  analysisId: string;
  datasetId: string;
  userId: string;
  datasetName: string;
  analysisType: AnalysisType;
  referenceDatabase: ReferenceDatabase;
  minSimilarity: number;
  maxEValue: string;
  minQueryCoverage: number;
  pipelineMode: PipelineMode;
  status: AnalysisStatus;
  progress: number;
  resultId?: string;
  errorMessage?: string;
  createdAt?: unknown;
  completedAt?: unknown;
  updatedAt?: unknown;
}

export interface TaxonAssignment {
  sequenceId: string;
  scientificName: string;
  commonName?: string;
  taxonomicRank: 'Species' | 'Genus' | 'Family' | 'Order' | 'Class' | 'Phylum' | 'Kingdom' | 'Domain';
  taxonomicId: string;
  referenceDatabase: string;
  similarityPercentage: number;
  queryCoverage: number;
  eValue: string;
  confidence: 'High' | 'Moderate' | 'Low' | 'Unverified';
  matchStatus: 'Matched' | 'Demonstrated' | 'Ambiguous' | 'Unclassified';
  readCount: number;
  relativeAbundance: number;
  gcContent?: number;
  readLength?: number;
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

export interface TaxonomicGroupSummary {
  groupName: string;
  phylum: string;
  readCount: number;
  speciesCount: number;
  relativeAbundance: number;
}

export interface AnalysisResultRecord {
  resultId: string;
  analysisId: string;
  datasetId: string;
  userId: string;
  datasetName: string;
  analysisType: AnalysisType;
  pipelineMode: PipelineMode;
  referenceDatabase: ReferenceDatabase;
  disclaimer: string;
  speciesRichness: number;
  shannonIndex: number;
  simpsonIndex: number;
  pielouEvenness: number;
  totalReads: number;
  classifiedReads: number;
  meanGcContent?: number;
  meanReadLength?: number;
  dataValidityWarning?: string;
  taxaCount?: number;
  supabaseResultId?: string;
  aiInterpretation?: string;
  taxaAssignments: TaxonAssignment[];
  taxonomicSummary?: TaxonomicGroupSummary[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationRecord {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: 'upload' | 'analysis' | 'report' | 'system';
  read: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ActivityLogRecord {
  logId: string;
  userId: string;
  actorRole: 'user' | 'admin';
  action: string;
  details: string;
  createdAt?: unknown;
}

export interface ReportRecord {
  reportId: string;
  userId: string;
  analysisId: string;
  datasetId: string;
  resultId: string;
  title: string;
  pipelineMode: PipelineMode;
  isShared: boolean;
  shareCode?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SystemHealthStatus {
  supabaseConfigured: boolean;
  supabaseConnected: boolean;
  edgeFunctionConfigured: boolean;
  blastPipelineConfigured: boolean;
  geminiConfigured: boolean;
  firebaseAdminReady: boolean;
  pipelineMode: PipelineMode;
}
