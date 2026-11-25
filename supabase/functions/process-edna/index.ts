// Supabase Edge Function: process-edna
// Deploy with: supabase functions deploy process-edna

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-edna-bridge-secret',
};

interface ProcessPayload {
  firebaseAnalysisId: string;
  firebaseDatasetId: string;
  firebaseUserId: string;
  storagePath: string;
  fileFormat: string;
  sampleType: string;
  referenceDatabase: string;
  minSimilarity: number;
  minQueryCoverage: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const blastEndpoint = Deno.env.get('BLAST_PIPELINE_ENDPOINT') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const payload = (await req.json()) as ProcessPayload;

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('edna-datasets')
      .download(payload.storagePath);

    if (downloadError || !fileBlob) {
      return new Response(JSON.stringify({ error: 'Unable to retrieve dataset from Supabase Storage' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawText = await fileBlob.text();

    if (blastEndpoint) {
      const upstream = await fetch(blastEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, rawContent: rawText.slice(0, 500000) }),
      });
      if (upstream.ok) {
        const externalResult = await upstream.json();
        return new Response(JSON.stringify({ ...externalResult, pipelineMode: 'reference-pipeline' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback demonstration parsing inside Edge Function
    const lineCount = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
    return new Response(
      JSON.stringify({
        pipelineMode: 'demonstration-mode',
        lineCount,
        message: 'Edge Function read file successfully; configure BLAST_PIPELINE_ENDPOINT for live reference alignment.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Edge processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
