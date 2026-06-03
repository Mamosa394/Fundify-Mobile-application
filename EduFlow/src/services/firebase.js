import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

console.log('[Firebase] Starting initialization sequence...');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log('[Firebase] Config parsed from environment variables:', {
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  hasApiKey: !!firebaseConfig.apiKey,
});

// Initialize Firebase App instance safely across hot reloads
let app;
if (getApps().length) {
  app = getApps()[0];
  console.log('[Firebase] Using existing app instance reference');
} else {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase] Created new app instance reference successfully');
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey) && Boolean(firebaseConfig.projectId);

export const auth = getAuth(app);
console.log('[Firebase] Auth initialized');

export const db = getFirestore(app);
console.log('[Firebase] Firestore initialized');

export const storage = getStorage(app);
console.log('[Firebase] Storage initialized');

export const googleProvider = new GoogleAuthProvider();
console.log('[Firebase] Google Auth provider initialized');

/**
 * Log in an existing user
 */
export async function loginWithEmail(email, password) {
  console.log('[Auth] Login attempt started for:', email);
  try {
    const res = await signInWithEmailAndPassword(auth, email, password);
    console.log('[Auth] Login successful for UID:', res.user.uid);
    return res;
  } catch (error) {
    console.error('[Auth] Login failed:', error.code, error.message);
    throw error;
  }
}

/**
 * Registers a new student and creates their profile in Firestore
 */
export async function registerStudent(email, password, profile) {
  console.log('[Registration] Process started for:', email);
  try {
    console.log('[Registration] Step 1: Creating Firebase Auth user...');
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('[Registration] Auth user created, UID:', credential.user.uid);

    console.log('[Registration] Step 2: Saving profile to Firestore...');
    const userDocData = {
      uid: credential.user.uid,
      email: email.toLowerCase().trim(),
      name: profile.name,
      studentNumber: profile.studentNumber,
      university: profile.university,
      fundingType: profile.fundingType,
      createdAt: serverTimestamp(),
      role: 'student',
    };
    
    await setDoc(doc(db, 'users', credential.user.uid), userDocData);
    console.log('[Registration] Profile saved successfully');
    
    return credential;
  } catch (error) {
    console.error('[Registration] Error:', error.code, error.message);
    throw error;
  }
}

/**
 * Password Reset
 */
export async function resetPassword(email) {
  console.log('[Auth] Password reset requested for:', email);
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('[Auth] Password reset email sent');
  } catch (error) {
    console.error('[Auth] Reset failed:', error.code, error.message);
    throw error;
  }
}

/**
 * Sign out
 */
export async function logout() {
  const currentUser = auth.currentUser;
  console.log('[Auth] Logout requested for:', currentUser?.email);
  try {
    await signOut(auth);
    console.log('[Auth] Logout successful');
  } catch (error) {
    console.error('[Auth] Logout failed:', error.code, error.message);
    throw error;
  }
}

/**
 * Find a student by student number
 */
export async function findStudentByNumber(studentNumber) {
  console.log('[Firestore] Searching for student number:', studentNumber);
  try {
    const q = query(collection(db, 'users'), where('studentNumber', '==', studentNumber));
    const results = await getDocs(q);
    
    if (results.empty) {
      console.log('[Firestore] No student found');
      return null;
    }

    const student = results.docs.map((entry) => ({ id: entry.id, ...entry.data() }))[0];
    console.log('[Firestore] Student found:', student.name);
    return student;
  } catch (error) {
    console.error('[Firestore] Search failed:', error.code, error.message);
    throw error;
  }
}