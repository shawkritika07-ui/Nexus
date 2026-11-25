import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';
import type {
  ActivityLogRecord,
  AnalysisRecord,
  AnalysisResultRecord,
  AnalysisType,
  DatasetRecord,
  NotificationRecord,
  ReferenceDatabase,
  ReportRecord,
  SampleType,
} from '../types/edna';

export interface UploadDatasetInput {
  file: File;
  rawContent: string;
  datasetName: string;
  sampleId: string;
  collectionLocation: string;
  collectionDate: string;
  sampleType: SampleType;
  environmentalDescription: string;
  notes: string;
}

export interface StartAnalysisInput {
  dataset: DatasetRecord;
  analysisType: AnalysisType;
  referenceDatabase: ReferenceDatabase;
  minSimilarity: number;
  maxEValue: string;
  minQueryCoverage: number;
  onProgress?: (progress: number, stage: string) => void;
}

interface DataContextValue {
  datasets: DatasetRecord[];
  analyses: AnalysisRecord[];
  results: AnalysisResultRecord[];
  notifications: NotificationRecord[];
  activityLogs: ActivityLogRecord[];
  reports: ReportRecord[];
  loadingData: boolean;
  uploadDataset: (input: UploadDatasetInput) => Promise<DatasetRecord>;
  removeDataset: (dataset: DatasetRecord) => Promise<void>;
  runAnalysisWorkflow: (input: StartAnalysisInput) => Promise<AnalysisResultRecord>;
  generateAiInterpretation: (result: AnalysisResultRecord, dataset?: DatasetRecord) => Promise<string>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  createReportRecord: (result: AnalysisResultRecord, title: string, notes?: string) => Promise<ReportRecord>;
  toggleReportSharing: (report: ReportRecord) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortByCreatedDesc<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tA = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
    const tB = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
    return tB - tA;
  });
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, profile, authReady, getIdToken, serverRole } = useAuth();
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [results, setResults] = useState<AnalysisResultRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isEligible = Boolean(
    authReady &&
      firebaseUser &&
      firebaseUser.emailVerified &&
      profile &&
      profile.accountStatus !== 'deactivated'
  );

  useEffect(() => {
    if (!isEligible || !firebaseUser) {
      setDatasets([]);
      setAnalyses([]);
      setResults([]);
      setNotifications([]);
      setActivityLogs([]);
      setReports([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    const uid = firebaseUser.uid;

    const unsubDatasets = onSnapshot(
      query(collection(db, 'datasets'), where('userId', '==', uid)),
      (snap) => {
        setDatasets(sortByCreatedDesc(snap.docs.map((d) => d.data() as DatasetRecord)));
        setLoadingData(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'datasets')
    );

    const unsubAnalyses = onSnapshot(
      query(collection(db, 'analyses'), where('userId', '==', uid)),
      (snap) => setAnalyses(sortByCreatedDesc(snap.docs.map((d) => d.data() as AnalysisRecord))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'analyses')
    );

    const unsubResults = onSnapshot(
      query(collection(db, 'results'), where('userId', '==', uid)),
      (snap) => setResults(sortByCreatedDesc(snap.docs.map((d) => d.data() as AnalysisResultRecord))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'results')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      (snap) => setNotifications(sortByCreatedDesc(snap.docs.map((d) => d.data() as NotificationRecord))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    const unsubLogs = onSnapshot(
      query(collection(db, 'activity_logs'), where('userId', '==', uid)),
      (snap) => setActivityLogs(sortByCreatedDesc(snap.docs.map((d) => d.data() as ActivityLogRecord))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'activity_logs')
    );

    const unsubReports = onSnapshot(
      query(collection(db, 'reports'), where('userId', '==', uid)),
      (snap) => setReports(sortByCreatedDesc(snap.docs.map((d) => d.data() as ReportRecord))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
    );

    return () => {
      unsubDatasets();
      unsubAnalyses();
      unsubResults();
      unsubNotifs();
      unsubLogs();
      unsubReports();
    };
  }, [isEligible, firebaseUser]);

  const createNotification = useCallback(
    async (uid: string, title: string, message: string, type: NotificationRecord['type']) => {
      const notificationId = genId('notif');
      try {
        await setDoc(doc(db, 'notifications', notificationId), {
          notificationId,
          userId: uid,
          title: title.slice(0, 160),
          message: message.slice(0, 500),
          type,
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notifications/${notificationId}`);
      }
    },
    []
  );

  const appendLog = useCallback(
    async (uid: string, action: string, details: string) => {
      const logId = genId('log');
      try {
        await setDoc(doc(db, 'activity_logs', logId), {
          logId,
          userId: uid,
          actorRole: serverRole,
          action: action.slice(0, 120),
          details: details.slice(0, 600),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `activity_logs/${logId}`);
      }
    },
    [serverRole]
  );

  const uploadDataset = useCallback(
    async (input: UploadDatasetInput): Promise<DatasetRecord> => {
      if (!firebaseUser) throw new Error('Authentication required');
      const uid = firebaseUser.uid;
      const datasetId = genId('ds');
      const token = await getIdToken();

      const resp = await fetch('/api/datasets/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          datasetId,
          datasetName: input.datasetName.trim(),
          sampleId: input.sampleId.trim(),
          fileName: input.file.name,
          sampleType: input.sampleType,
          rawContent: input.rawContent,
        }),
      });

      const serverData = (await resp.json()) as {
        error?: string;
        fileFormat: DatasetRecord['fileFormat'];
        fileSizeBytes: number;
        sequenceCount: number;
        previewSnippet: string;
        storagePath: string;
        supabaseDatasetId: string;
      };

      if (!resp.ok) {
        throw new Error(serverData.error || 'Dataset upload validation failed.');
      }

      const datasetDoc: Record<string, unknown> = {
        datasetId,
        userId: uid,
        datasetName: input.datasetName.trim().slice(0, 160),
        sampleId: input.sampleId.trim().slice(0, 80),
        fileName: input.file.name.slice(0, 255),
        fileFormat: serverData.fileFormat,
        fileSizeBytes: serverData.fileSizeBytes,
        sequenceCount: serverData.sequenceCount,
        sampleType: input.sampleType,
        collectionLocation: input.collectionLocation.trim().slice(0, 200),
        collectionDate: input.collectionDate.slice(0, 40),
        environmentalDescription: input.environmentalDescription.trim().slice(0, 1000),
        notes: input.notes.trim().slice(0, 1000),
        storagePath: serverData.storagePath,
        supabaseDatasetId: serverData.supabaseDatasetId,
        previewSnippet: (serverData.previewSnippet || input.rawContent.slice(0, 1500)).slice(0, 2000),
        status: 'uploaded',
        createdAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'datasets', datasetId), datasetDoc);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `datasets/${datasetId}`);
      }

      await createNotification(
        uid,
        'Dataset uploaded',
        `${input.datasetName} (${serverData.sequenceCount} sequences) is ready for analysis.`,
        'upload'
      );
      await appendLog(uid, 'DATASET_UPLOADED', `Uploaded ${input.file.name} (${serverData.fileFormat})`);

      return datasetDoc as unknown as DatasetRecord;
    },
    [firebaseUser, getIdToken, createNotification, appendLog]
  );

  const removeDataset = useCallback(
    async (dataset: DatasetRecord) => {
      if (!firebaseUser) throw new Error('Authentication required');
      const token = await getIdToken();
      await fetch(`/api/datasets/${dataset.datasetId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storagePath: dataset.storagePath }),
      });
      try {
        await deleteDoc(doc(db, 'datasets', dataset.datasetId));
        await appendLog(firebaseUser.uid, 'DATASET_DELETED', `Deleted dataset ${dataset.datasetName}`);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `datasets/${dataset.datasetId}`);
      }
    },
    [firebaseUser, getIdToken, appendLog]
  );

  const runAnalysisWorkflow = useCallback(
    async (input: StartAnalysisInput): Promise<AnalysisResultRecord> => {
      if (!firebaseUser) throw new Error('Authentication required');
      const uid = firebaseUser.uid;
      const analysisId = genId('an');
      const resultId = genId('res');

      input.onProgress?.(15, 'Initializing analysis job & validating sequence metadata');

      try {
        await setDoc(doc(db, 'analyses', analysisId), {
          analysisId,
          datasetId: input.dataset.datasetId,
          userId: uid,
          datasetName: input.dataset.datasetName,
          analysisType: input.analysisType,
          referenceDatabase: input.referenceDatabase,
          minSimilarity: input.minSimilarity,
          maxEValue: input.maxEValue,
          minQueryCoverage: input.minQueryCoverage,
          pipelineMode: 'demonstration-mode',
          status: 'processing',
          progress: 25,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `analyses/${analysisId}`);
      }

      try {
        await updateDoc(doc(db, 'datasets', input.dataset.datasetId), {
          status: 'processing',
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Non-blocking status sync
      }

      input.onProgress?.(50, 'Executing bioinformatics sequence pipeline & database lookup');

      const token = await getIdToken();
      const resp = await fetch('/api/analyses/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysisId,
          datasetId: input.dataset.datasetId,
          datasetName: input.dataset.datasetName,
          fileFormat: input.dataset.fileFormat,
          sampleType: input.dataset.sampleType,
          storagePath: input.dataset.storagePath,
          analysisType: input.analysisType,
          referenceDatabase: input.referenceDatabase,
          minSimilarity: input.minSimilarity,
          maxEValue: input.maxEValue,
          minQueryCoverage: input.minQueryCoverage,
          inlineContent: input.dataset.previewSnippet || '',
        }),
      });

      const payload = (await resp.json()) as {
        error?: string;
        pipelineMode: AnalysisResultRecord['pipelineMode'];
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
        taxaAssignments: AnalysisResultRecord['taxaAssignments'];
        taxonomicSummary: AnalysisResultRecord['taxonomicSummary'];
        supabaseResultId: string;
      };

      if (!resp.ok) {
        await updateDoc(doc(db, 'analyses', analysisId), {
          status: 'failed',
          progress: 100,
          errorMessage: (payload.error || 'Pipeline execution failed').slice(0, 500),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'datasets', input.dataset.datasetId), {
          status: 'failed',
          updatedAt: serverTimestamp(),
        });
        throw new Error(payload.error || 'Analysis failed.');
      }

      input.onProgress?.(85, 'Recording taxonomic assignments & biodiversity indices');

      const resultDoc: Record<string, unknown> = {
        resultId,
        analysisId,
        datasetId: input.dataset.datasetId,
        userId: uid,
        datasetName: input.dataset.datasetName,
        analysisType: input.analysisType,
        pipelineMode: payload.pipelineMode,
        referenceDatabase: input.referenceDatabase,
        disclaimer: payload.disclaimer,
        speciesRichness: payload.speciesRichness,
        shannonIndex: payload.shannonIndex,
        simpsonIndex: payload.simpsonIndex,
        pielouEvenness: payload.pielouEvenness,
        totalReads: payload.totalReads,
        classifiedReads: payload.classifiedReads,
        meanGcContent: payload.meanGcContent,
        meanReadLength: payload.meanReadLength,
        taxaCount: payload.taxaAssignments.length,
        supabaseResultId: payload.supabaseResultId,
        taxaAssignments: payload.taxaAssignments.slice(0, 150),
        taxonomicSummary: (payload.taxonomicSummary || []).slice(0, 80),
        createdAt: serverTimestamp(),
      };
      if (payload.dataValidityWarning) {
        resultDoc.dataValidityWarning = payload.dataValidityWarning.slice(0, 500);
      }

      try {
        await setDoc(doc(db, 'results', resultId), resultDoc);
        await updateDoc(doc(db, 'analyses', analysisId), {
          status: 'completed',
          progress: 100,
          pipelineMode: payload.pipelineMode,
          resultId,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'datasets', input.dataset.datasetId), {
          status: 'analysed',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `results/${resultId}`);
      }

      await createNotification(
        uid,
        'Analysis completed',
        `${input.analysisType} finished for ${input.dataset.datasetName}: ${payload.speciesRichness} taxa, H'=${payload.shannonIndex.toFixed(2)}.`,
        'analysis'
      );
      await appendLog(
        uid,
        'ANALYSIS_COMPLETED',
        `Completed ${input.analysisType} on ${input.dataset.datasetName} (${payload.pipelineMode})`
      );

      input.onProgress?.(100, 'Completed');
      return resultDoc as unknown as AnalysisResultRecord;
    },
    [firebaseUser, getIdToken, createNotification, appendLog]
  );

  const generateAiInterpretation = useCallback(
    async (result: AnalysisResultRecord, dataset?: DatasetRecord): Promise<string> => {
      if (!firebaseUser) throw new Error('Authentication required');
      const token = await getIdToken();
      const resp = await fetch('/api/gemini/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          datasetName: result.datasetName,
          sampleType: dataset?.sampleType,
          collectionLocation: dataset?.collectionLocation,
          pipelineMode: result.pipelineMode,
          referenceDatabase: result.referenceDatabase,
          speciesRichness: result.speciesRichness,
          shannonIndex: result.shannonIndex,
          simpsonIndex: result.simpsonIndex,
          pielouEvenness: result.pielouEvenness,
          totalReads: result.totalReads,
          classifiedReads: result.classifiedReads,
          topTaxa: result.taxaAssignments.slice(0, 12).map((t) => ({
            scientificName: t.scientificName,
            phylum: t.lineage.phylum,
            relativeAbundance: t.relativeAbundance,
            matchStatus: t.matchStatus,
          })),
        }),
      });
      const data = (await resp.json()) as { interpretation?: string; error?: string };
      if (!resp.ok || !data.interpretation) {
        throw new Error(data.error || 'Unable to generate AI interpretation.');
      }

      try {
        await updateDoc(doc(db, 'results', result.resultId), {
          aiInterpretation: data.interpretation.slice(0, 6000),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `results/${result.resultId}`);
      }
      return data.interpretation;
    },
    [firebaseUser, getIdToken]
  );

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markNotificationRead(n.notificationId)));
  }, [notifications, markNotificationRead]);

  const createReportRecord = useCallback(
    async (result: AnalysisResultRecord, title: string, notes = ''): Promise<ReportRecord> => {
      if (!firebaseUser) throw new Error('Authentication required');
      const reportId = genId('rep');
      const shareCode = Math.random().toString(36).slice(2, 10).toUpperCase();
      const docData: Record<string, unknown> = {
        reportId,
        userId: firebaseUser.uid,
        analysisId: result.analysisId,
        datasetId: result.datasetId,
        resultId: result.resultId,
        title: title.trim().slice(0, 200),
        pipelineMode: result.pipelineMode,
        isShared: false,
        shareCode,
        notes: notes.trim().slice(0, 1000),
        createdAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'reports', reportId), docData);
        await createNotification(
          firebaseUser.uid,
          'Report generated',
          `Saved scientific report "${title.trim()}" for ${result.datasetName}.`,
          'report'
        );
        await appendLog(firebaseUser.uid, 'REPORT_CREATED', `Generated report ${title.trim()}`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
      }
      return docData as unknown as ReportRecord;
    },
    [firebaseUser, createNotification, appendLog]
  );

  const toggleReportSharing = useCallback(async (report: ReportRecord) => {
    try {
      await updateDoc(doc(db, 'reports', report.reportId), {
        isShared: !report.isShared,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${report.reportId}`);
    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        datasets,
        analyses,
        results,
        notifications,
        activityLogs,
        reports,
        loadingData,
        uploadDataset,
        removeDataset,
        runAnalysisWorkflow,
        generateAiInterpretation,
        markNotificationRead,
        markAllNotificationsRead,
        createReportRecord,
        toggleReportSharing,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
