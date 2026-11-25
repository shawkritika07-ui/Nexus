import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type { UserCategory, UserProfile, UserRole } from '../types/edna';

export interface RegistrationPayload {
  fullName: string;
  email: string;
  password: string;
  institution: string;
  country: string;
  researchInterest: string;
  userCategory: UserCategory;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  serverRole: UserRole;
  authReady: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (next: 'light' | 'dark') => void;
  loginWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  registerWithEmail: (payload: RegistrationPayload) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationState: () => Promise<boolean>;
  updateUserProfile: (updates: Partial<Pick<UserProfile, 'fullName' | 'institution' | 'country' | 'researchInterest' | 'userCategory' | 'photoUrl' | 'notificationsEnabled'>>) => Promise<void>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  getIdToken: () => Promise<string>;
}

const PENDING_PROFILE_KEY = 'edna_pending_registration_profile';
const THEME_KEY = 'edna_theme_preference';

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function writeActivityLog(uid: string, role: UserRole, action: string, details: string) {
  const logId = makeId('log');
  const path = `activity_logs/${logId}`;
  try {
    await setDoc(doc(db, 'activity_logs', logId), {
      logId,
      userId: uid,
      actorRole: role,
      action: action.slice(0, 120),
      details: details.slice(0, 600),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [serverRole, setServerRole] = useState<UserRole>('user');
  const [authReady, setAuthReady] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: 'light' | 'dark') => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const syncUserProfileAndRole = useCallback(async (user: User) => {
    if (!user.emailVerified) {
      setProfile(null);
      setServerRole('user');
      return;
    }

    // Verify server-side role from /api/auth/session
    let resolvedRole: UserRole = 'user';
    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = (await resp.json()) as { role?: UserRole };
        if (data.role === 'admin') resolvedRole = 'admin';
      }
    } catch {
      resolvedRole = 'user';
    }
    setServerRole(resolvedRole);

    const userDocRef = doc(db, 'users', user.uid);
    const docPath = `users/${user.uid}`;
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        // Hydrate from pending email registration or Google Auth metadata; ALWAYS force role: 'user' on creation
        let pending: Partial<RegistrationPayload> = {};
        try {
          const raw = sessionStorage.getItem(PENDING_PROFILE_KEY);
          if (raw) pending = JSON.parse(raw) as Partial<RegistrationPayload>;
        } catch {
          pending = {};
        }

        const newProfile: Record<string, unknown> = {
          uid: user.uid,
          fullName: (pending.fullName || user.displayName || user.email?.split('@')[0] || 'Researcher').slice(0, 120),
          email: (user.email || '').slice(0, 200),
          institution: (pending.institution || 'Independent Research').slice(0, 200),
          country: (pending.country || 'Not specified').slice(0, 100),
          researchInterest: (pending.researchInterest || 'Environmental Genomics & Biodiversity').slice(0, 200),
          userCategory: pending.userCategory || 'Researcher',
          role: 'user',
          accountStatus: 'active',
          notificationsEnabled: true,
          createdAt: serverTimestamp(),
        };
        if (user.photoURL) {
          newProfile.photoUrl = user.photoURL.slice(0, 500);
        }

        await setDoc(userDocRef, newProfile);
        sessionStorage.removeItem(PENDING_PROFILE_KEY);
        const createdSnap = await getDoc(userDocRef);
        if (createdSnap.exists()) {
          setProfile(createdSnap.data() as UserProfile);
        }
        await writeActivityLog(user.uid, 'user', 'ACCOUNT_CREATED', 'Initialized verified researcher profile');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncUserProfileAndRole(user);
      } else {
        setProfile(null);
        setServerRole('user');
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [syncUserProfileAndRole]);

  const loginWithEmail = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (cred.user.emailVerified) {
      await syncUserProfileAndRole(cred.user);
      await writeActivityLog(cred.user.uid, 'user', 'USER_LOGIN', 'Signed in via email and password');
    }
  }, [syncUserProfileAndRole]);

  const registerWithEmail = useCallback(async (payload: RegistrationPayload) => {
    sessionStorage.setItem(
      PENDING_PROFILE_KEY,
      JSON.stringify({
        fullName: payload.fullName.trim(),
        institution: payload.institution.trim(),
        country: payload.country.trim(),
        researchInterest: payload.researchInterest.trim(),
        userCategory: payload.userCategory,
      })
    );
    const cred = await createUserWithEmailAndPassword(auth, payload.email.trim(), payload.password);
    await updateProfile(cred.user, { displayName: payload.fullName.trim() });
    await sendEmailVerification(cred.user);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUserProfileAndRole(cred.user);
    if (cred.user.emailVerified) {
      await writeActivityLog(cred.user.uid, 'user', 'GOOGLE_SIGN_IN', 'Authenticated with Google Sign-In');
    }
  }, [syncUserProfileAndRole]);

  const logout = useCallback(async () => {
    if (firebaseUser?.uid && firebaseUser.emailVerified) {
      try {
        await writeActivityLog(firebaseUser.uid, serverRole, 'USER_LOGOUT', 'Signed out of session');
      } catch {
        // Proceed with signOut even if logging fails
      }
    }
    await signOut(auth);
    setProfile(null);
    setServerRole('user');
  }, [firebaseUser, serverRole]);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error('No active user session.');
    await sendEmailVerification(auth.currentUser);
  }, []);

  const refreshVerificationState = useCallback(async () => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const refreshed = auth.currentUser;
    setFirebaseUser(refreshed);
    if (refreshed.emailVerified) {
      await syncUserProfileAndRole(refreshed);
      return true;
    }
    return false;
  }, [syncUserProfileAndRole]);

  const updateUserProfile = useCallback(
    async (
      updates: Partial<
        Pick<
          UserProfile,
          'fullName' | 'institution' | 'country' | 'researchInterest' | 'userCategory' | 'photoUrl' | 'notificationsEnabled'
        >
      >
    ) => {
      if (!firebaseUser) throw new Error('Authentication required.');
      const path = `users/${firebaseUser.uid}`;
      const cleanPayload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (updates.fullName !== undefined) cleanPayload.fullName = updates.fullName.trim().slice(0, 120);
      if (updates.institution !== undefined) cleanPayload.institution = updates.institution.trim().slice(0, 200);
      if (updates.country !== undefined) cleanPayload.country = updates.country.trim().slice(0, 100);
      if (updates.researchInterest !== undefined) cleanPayload.researchInterest = updates.researchInterest.trim().slice(0, 200);
      if (updates.userCategory !== undefined) cleanPayload.userCategory = updates.userCategory;
      if (updates.photoUrl !== undefined && updates.photoUrl.trim()) {
        cleanPayload.photoUrl = updates.photoUrl.trim().slice(0, 500);
      }
      if (updates.notificationsEnabled !== undefined) cleanPayload.notificationsEnabled = updates.notificationsEnabled;

      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), cleanPayload);
        if (updates.fullName) {
          await updateProfile(firebaseUser, { displayName: updates.fullName.trim() });
        }
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) setProfile(snap.data() as UserProfile);
        await writeActivityLog(firebaseUser.uid, serverRole, 'PROFILE_UPDATED', 'Updated researcher profile settings');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [firebaseUser, serverRole]
  );

  const changeUserPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('Password changes apply to email/password accounts.');
      }
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      await writeActivityLog(firebaseUser.uid, serverRole, 'PASSWORD_CHANGED', 'Updated account password');
    },
    [firebaseUser, serverRole]
  );

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    return auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        serverRole,
        authReady,
        theme,
        toggleTheme,
        setTheme,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        resendVerificationEmail,
        refreshVerificationState,
        updateUserProfile,
        changeUserPassword,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
