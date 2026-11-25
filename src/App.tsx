import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadDatasetPage } from './pages/UploadDatasetPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { TaxonomyPage } from './pages/TaxonomyPage';
import { BiodiversityPage } from './pages/BiodiversityPage';
import { ResultsPage } from './pages/ResultsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SecureControlPage } from './pages/SecureControlPage';

const PROTECTED_ROUTES = new Set([
  '/dashboard',
  '/upload',
  '/analysis',
  '/taxonomy',
  '/biodiversity',
  '/results',
  '/profile',
]);

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Research Dashboard',
    subtitle: 'Overview of uploaded eDNA datasets, taxonomic diversity, and recent runs',
  },
  '/upload': {
    title: 'Dataset Upload',
    subtitle: 'Ingest FASTA, FASTQ, CSV, TSV, and TXT files with environmental metadata',
  },
  '/analysis': {
    title: 'eDNA Analysis',
    subtitle: 'Configure reference database parameters and execute sequence classification',
  },
  '/taxonomy': {
    title: 'Taxonomic Identification',
    subtitle: 'Inspect hierarchical lineages from Domain to Species with alignment statistics',
  },
  '/biodiversity': {
    title: 'Biodiversity Assessment',
    subtitle: 'Alpha diversity indices, relative abundance distributions, and habitat comparisons',
  },
  '/results': {
    title: 'Results & Reports',
    subtitle: 'AI-assisted ecological interpretation, CSV data, PDF export, and controlled sharing',
  },
  '/profile': {
    title: 'Profile & Settings',
    subtitle: 'Manage researcher profile, security preferences, theme, and activity history',
  },
};

function AppRouter() {
  const { firebaseUser, authReady } = useAuth();
  const [path, setPath] = useState<string>(() => window.location.pathname || '/');

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    const clean = nextPath.split('?')[0] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setPath(clean);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Hidden administrator route — completely isolated from public/user navigation
  if (path === '/secure-control') {
    return <SecureControlPage navigate={navigate} />;
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B1410] flex items-center justify-center">
        <div className="text-sm font-mono text-[#14532D] dark:text-[#4ADE80]">
          Initializing eDNA Explorer...
        </div>
      </div>
    );
  }

  if (path === '/login') {
    if (firebaseUser?.emailVerified) {
      return (
        <AppShell currentPath="/dashboard" navigate={navigate} {...ROUTE_META['/dashboard']}>
          <DashboardPage navigate={navigate} />
        </AppShell>
      );
    }
    return <LoginPage navigate={navigate} />;
  }

  if (path === '/register') {
    if (firebaseUser?.emailVerified) {
      return (
        <AppShell currentPath="/dashboard" navigate={navigate} {...ROUTE_META['/dashboard']}>
          <DashboardPage navigate={navigate} />
        </AppShell>
      );
    }
    return <RegisterPage navigate={navigate} />;
  }

  if (PROTECTED_ROUTES.has(path)) {
    if (!firebaseUser) {
      return <LoginPage navigate={navigate} />;
    }
    const meta = ROUTE_META[path] || ROUTE_META['/dashboard'];
    return (
      <AppShell currentPath={path} navigate={navigate} title={meta.title} subtitle={meta.subtitle}>
        {path === '/dashboard' && <DashboardPage navigate={navigate} />}
        {path === '/upload' && <UploadDatasetPage navigate={navigate} />}
        {path === '/analysis' && <AnalysisPage navigate={navigate} />}
        {path === '/taxonomy' && <TaxonomyPage navigate={navigate} />}
        {path === '/biodiversity' && <BiodiversityPage navigate={navigate} />}
        {path === '/results' && <ResultsPage navigate={navigate} />}
        {path === '/profile' && <ProfilePage navigate={navigate} />}
      </AppShell>
    );
  }

  return <LandingPage navigate={navigate} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>
            <AppRouter />
          </DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
