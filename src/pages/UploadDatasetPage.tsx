import React, { useRef, useState } from 'react';
import {
  Eye,
  FileCode2,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../components/ToastContext';
import type { DatasetRecord, SampleType } from '../types/edna';

interface UploadDatasetPageProps {
  navigate: (path: string) => void;
}

const SAMPLE_TYPES: SampleType[] = [
  'Freshwater',
  'Marine Water',
  'Soil',
  'Sediment',
  'Air',
  'Other',
];

const ALLOWED_EXTENSIONS = ['.fasta', '.fa', '.fastq', '.fq', '.csv', '.tsv', '.txt'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const SAMPLE_FASTA_CONTENT = `>SEQ_001_COI_Watershed_A
ATGGCCTAGCATGCTAGCATCGATCGATGCTAGCTAGCATGCATGCTAGCTAGCATCGAT
GCTAGCATGCATGCTAGCATCGATCGATGCTAGCATGCATGCTAGCATCGATCGTAGCTA
>SEQ_002_12S_Watershed_A
GCTAGCATCGATCGATGCTAGCATGCATGCTAGCATCGATCGATCGATGCTAGCTAGCAT
GCATGCTAGCATCGATGCTAGCATGCATGCTAGCATCGATCGATCGATGCTAGCATGCAT
>SEQ_003_18S_Watershed_A
TTAGCCGGATCGATGCTAGCATGCATGCTAGCATCGATCGATCGATGCTAGCTAGCATGC
ATGCTAGCATCGATGCTAGCATGCATGCTAGCATCGATCGATCGATGCTAGCATGCATCG
>SEQ_004_16S_Watershed_A
CCGGATAGCATGCATGCTAGCATCGATCGATGCTAGCTAGCATGCATGCTAGCATCGATC
GATCGATGCTAGCATGCATGCTAGCATCGATCGATGCTAGCATGCATGCTAGCATCGATG
>SEQ_005_ITS_Watershed_A
AATTCCGGATCGATGCTAGCATGCATGCTAGCATCGATCGATGCTAGCTAGCATGCATGC
TAGCATCGATCGATGCTAGCATGCATGCTAGCATCGATCGATGCTAGCATGCATGCTAGC`;

export const UploadDatasetPage: React.FC<UploadDatasetPageProps> = ({ navigate }) => {
  const { datasets, uploadDataset, removeDataset } = useData();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; content: string }>>([]);
  const [dragActive, setDragActive] = useState(false);

  const [datasetName, setDatasetName] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [collectionLocation, setCollectionLocation] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [sampleType, setSampleType] = useState<SampleType>('Freshwater');
  const [environmentalDescription, setEnvironmentalDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDataset, setPreviewDataset] = useState<DatasetRecord | null>(null);

  const validateAndReadFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const validEntries: Array<{ file: File; content: string }> = [];

    for (const file of incoming) {
      const lower = file.name.toLowerCase();
      if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        showToast(
          'Unsupported file format',
          `${file.name} is not a supported format (.fasta, .fa, .fastq, .fq, .csv, .tsv, .txt).`,
          'error'
        );
        continue;
      }
      if (file.size === 0 || file.size > MAX_FILE_SIZE_BYTES) {
        showToast(
          'Invalid file size',
          `${file.name} must be non-empty and under 25 MB.`,
          'error'
        );
        continue;
      }
      const text = await file.text();
      validEntries.push({ file, content: text });
    }

    if (validEntries.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validEntries]);
      if (!datasetName) {
        setDatasetName(validEntries[0].file.name.replace(/\.[^.]+$/, ''));
      }
      if (!sampleId) {
        setSampleId(`SMP-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  const handleLoadSampleFasta = () => {
    const file = new File([SAMPLE_FASTA_CONTENT], 'river_watershed_sample.fasta', {
      type: 'text/plain',
    });
    setSelectedFiles([{ file, content: SAMPLE_FASTA_CONTENT }]);
    setDatasetName('Temperate Watershed Transect A');
    setSampleId('WS-2026-01');
    setCollectionLocation('Upper River Basin, Site 4');
    setSampleType('Freshwater');
    setEnvironmentalDescription('Cool clear freshwater stream, pH 7.2, dissolved oxygen 9.4 mg/L.');
    showToast('Sample FASTA loaded', 'Review metadata and click Upload Dataset.', 'info');
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (selectedFiles.length === 0) {
      showToast('No file selected', 'Drag and drop or browse at least one eDNA dataset file.', 'error');
      return;
    }
    if (!datasetName.trim() || !sampleId.trim() || !collectionLocation.trim()) {
      showToast('Missing metadata', 'Dataset Name, Sample ID, and Collection Location are required.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const entry = selectedFiles[i];
        const suffix = selectedFiles.length > 1 ? ` (${i + 1})` : '';
        setUploadProgress(Math.round(((i + 0.5) / selectedFiles.length) * 90));
        await uploadDataset({
          file: entry.file,
          rawContent: entry.content,
          datasetName: `${datasetName.trim()}${suffix}`,
          sampleId: selectedFiles.length > 1 ? `${sampleId.trim()}-${i + 1}` : sampleId.trim(),
          collectionLocation,
          collectionDate,
          sampleType,
          environmentalDescription,
          notes,
        });
      }
      setUploadProgress(100);
      showToast(
        'Upload complete',
        `${selectedFiles.length} dataset${selectedFiles.length > 1 ? 's' : ''} saved and indexed.`,
        'success'
      );
      setSelectedFiles([]);
      setDatasetName('');
      setSampleId('');
      setEnvironmentalDescription('');
      setNotes('');
    } catch (err) {
      showToast('Upload failed', err instanceof Error ? err.message : 'Unable to upload dataset.', 'error');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  };

  const handleDelete = async (ds: DatasetRecord) => {
    try {
      await removeDataset(ds);
      if (previewDataset?.datasetId === ds.datasetId) setPreviewDataset(null);
      showToast('Dataset deleted', `${ds.datasetName} removed.`, 'info');
    } catch (err) {
      showToast('Delete failed', err instanceof Error ? err.message : 'Could not delete dataset.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Form */}
        <section className="lg:col-span-7 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-[#102A43] dark:text-white">
                Upload eDNA Dataset
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supported: FASTA (.fasta, .fa), FASTQ (.fastq, .fq), CSV, TSV, TXT (Max 25 MB)
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadSampleFasta}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-emerald-900 rounded-lg hover:bg-slate-50 dark:hover:bg-emerald-950/40"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
              Load Sample FASTA
            </button>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.length) {
                  void validateAndReadFiles(e.dataTransfer.files);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragActive
                  ? 'border-[#16A34A] bg-[#DCFCE7]/40 dark:bg-emerald-950/40'
                  : 'border-slate-300 dark:border-emerald-900 bg-[#F8FAF7] dark:bg-[#0E1913]'
              }`}
            >
              <UploadCloud className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#102A43] dark:text-white">
                Drag and drop sequence files here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                Multiple files supported for batch upload
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={(e) => {
                  if (e.target.files?.length) void validateAndReadFiles(e.target.files);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold bg-white dark:bg-[#111C16] border border-slate-300 dark:border-emerald-900 rounded-lg hover:bg-slate-50"
              >
                Browse Files
              </button>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((entry, idx) => (
                  <div
                    key={`${entry.file.name}_${idx}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#DCFCE7]/40 dark:bg-emerald-950/40 border border-[#16A34A]/30 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCode2 className="w-4 h-4 text-[#14532D] dark:text-[#4ADE80] shrink-0" />
                      <span className="font-mono truncate">{entry.file.name}</span>
                      <span className="text-slate-500 font-mono shrink-0">
                        {(entry.file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-rose-600 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Dataset Name</label>
                <input
                  type="text"
                  required
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="Upper Estuary Transect 01"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Sample ID</label>
                <input
                  type="text"
                  required
                  value={sampleId}
                  onChange={(e) => setSampleId(e.target.value)}
                  placeholder="SMP-2026-042"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Collection Location</label>
                <input
                  type="text"
                  required
                  value={collectionLocation}
                  onChange={(e) => setCollectionLocation(e.target.value)}
                  placeholder="Kaveri River Basin"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Collection Date</label>
                <input
                  type="date"
                  required
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">Sample Type</label>
                <select
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value as SampleType)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
                >
                  {SAMPLE_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Environmental Description</label>
              <textarea
                rows={2}
                value={environmentalDescription}
                onChange={(e) => setEnvironmentalDescription(e.target.value)}
                placeholder="Water temperature, pH, canopy cover, turbidity, or substrate characteristics..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Additional Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Primer pair (e.g., MiFish-U, 16S V4), filter pore size, replicate ID"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410]"
              />
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span>Uploading & validating sequences</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-emerald-950 overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              Upload Dataset
            </button>
          </form>
        </section>

        {/* Live Preview Panel */}
        <section className="lg:col-span-5 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 flex flex-col">
          <h3 className="text-base font-bold text-[#102A43] dark:text-white mb-2">
            Dataset Sequence Preview
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Inspect raw FASTA/FASTQ headers or tabular rows before running taxonomic pipelines.
          </p>

          {selectedFiles.length > 0 ? (
            <pre className="flex-1 p-4 rounded-xl bg-[#0B1410] text-[#DCFCE7] text-xs font-mono overflow-auto max-h-96 leading-relaxed">
              {selectedFiles[0].content.slice(0, 2200)}
            </pre>
          ) : previewDataset ? (
            <div className="flex-1 flex flex-col">
              <div className="text-xs space-y-1 mb-3 pb-3 border-b border-slate-200 dark:border-emerald-950">
                <p className="font-semibold text-[#102A43] dark:text-white">
                  {previewDataset.datasetName}
                </p>
                <p className="text-slate-500 font-mono">
                  {previewDataset.fileFormat} · {previewDataset.sequenceCount} sequences · {previewDataset.sampleType}
                </p>
              </div>
              <pre className="flex-1 p-4 rounded-xl bg-[#0B1410] text-[#DCFCE7] text-xs font-mono overflow-auto max-h-80 leading-relaxed">
                {previewDataset.previewSnippet || 'No preview snippet available.'}
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 dark:border-emerald-900 rounded-xl p-8 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a file above or click Preview on an uploaded dataset below.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Uploaded Datasets Management Table */}
      <section className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#102A43] dark:text-white">
            Uploaded Datasets ({datasets.length})
          </h3>
          <button
            type="button"
            onClick={() => navigate('/analysis')}
            className="text-xs font-semibold text-[#16A34A] hover:underline"
          >
            Go to eDNA Analysis →
          </button>
        </div>

        {datasets.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">
            You have not uploaded any eDNA datasets yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-emerald-950 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-semibold">Dataset Name</th>
                  <th className="py-2.5 px-3 font-semibold">Sample ID</th>
                  <th className="py-2.5 px-3 font-semibold">Format</th>
                  <th className="py-2.5 px-3 font-semibold">Habitat</th>
                  <th className="py-2.5 px-3 font-semibold">Location</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Sequences</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 pl-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-950/60">
                {datasets.map((ds) => (
                  <tr key={ds.datasetId} className="hover:bg-slate-50/70 dark:hover:bg-emerald-950/20">
                    <td className="py-3 pr-4 font-semibold text-[#102A43] dark:text-white">{ds.datasetName}</td>
                    <td className="py-3 px-3 font-mono">{ds.sampleId}</td>
                    <td className="py-3 px-3 font-mono">{ds.fileFormat}</td>
                    <td className="py-3 px-3">{ds.sampleType}</td>
                    <td className="py-3 px-3">{ds.collectionLocation}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{ds.sequenceCount}</td>
                    <td className="py-3 px-3 font-mono text-[#16A34A]">{ds.status}</td>
                    <td className="py-3 pl-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewDataset(ds)}
                          title="Preview sequence snippet"
                          className="p-1.5 rounded-md border border-slate-200 dark:border-emerald-900 hover:bg-slate-100 dark:hover:bg-emerald-950"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ds)}
                          title="Delete dataset"
                          className="p-1.5 rounded-md border border-slate-200 dark:border-emerald-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
