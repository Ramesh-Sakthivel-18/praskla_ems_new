import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration with fallback values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "praskla-ems.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://praskla-ems-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "praskla-ems",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "praskla-ems.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:demo",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-DEMO",
};

let app;
let auth;
let db;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.warn('Firebase initialization failed:', error.message);
  // Create mock objects for development
  auth = null;
  db = null;
}

export { auth, db, signInWithCustomToken };
export default app;
export async function getValidIdToken() {
  try {
    if (auth && auth.currentUser) {
      const token = await auth.currentUser.getIdToken(true);
      if (token) {
        try {
          localStorage.setItem('firebaseToken', token);
        } catch {}
        return token;
      }
    }
  } catch (e) {
    console.warn('Failed to refresh Firebase ID token:', e?.message);
  }
  try {
    const stored = localStorage.getItem('firebaseToken') || '';
    return stored;
  } catch {
    return '';
  }
}
