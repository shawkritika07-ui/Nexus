import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContext';
import type { UserCategory } from '../types/edna';

interface RegisterPageProps {
  navigate: (path: string) => void;
}

const USER_CATEGORIES: UserCategory[] = [
  'Student',
  'Research Scholar',
  'Environmental Scientist',
  'Researcher',
  'General User',
];

function validateStrongPassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(pw)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one number.';
  return null;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ navigate }) => {
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [country, setCountry] = useState('');
  const [researchInterest, setResearchInterest] = useState('');
  const [userCategory, setUserCategory] = useState<UserCategory>('Student');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');

    if (!fullName.trim() || !institution.trim() || !country.trim() || !researchInterest.trim()) {
      setErrorMsg('Please complete all required profile fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    const pwErr = validateStrongPassword(password);
    if (pwErr) {
      setErrorMsg(pwErr);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password and confirmation do not match.');
      return;
    }
    if (!acceptTerms || !acceptPrivacy) {
      setErrorMsg('You must accept the Terms and Conditions and Privacy Policy.');
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail({
        fullName,
        email,
        password,
        institution,
        country,
        researchInterest,
        userCategory,
      });
      showToast('Verification email sent', 'Please check your inbox to activate your researcher account.', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (submitting) return;
    setErrorMsg('');
    setSubmitting(true);
    try {
      await loginWithGoogle();
      showToast('Account ready', 'Signed in with Google.', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B1410] py-10 px-4 sm:px-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-[#14532D] dark:hover:text-[#4ADE80] mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </button>

        <div className="bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <BrandLogo size={36} />
              <h1 className="text-2xl font-bold text-[#102A43] dark:text-white mt-4">
                Create Researcher Account
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Join eDNA Explorer to upload metabarcoding datasets and assess biodiversity.
              </p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleRegister}
              className="px-4 py-2.5 text-xs font-medium border border-slate-300 dark:border-emerald-900 rounded-lg hover:bg-slate-50 dark:hover:bg-emerald-950/40 transition-colors inline-flex items-center justify-center gap-2 shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
              </svg>
              Google Sign-Up
            </button>
          </div>

          {errorMsg && (
            <div role="alert" className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ananya Sharma"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ananya@university.edu"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, upper, lower, number"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Institution / College / University
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="National Institute of Ecology"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="India"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Research Interest
                </label>
                <input
                  type="text"
                  required
                  value={researchInterest}
                  onChange={(e) => setResearchInterest(e.target.value)}
                  placeholder="Freshwater Fish Metabarcoding"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  User Category
                </label>
                <select
                  value={userCategory}
                  onChange={(e) => setUserCategory(e.target.value as UserCategory)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-emerald-900 bg-white dark:bg-[#0B1410] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                >
                  {USER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#16A34A] focus:ring-[#16A34A]"
                />
                <span>
                  I accept the <span className="font-semibold text-[#102A43] dark:text-white">Terms and Conditions</span> for responsible scientific data processing.
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => setAcceptPrivacy(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#16A34A] focus:ring-[#16A34A]"
                />
                <span>
                  I agree to the <span className="font-semibold text-[#102A43] dark:text-white">Privacy Policy</span> governing researcher profile and dataset isolation.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Account & Send Verification Email
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            Already registered?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-semibold text-[#16A34A] hover:underline"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
