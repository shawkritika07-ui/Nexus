import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Dna,
  FileText,
  GitBranch,
  Leaf,
  Menu,
  Microscope,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';

interface LandingPageProps {
  navigate: (path: string) => void;
}

const FEATURES = [
  {
    num: '01',
    title: 'eDNA Dataset Analysis',
    desc: 'Upload FASTA, FASTQ, CSV, TSV, and TXT metabarcoding datasets with automated sequence parsing, GC-content profiling, and read-length validation.',
    icon: Database,
  },
  {
    num: '02',
    title: 'Automated Taxonomic Classification',
    desc: 'Organize reads across all eight Linnaean ranks from Domain through Species with alignment similarity, query coverage, and E-value thresholds.',
    icon: GitBranch,
  },
  {
    num: '03',
    title: 'Species Identification',
    desc: 'Designed for reference workflows including NCBI BLAST, NCBI Taxonomy, SILVA rRNA, and MIDORI databases, with clear demonstration labeling when offline.',
    icon: Microscope,
  },
  {
    num: '04',
    title: 'Biodiversity Assessment',
    desc: 'Calculate Species Richness, Shannon Diversity (H\'), Simpson Diversity (1 - D), Pielou\'s Evenness (J\'), and relative abundance with incomplete-data safeguards.',
    icon: Leaf,
  },
  {
    num: '05',
    title: 'Interactive Data Visualisation',
    desc: 'Inspect species distributions, taxonomic composition bars, sample-to-sample diversity comparisons, and collapsible hierarchy trees.',
    icon: BarChart3,
  },
  {
    num: '06',
    title: 'Research Report Generation',
    desc: 'Export structured CSV tables and multi-section scientific PDF reports containing methodology, metrics, charts, limitations, and disclaimers.',
    icon: FileText,
  },
];

