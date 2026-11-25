-- eDNA Explorer — Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Execute in Supabase SQL Editor to configure tables, storage bucket, and RLS policies.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Server-Verified User Roles (synced with Firebase UID)
CREATE TABLE IF NOT EXISTS public.user_roles (
  firebase_uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'deactivated')),
  granted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Dataset Processing Jobs
CREATE TABLE IF NOT EXISTS public.dataset_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_dataset_id TEXT NOT NULL UNIQUE,
  firebase_user_id TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('FASTA', 'FASTQ', 'CSV', 'TSV', 'TXT')),
  sample_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  sequence_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user ON public.dataset_processing_jobs(firebase_user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_dataset ON public.dataset_processing_jobs(firebase_dataset_id);

-- 3. Parsed Sequence Records
CREATE TABLE IF NOT EXISTS public.sequence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.dataset_processing_jobs(id) ON DELETE CASCADE,
  firebase_dataset_id TEXT NOT NULL,
  firebase_user_id TEXT NOT NULL,
  sequence_id TEXT NOT NULL,
  header TEXT,
  sequence_length INTEGER NOT NULL,
  gc_content NUMERIC(5,2) NOT NULL DEFAULT 0,
  mean_quality NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequences_job ON public.sequence_records(job_id);
CREATE INDEX IF NOT EXISTS idx_sequences_user ON public.sequence_records(firebase_user_id);

-- 4. Taxonomic Assignments
CREATE TABLE IF NOT EXISTS public.taxonomic_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.dataset_processing_jobs(id) ON DELETE CASCADE,
  firebase_analysis_id TEXT NOT NULL,
  firebase_user_id TEXT NOT NULL,
  sequence_id TEXT NOT NULL,
  reference_database TEXT NOT NULL,
  taxonomic_id TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  taxonomic_rank TEXT NOT NULL,
  domain_name TEXT NOT NULL,
  kingdom_name TEXT NOT NULL,
  phylum_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  order_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  genus_name TEXT NOT NULL,
  species_name TEXT NOT NULL,
  similarity_pct NUMERIC(5,2) NOT NULL,
  query_coverage_pct NUMERIC(5,2) NOT NULL,
  e_value TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('High', 'Moderate', 'Low', 'Unverified')),
  match_status TEXT NOT NULL CHECK (match_status IN ('Matched', 'Demonstrated', 'Ambiguous', 'Unclassified')),
  read_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taxa_analysis ON public.taxonomic_assignments(firebase_analysis_id);
CREATE INDEX IF NOT EXISTS idx_taxa_user ON public.taxonomic_assignments(firebase_user_id);

-- 5. Biodiversity Metrics
CREATE TABLE IF NOT EXISTS public.biodiversity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.dataset_processing_jobs(id) ON DELETE CASCADE,
  firebase_analysis_id TEXT NOT NULL UNIQUE,
  firebase_dataset_id TEXT NOT NULL,
  firebase_user_id TEXT NOT NULL,
  species_richness INTEGER NOT NULL,
  shannon_index NUMERIC(6,4) NOT NULL,
  simpson_index NUMERIC(6,4) NOT NULL,
  pielou_evenness NUMERIC(6,4) NOT NULL,
  total_reads INTEGER NOT NULL,
  classified_reads INTEGER NOT NULL,
  pipeline_mode TEXT NOT NULL CHECK (pipeline_mode IN ('reference-pipeline', 'demonstration-mode')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_user ON public.biodiversity_metrics(firebase_user_id);

-- 6. Analysis Processing Logs
CREATE TABLE IF NOT EXISTS public.analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.dataset_processing_jobs(id) ON DELETE CASCADE,
  firebase_analysis_id TEXT NOT NULL,
  firebase_user_id TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_analysis ON public.analysis_logs(firebase_analysis_id);

-- 7. Administrative Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_uid TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on ALL tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomic_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biodiversity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Strict RLS Policies (Deny anon access; allow owner via JWT sub or server service_role)
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT USING ((auth.jwt() ->> 'sub') = firebase_uid);

CREATE POLICY "jobs_owner_all" ON public.dataset_processing_jobs
  FOR ALL USING ((auth.jwt() ->> 'sub') = firebase_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = firebase_user_id);

CREATE POLICY "sequences_owner_all" ON public.sequence_records
  FOR ALL USING ((auth.jwt() ->> 'sub') = firebase_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = firebase_user_id);

CREATE POLICY "taxa_owner_all" ON public.taxonomic_assignments
  FOR ALL USING ((auth.jwt() ->> 'sub') = firebase_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = firebase_user_id);

CREATE POLICY "metrics_owner_all" ON public.biodiversity_metrics
  FOR ALL USING ((auth.jwt() ->> 'sub') = firebase_user_id)
  WITH CHECK ((auth.jwt() ->> 'sub') = firebase_user_id);

CREATE POLICY "analysis_logs_owner_select" ON public.analysis_logs
  FOR SELECT USING ((auth.jwt() ->> 'sub') = firebase_user_id);

-- admin_audit_logs has NO public/authenticated select policy; accessible exclusively via server service_role.

-- Private Storage Bucket for eDNA Datasets
INSERT INTO storage.buckets (id, name, public)
VALUES ('edna-datasets', 'edna-datasets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "storage_owner_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'edna-datasets'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "storage_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'edna-datasets'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );

CREATE POLICY "storage_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'edna-datasets'
    AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
  );
