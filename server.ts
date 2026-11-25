import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import {
  executeBioinformaticsPipeline,
  parseDatasetContent,
} from './server/bioinformatics.ts';
import type {
  AnalysisType,
  ReferenceDatabase,
  SampleType,
  SupportedFormat,
} from './src/types/edna.ts';

dotenv.config();

const PORT = 3000;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const DEFAULT_BOOTSTRAP_ADMIN_EMAIL = (
  process.env.INITIAL_ADMIN_EMAIL || 'kritikaanoushka@gmail.com'
).toLowerCase();

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(cfgPath)) {
    return { projectId: '' };
  }
  return JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as FirebaseAppletConfig;
}

const firebaseConfig = loadFirebaseConfig();
const adminApp =
  firebaseConfig.projectId && firebaseConfig.projectId !== 'remixed-project-id'
    ? getApps().length
      ? getApp()
      : initializeApp({ projectId: firebaseConfig.projectId })
    : null;

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
const supabaseBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'edna-datasets';
const supabaseEdgeFunctionUrl = process.env.SUPABASE_EDGE_FUNCTION_URL?.trim() || '';
const blastPipelineEndpoint = process.env.BLAST_PIPELINE_ENDPOINT?.trim() || '';

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || '';
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// In-memory dataset text cache (used when Supabase Storage is not configured in preview)
// Strictly keyed by `${uid}:${datasetId}` to enforce per-user isolation.
const transientDatasetBuffer = new Map<string, string>();
const serverRoleCache = new Map<string, 'user' | 'admin'>();
const serverAdminAuditLogs: Array<{
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  details: string;
  createdAt: string;
}> = [];