const WORKFLOW_STEPS = [
  {
    step: 'Step 1',
    title: 'Upload environmental DNA datasets',
    detail: 'Drag and drop FASTA, FASTQ, CSV, TSV, or TXT files alongside sampling habitat, coordinates, and collection dates.',
  },
  {
    step: 'Step 2',
    title: 'Process and analyse the uploaded sequences',
    detail: 'Validate read integrity, GC composition, and sequence counts through isolated backend processing workflows.',
  },
  {
    step: 'Step 3',
    title: 'Identify potential taxonomic groups',
    detail: 'Match reads against reference taxonomy hierarchies or clearly labeled ecological demonstration libraries.',
  },
  {
    step: 'Step 4',
    title: 'Calculate biodiversity indicators',
    detail: 'Compute Shannon, Simpson, Pielou, and Richness indices with transparent data-completeness checks.',
  },
  {
    step: 'Step 5',
    title: 'Visualise and export research results',
    detail: 'Compare habitats side by side, generate AI-assisted metric interpretations, and export CSV or PDF reports.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ navigate }) => {
  const { firebaseUser, theme, toggleTheme } = useAuth();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [labImgFailed, setLabImgFailed] = useState(false);
  const [canopyImgFailed, setCanopyImgFailed] = useState(false);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactMessage.trim().length < 10) {
      showToast('Check contact fields', 'Please provide your name, a valid email address, and a message.', 'error');
      return;
    }
    setContactSent(true);
    showToast('Inquiry recorded', 'Thank you for contacting the eDNA Explorer team.', 'success');
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  return (
    <div id="home" className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B1410] text-[#102A43] dark:text-[#F0F7F2]">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0B1410]/95 backdrop-blur border-b border-slate-200 dark:border-emerald-950">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          <a href="#home" className="whitespace-nowrap shrink-0">
            <BrandLogo size={34} />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300" aria-label="Landing Navigation">
            <a href="#home" className="hover:text-[#14532D] dark:hover:text-[#4ADE80] transition-colors whitespace-nowrap shrink-0">Home</a>
            <a href="#about" className="hover:text-[#14532D] dark:hover:text-[#4ADE80] transition-colors whitespace-nowrap shrink-0">About</a>
            <a href="#features" className="hover:text-[#14532D] dark:hover:text-[#4ADE80] transition-colors whitespace-nowrap shrink-0">Features</a>
            <a href="#how-it-works" className="hover:text-[#14532D] dark:hover:text-[#4ADE80] transition-colors whitespace-nowrap shrink-0">How It Works</a>
            <a href="#contact" className="hover:text-[#14532D] dark:hover:text-[#4ADE80] transition-colors whitespace-nowrap shrink-0">Contact</a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-emerald-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/50 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {firebaseUser ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Open Dashboard
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium text-[#102A43] dark:text-slate-200 hover:text-[#16A34A] px-2 py-1.5 whitespace-nowrap shrink-0"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Register
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle mobile menu"
              className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-emerald-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-emerald-950 bg-white dark:bg-[#111C16] px-4 py-4 space-y-2">
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium">About</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium">How It Works</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium">Contact</a>
            {!firebaseUser && (
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="flex-1 py-2 text-sm font-medium border border-slate-300 dark:border-emerald-900 rounded-lg"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="flex-1 py-2 text-sm font-semibold bg-[#14532D] text-white rounded-lg"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-emerald-950 bg-white dark:bg-[#0E1913]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-mono uppercase tracking-widest text-[#16A34A] dark:text-[#4ADE80] mb-3">
                Explore · Identify · Conserve
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#102A43] dark:text-white leading-[1.12] [text-wrap:balance]">
                Discover the Hidden Biodiversity Around Us
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Explore environmental DNA datasets, identify species, understand taxonomic diversity, and support biodiversity conservation through intelligent scientific analysis.
              </p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Identifying Taxonomy and Assessing Biodiversity from eDNA Datasets.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(firebaseUser ? '/dashboard' : '/register')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold border border-slate-300 dark:border-emerald-900 text-[#102A43] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Features
                </a>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-200 dark:border-emerald-950 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>FASTA · FASTQ · CSV · TSV</span>
                <span>NCBI · SILVA · MIDORI Ready</span>
                <span>Shannon · Simpson · Pielou</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[320px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-slate-200 dark:border-emerald-900 bg-[#DCFCE7] dark:bg-[#14532D]/30">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_edna_ecosystem_1795608704627.jpg"
                    alt="Researchers sampling environmental DNA along a temperate forest river watershed"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                    <Dna className="w-12 h-12 text-[#14532D] dark:text-[#4ADE80] mb-3" />
                    <p className="text-sm font-semibold text-[#14532D] dark:text-emerald-200">
                      Watershed Environmental DNA Field Sampling
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#102A43]/75 via-[#102A43]/15 to-transparent pointer-events-none" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-[#DCFCE7]">
                      Field-to-Taxon Pipeline
                    </p>
                    <p className="text-sm sm:text-base font-semibold mt-0.5">
                      Freshwater, Marine, Soil, Sediment & Air Metabarcoding
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-[#16A34A] dark:text-[#4ADE80] mb-2">
            Platform Capabilities
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#102A43] dark:text-white tracking-tight [text-wrap:balance]">
            Built for environmental genomics workflows
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            From raw amplicon sequence ingestion to taxonomic tree exploration and publication-ready biodiversity reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.num}
                className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-[#16A34A] dark:text-[#4ADE80]">
                      {feat.num}
                    </span>
                    <Icon className="w-5 h-5 text-[#14532D] dark:text-[#4ADE80]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#102A43] dark:text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Visual Showcase Split */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2">
            <div className="h-52 sm:h-full bg-[#DCFCE7] dark:bg-[#14532D]/30">
              {!labImgFailed ? (
                <img
                  src="/src/assets/images/feature_lab_sequencing_1795608705331.jpg"
                  alt="Environmental DNA filtration and sequencing laboratory bench"
                  referrerPolicy="no-referrer"
                  onError={() => setLabImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Microscope className="w-10 h-10 text-[#14532D]" />
                </div>
              )}
            </div>
            <div className="p-6 flex flex-col justify-center">
              <p className="text-xs font-mono text-[#16A34A] mb-1">Sequence Integrity</p>
              <h3 className="text-lg font-bold text-[#102A43] dark:text-white mb-2">
                Honest Pipeline Provenance
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Every analysis distinguishes live reference database alignments from demonstration mode and preserves exact read-level similarity and E-value metrics.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2">
            <div className="h-52 sm:h-full bg-[#DCFCE7] dark:bg-[#14532D]/30">
              {!canopyImgFailed ? (
                <img
                  src="/src/assets/images/feature_biodiversity_canopy_1795608704368.jpg"
                  alt="Aerial view of freshwater estuary and forested biodiversity corridor"
                  referrerPolicy="no-referrer"
                  onError={() => setCanopyImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Leaf className="w-10 h-10 text-[#14532D]" />
                </div>
              )}
            </div>
            <div className="p-6 flex flex-col justify-center">
              <p className="text-xs font-mono text-[#16A34A] mb-1">Habitat Comparisons</p>
              <h3 className="text-lg font-bold text-[#102A43] dark:text-white mb-2">
                Cross-Site Ecological Indices
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Compare freshwater, marine, soil, and sediment transects side by side using standardized alpha diversity indicators and relative abundance charts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-white dark:bg-[#0E1913] border-y border-slate-200 dark:border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-[#16A34A] dark:text-[#4ADE80] mb-2">
              Scientific Methodology
            </p>
            <h2 className="text-3xl font-bold text-[#102A43] dark:text-white tracking-tight">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            {WORKFLOW_STEPS.map((item) => (
              <div
                key={item.step}
                className="p-5 rounded-xl bg-[#F8FAF7] dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950"
              >
                <p className="text-xs font-mono font-semibold text-[#16A34A] dark:text-[#4ADE80] mb-2">
                  {item.step}
                </p>
                <h3 className="text-sm font-bold text-[#102A43] dark:text-white mb-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-16 lg:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6">
            <p className="text-xs font-mono uppercase tracking-widest text-[#16A34A] dark:text-[#4ADE80] mb-2">
              About Us
            </p>
            <h2 className="text-3xl font-bold text-[#102A43] dark:text-white tracking-tight [text-wrap:balance]">
              Advancing non-invasive biodiversity monitoring
            </h2>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Environmental DNA (eDNA) enables biologists, students, and conservation agencies to detect organisms from trace genetic material shed into water, soil, sediment, and air without disturbing fragile habitats.
            </p>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              eDNA Explorer unifies secure dataset management, taxonomic exploration, rigorous ecological diversity indices, and reproducible PDF reporting in one transparent research workspace.
            </p>
          </div>
          <div className="lg:col-span-6 bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#102A43] dark:text-white">
              Scientific Integrity Principles
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span>AI interpretation assists with summarizing verified outputs and never fabricates species identifications from raw DNA.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span>Supports integration with NCBI BLAST, NCBI Taxonomy, SILVA rRNA, and MIDORI pipelines alongside clearly labeled demonstration mode.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span>Strict researcher data isolation backed by Firebase Authentication, Firestore security rules, and Supabase Row Level Security.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 lg:py-20 bg-white dark:bg-[#0E1913] border-t border-slate-200 dark:border-emerald-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-xs font-mono uppercase tracking-widest text-[#16A34A] dark:text-[#4ADE80] mb-2">
              Contact
            </p>
            <h2 className="text-3xl font-bold text-[#102A43] dark:text-white">
              Connect with the Research Platform Team
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Questions regarding institutional onboarding, reference pipeline endpoints, or academic collaboration.
            </p>
          </div>

          {contactSent ? (
            <div className="p-8 rounded-xl border border-[#16A34A]/40 bg-[#DCFCE7]/40 dark:bg-[#14532D]/20 text-center">
              <CheckCircle2 className="w-8 h-8 text-[#16A34A] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#102A43] dark:text-white">Message Received</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 mb-4">
                Thank you for reaching out. Our team will follow up at your email address.
              </p>
              <button
                type="button"
                onClick={() => setContactSent(false)}
                className="px-4 py-2 text-xs font-semibold bg-[#14532D] text-white rounded-lg"
              >
                Send another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="bg-[#F8FAF7] dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-xl p-6 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Dr. Maya Lin"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="researcher@university.edu"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Message
                </label>
                <textarea
                  rows={4}
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Share details about your biodiversity research project or technical inquiry..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-emerald-950 bg-[#F8FAF7] dark:bg-[#0B1410] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <BrandLogo size={26} />
            <span>·</span>
            <span>Explore · Identify · Conserve</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#about" className="hover:text-[#14532D] dark:hover:text-[#4ADE80]">About</a>
            <a href="#features" className="hover:text-[#14532D] dark:hover:text-[#4ADE80]">Features</a>
            <button type="button" onClick={() => navigate('/login')} className="hover:text-[#14532D] dark:hover:text-[#4ADE80]">Login</button>
            <button type="button" onClick={() => navigate('/register')} className="hover:text-[#14532D] dark:hover:text-[#4ADE80]">Register</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