// Sliding-window rate limiter
const rateWindowMap = new Map<string, number[]>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.path}:${(req as AuthedRequest).user?.uid || req.ip || 'anon'}`;
    const now = Date.now();
    const recent = (rateWindowMap.get(key) || []).filter((ts) => now - ts < windowMs);
    if (recent.length >= maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded. Please wait briefly before repeating this operation.',
      });
      return;
    }
    recent.push(now);
    rateWindowMap.set(key, recent);
    next();
  };
}

interface AuthedRequest extends Request {
  user?: DecodedIdToken;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!adminApp) {
    res.status(503).json({ error: 'Firebase project configuration not found on server.' });
    return;
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication token is required.' });
    return;
  }
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(token);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'Verified email address required before accessing API.' });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

async function isVerifiedAdmin(decoded: DecodedIdToken): Promise<boolean> {
  if (!decoded.email_verified) return false;
  const email = (decoded.email || '').toLowerCase();
  if (email && email === DEFAULT_BOOTSTRAP_ADMIN_EMAIL) {
    return true;
  }
  if (serverRoleCache.get(decoded.uid) === 'admin') {
    return true;
  }
  if (supabase) {
    const { data } = await supabase
      .from('user_roles')
      .select('role, account_status')
      .eq('firebase_uid', decoded.uid)
      .maybeSingle();
    if (data && data.role === 'admin' && data.account_status === 'active') {
      serverRoleCache.set(decoded.uid, 'admin');
      return true;
    }
  }
  return false;
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    if (!req.user) return;
    const allowed = await isVerifiedAdmin(req.user);
    if (!allowed) {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    next();
  });
}

function detectFileFormat(fileName: string): SupportedFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.fasta') || lower.endsWith('.fa')) return 'FASTA';
  if (lower.endsWith('.fastq') || lower.endsWith('.fq')) return 'FASTQ';
  if (lower.endsWith('.csv')) return 'CSV';
  if (lower.endsWith('.tsv')) return 'TSV';
  if (lower.endsWith('.txt')) return 'TXT';
  return null;
}

function sanitizePathSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

async function recordAdminAudit(adminUid: string, adminEmail: string, action: string, targetId: string | undefined, details: string) {
  const entry = {
    id: crypto.randomUUID(),
    adminUid,
    adminEmail,
    action,
    targetId,
    details,
    createdAt: new Date().toISOString(),
  };
  serverAdminAuditLogs.unshift(entry);
  if (serverAdminAuditLogs.length > 200) {
    serverAdminAuditLogs.pop();
  }
  if (supabase) {
    await supabase.from('admin_audit_logs').insert({
      admin_uid: adminUid,
      admin_email: adminEmail,
      action,
      target_id: targetId || null,
      details,
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '28mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      firebaseReady: Boolean(adminApp),
      supabaseConfigured: Boolean(supabase),
      geminiConfigured: Boolean(ai),
    });
  });

  // Check current user's server-verified role (used cleanly by /secure-control gate)
  app.get('/api/auth/session', requireAuth, async (req: AuthedRequest, res) => {
    const user = req.user!;
    const admin = await isVerifiedAdmin(user);
    res.json({
      uid: user.uid,
      email: user.email || '',
      emailVerified: Boolean(user.email_verified),
      role: admin ? 'admin' : 'user',
    });
  });

  // Upload & validate eDNA dataset, store in Supabase Storage (or isolated session fallback)
  app.post('/api/datasets/upload', requireAuth, rateLimit(20, 60_000), async (req: AuthedRequest, res) => {
    try {
      const uid = req.user!.uid;
      const {
        datasetId,
        datasetName,
        sampleId,
        fileName,
        sampleType,
        rawContent,
      } = req.body as {
        datasetId?: string;
        datasetName?: string;
        sampleId?: string;
        fileName?: string;
        sampleType?: SampleType;
        rawContent?: string;
      };

      if (!datasetId || !/^[a-zA-Z0-9_-]{1,128}$/.test(datasetId)) {
        res.status(400).json({ error: 'Invalid dataset identifier.' });
        return;
      }
      if (!fileName || typeof rawContent !== 'string') {
        res.status(400).json({ error: 'Dataset fileName and content are required.' });
        return;
      }

      const fileFormat = detectFileFormat(fileName);
      if (!fileFormat) {
        res.status(400).json({
          error: 'Unsupported file format. Accepted extensions: .fasta, .fa, .fastq, .fq, .csv, .tsv, .txt',
        });
        return;
      }

      const fileSizeBytes = Buffer.byteLength(rawContent, 'utf-8');
      if (fileSizeBytes === 0 || fileSizeBytes > MAX_UPLOAD_BYTES) {
        res.status(400).json({ error: 'File must be non-empty and under 25 MB.' });
        return;
      }

      const parsed = parseDatasetContent(rawContent, fileFormat);
      const safeFileName = sanitizePathSegment(fileName);
      const storagePath = `${sanitizePathSegment(uid)}/${datasetId}/${safeFileName}`;
      let supabaseDatasetId = `local_${datasetId}`;
      let storageMode: 'supabase' | 'session-buffer' = 'session-buffer';

      // Always keep a bounded copy in the isolated server buffer as fallback if Supabase isn't configured
      transientDatasetBuffer.set(`${uid}:${datasetId}`, rawContent);

      if (supabase) {
        const { error: uploadError } = await supabase.storage
          .from(supabaseBucket)
          .upload(storagePath, Buffer.from(rawContent, 'utf-8'), {
            contentType: 'text/plain;charset=utf-8',
            upsert: true,
          });

        if (!uploadError) {
          storageMode = 'supabase';
          const { data: jobRow, error: jobError } = await supabase
            .from('dataset_processing_jobs')
            .upsert(
              {
                firebase_dataset_id: datasetId,
                firebase_user_id: uid,
                dataset_name: (datasetName || safeFileName).slice(0, 160),
                file_name: safeFileName,
                file_format: fileFormat,
                sample_type: sampleType || 'Freshwater',
                storage_path: storagePath,
                sequence_count: parsed.sequenceCount,
                status: 'uploaded',
              },
              { onConflict: 'firebase_dataset_id' }
            )
            .select('id')
            .single();

          if (!jobError && jobRow?.id) {
            supabaseDatasetId = jobRow.id;
            const sampleSeqs = parsed.sequences.slice(0, 100).map((seq) => ({
              job_id: jobRow.id,
              firebase_dataset_id: datasetId,
              firebase_user_id: uid,
              sequence_id: seq.sequenceId.slice(0, 120),
              header: seq.header.slice(0, 200),
              sequence_length: seq.sequenceLength,
              gc_content: seq.gcContent,
              mean_quality: seq.meanQuality,
            }));
            if (sampleSeqs.length > 0) {
              await supabase.from('sequence_records').insert(sampleSeqs);
            }
          }
        }
      }

      res.json({
        datasetId,
        fileFormat,
        fileSizeBytes,
        sequenceCount: parsed.sequenceCount,
        totalReads: parsed.totalReads,
        meanGcContent: parsed.meanGcContent,
        meanReadLength: parsed.meanReadLength,
        previewSnippet: parsed.previewSnippet,
        storagePath,
        supabaseDatasetId,
        storageMode,
        sampleId: sampleId || '',
        warnings: parsed.warnings,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to process dataset upload.',
      });
    }
  });

  // Delete dataset file from Supabase Storage / server buffer
  app.delete('/api/datasets/:datasetId', requireAuth, async (req: AuthedRequest, res) => {
    const uid = req.user!.uid;
    const datasetId = String(req.params.datasetId || '');
    const storagePath = typeof req.body?.storagePath === 'string' ? req.body.storagePath : '';
    transientDatasetBuffer.delete(`${uid}:${datasetId}`);

    if (supabase && storagePath) {
      const admin = await isVerifiedAdmin(req.user!);
      if (storagePath.startsWith(`${sanitizePathSegment(uid)}/`) || admin) {
        await supabase.storage.from(supabaseBucket).remove([storagePath]);
        await supabase.from('dataset_processing_jobs').delete().eq('firebase_dataset_id', datasetId);
      }
    }
    res.json({ deleted: true });
  });

  // Execute eDNA Bioinformatics Analysis
  app.post('/api/analyses/run', requireAuth, rateLimit(15, 60_000), async (req: AuthedRequest, res) => {
    try {
      const uid = req.user!.uid;
      const {
        analysisId,
        datasetId,
        datasetName,
        fileFormat,
        sampleType,
        storagePath,
        analysisType,
        referenceDatabase,
        minSimilarity,
        maxEValue,
        minQueryCoverage,
        inlineContent,
      } = req.body as {
        analysisId?: string;
        datasetId?: string;
        datasetName?: string;
        fileFormat?: SupportedFormat;
        sampleType?: SampleType;
        storagePath?: string;
        analysisType?: AnalysisType;
        referenceDatabase?: ReferenceDatabase;
        minSimilarity?: number;
        maxEValue?: string;
        minQueryCoverage?: number;
        inlineContent?: string;
      };

      if (!analysisId || !datasetId || !fileFormat || !sampleType || !analysisType || !referenceDatabase) {
        res.status(400).json({ error: 'Missing required analysis configuration parameters.' });
        return;
      }

      // Retrieve raw file content from Supabase Storage, Edge Function, transient buffer, or inline preview
      let rawContent = transientDatasetBuffer.get(`${uid}:${datasetId}`) || '';

      if (!rawContent && supabase && storagePath && storagePath.startsWith(`${sanitizePathSegment(uid)}/`)) {
        const { data: blob } = await supabase.storage.from(supabaseBucket).download(storagePath);
        if (blob) {
          rawContent = await blob.text();
        }
      }

      if (!rawContent && typeof inlineContent === 'string' && inlineContent.trim().length > 0) {
        rawContent = inlineContent;
      }

      if (!rawContent) {
        res.status(400).json({
          error:
            'Dataset sequence payload was not found in storage. Re-upload the dataset or ensure Supabase Storage is configured.',
        });
        return;
      }

      // Optional Supabase Edge Function delegation if configured
      if (supabaseEdgeFunctionUrl && supabaseServiceKey) {
        try {
          await fetch(supabaseEdgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              firebaseAnalysisId: analysisId,
              firebaseDatasetId: datasetId,
              firebaseUserId: uid,
              storagePath: storagePath || '',
              fileFormat,
              sampleType,
              referenceDatabase,
              minSimilarity: Number(minSimilarity) || 90,
              minQueryCoverage: Number(minQueryCoverage) || 70,
            }),
          });
        } catch {
          // Continue with server bioinformatics pipeline
        }
      }

      const output = await executeBioinformaticsPipeline({
        datasetName: datasetName || datasetId,
        fileFormat,
        sampleType,
        analysisType,
        referenceDatabase,
        minSimilarity: Number(minSimilarity) || 90,
        maxEValue: maxEValue || '1e-10',
        minQueryCoverage: Number(minQueryCoverage) || 70,
        rawContent,
        blastEndpoint: blastPipelineEndpoint || undefined,
      });

      let supabaseResultId = `sb_${analysisId}`;
      if (supabase) {
        const { data: jobRow } = await supabase
          .from('dataset_processing_jobs')
          .select('id')
          .eq('firebase_dataset_id', datasetId)
          .maybeSingle();

        if (jobRow?.id) {
          await supabase
            .from('dataset_processing_jobs')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', jobRow.id);

          const { data: metricRow } = await supabase
            .from('biodiversity_metrics')
            .upsert(
              {
                job_id: jobRow.id,
                firebase_analysis_id: analysisId,
                firebase_dataset_id: datasetId,
                firebase_user_id: uid,
                species_richness: output.speciesRichness,
                shannon_index: output.shannonIndex,
                simpson_index: output.simpsonIndex,
                pielou_evenness: output.pielouEvenness,
                total_reads: output.totalReads,
                classified_reads: output.classifiedReads,
                pipeline_mode: output.pipelineMode,
              },
              { onConflict: 'firebase_analysis_id' }
            )
            .select('id')
            .single();

          if (metricRow?.id) {
            supabaseResultId = metricRow.id;
          }

          const taxaRows = output.taxaAssignments.slice(0, 100).map((t) => ({
            job_id: jobRow.id,
            firebase_analysis_id: analysisId,
            firebase_user_id: uid,
            sequence_id: t.sequenceId,
            reference_database: t.referenceDatabase,
            taxonomic_id: t.taxonomicId,
            scientific_name: t.scientificName,
            taxonomic_rank: t.taxonomicRank,
            domain_name: t.lineage.domain,
            kingdom_name: t.lineage.kingdom,
            phylum_name: t.lineage.phylum,
            class_name: t.lineage.class,
            order_name: t.lineage.order,
            family_name: t.lineage.family,
            genus_name: t.lineage.genus,
            species_name: t.lineage.species,
            similarity_pct: t.similarityPercentage,
            query_coverage_pct: t.queryCoverage,
            e_value: t.eValue,
            confidence: t.confidence,
            match_status: t.matchStatus,
            read_count: t.readCount,
          }));
          if (taxaRows.length > 0) {
            await supabase.from('taxonomic_assignments').insert(taxaRows);
          }

          await supabase.from('analysis_logs').insert({
            job_id: jobRow.id,
            firebase_analysis_id: analysisId,
            firebase_user_id: uid,
            level: 'info',
            stage: output.pipelineMode,
            message: `Completed ${analysisType} on ${output.totalReads} reads (${output.speciesRichness} taxa).`,
          });
        }
      }

      res.json({
        ...output,
        supabaseResultId,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Bioinformatics analysis execution failed.',
      });
    }
  });

  // Server-side Gemini AI interpretation of verified biodiversity metrics
  app.post('/api/gemini/interpret', requireAuth, rateLimit(12, 60_000), async (req: AuthedRequest, res) => {
    try {
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
        return;
      }

      const {
        datasetName,
        sampleType,
        collectionLocation,
        pipelineMode,
        referenceDatabase,
        speciesRichness,
        shannonIndex,
        simpsonIndex,
        pielouEvenness,
        totalReads,
        classifiedReads,
        topTaxa,
      } = req.body as {
        datasetName: string;
        sampleType?: string;
        collectionLocation?: string;
        pipelineMode: string;
        referenceDatabase: string;
        speciesRichness: number;
        shannonIndex: number;
        simpsonIndex: number;
        pielouEvenness: number;
        totalReads: number;
        classifiedReads: number;
        topTaxa: Array<{ scientificName: string; phylum: string; relativeAbundance: number; matchStatus: string }>;
      };

      if (!datasetName || typeof speciesRichness !== 'number') {
        res.status(400).json({ error: 'Valid biodiversity result metrics are required.' });
        return;
      }

      const safeSummary = {
        datasetName: String(datasetName).slice(0, 140),
        sampleType: String(sampleType || 'Unknown').slice(0, 60),
        collectionLocation: String(collectionLocation || 'Not specified').slice(0, 140),
        pipelineMode,
        referenceDatabase,
        speciesRichness,
        shannonIndex,
        simpsonIndex,
        pielouEvenness,
        totalReads,
        classifiedReads,
        topTaxa: Array.isArray(topTaxa) ? topTaxa.slice(0, 12) : [],
      };

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Provide a concise, objective scientific interpretation of the following eDNA biodiversity assessment summary:\n${JSON.stringify(
          safeSummary,
          null,
          2
        )}`,
        config: {
          systemInstruction:
            'You are a careful ecological bioinformatics assistant for eDNA Explorer. ' +
            'ONLY interpret the numeric biodiversity metrics, read counts, and taxon list explicitly provided in the JSON payload. ' +
            'NEVER invent new species names, NEVER claim unverified species were detected from raw DNA, and NEVER fabricate field measurements. ' +
            'If pipelineMode is "demonstration-mode", explicitly open with a clear 1-sentence note stating these assignments come from Demonstration Mode rather than a live NCBI BLAST/SILVA alignment. ' +
            'Organize into 3 brief sections: Ecological Diversity Interpretation, Taxonomic Composition Notes, and Methodological Limitations & Next Steps. Keep under 280 words.',
        },
      });

      const interpretation = response.text?.trim();
      if (!interpretation) {
        res.status(502).json({ error: 'Gemini returned an empty interpretation.' });
        return;
      }

      res.json({ interpretation });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to generate AI interpretation.',
      });
    }
  });

  // Protected Admin Endpoints (/api/admin/*)
  app.get('/api/admin/status', requireAdmin, async (req: AuthedRequest, res) => {
    let supabaseConnected = false;
    let totalSupabaseJobs = 0;

    if (supabase) {
      const { count, error } = await supabase
        .from('dataset_processing_jobs')
        .select('*', { count: 'exact', head: true });
      if (!error) {
        supabaseConnected = true;
        totalSupabaseJobs = count || 0;
      }
    }

    await recordAdminAudit(
      req.user!.uid,
      req.user!.email || '',
      'VIEW_ADMIN_DASHBOARD',
      undefined,
      'Verified admin accessed /secure-control system status'
    );

    res.json({
      systemHealth: {
        supabaseConfigured: Boolean(supabase),
        supabaseConnected,
        edgeFunctionConfigured: Boolean(supabaseEdgeFunctionUrl),
        blastPipelineConfigured: Boolean(blastPipelineEndpoint),
        geminiConfigured: Boolean(ai),
        firebaseAdminReady: Boolean(adminApp),
        pipelineMode: blastPipelineEndpoint ? 'reference-pipeline' : 'demonstration-mode',
      },
      totalSupabaseJobs,
      auditLogs: serverAdminAuditLogs.slice(0, 50),
    });
  });

  app.post('/api/admin/roles', requireAdmin, rateLimit(20, 60_000), async (req: AuthedRequest, res) => {
    const { targetUid, targetEmail, newRole, accountStatus } = req.body as {
      targetUid?: string;
      targetEmail?: string;
      newRole?: 'user' | 'admin';
      accountStatus?: 'active' | 'deactivated';
    };

    if (!targetUid || !/^[a-zA-Z0-9_-]{1,128}$/.test(targetUid)) {
      res.status(400).json({ error: 'Invalid target user UID.' });
      return;
    }

    if (newRole && (newRole === 'user' || newRole === 'admin')) {
      serverRoleCache.set(targetUid, newRole);
    }

    if (supabase) {
      await supabase.from('user_roles').upsert(
        {
          firebase_uid: targetUid,
          email: targetEmail || '',
          role: newRole || 'user',
          account_status: accountStatus || 'active',
          granted_by: req.user!.email || req.user!.uid,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'firebase_uid' }
      );
    }

    await recordAdminAudit(
      req.user!.uid,
      req.user!.email || '',
      'UPDATE_USER_ACCESS',
      targetUid,
      `Set role=${newRole || 'unchanged'}, status=${accountStatus || 'unchanged'}`
    );

    res.json({ updated: true, targetUid });
  });

  app.post('/api/admin/audit', requireAdmin, async (req: AuthedRequest, res) => {
    const { action, targetId, details } = req.body as {
      action?: string;
      targetId?: string;
      details?: string;
    };
    if (!action || typeof action !== 'string') {
      res.status(400).json({ error: 'Action is required.' });
      return;
    }
    await recordAdminAudit(
      req.user!.uid,
      req.user!.email || '',
      action.slice(0, 120),
      targetId?.slice(0, 128),
      (details || '').slice(0, 500)
    );
    res.json({ logged: true });
  });

  // Vite middleware in dev, static dist in production
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(process.cwd(), 'dist'));
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`eDNA Explorer server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start eDNA Explorer server:', err);
  process.exit(1);
});
