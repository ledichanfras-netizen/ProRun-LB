
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "tTnQATkTY9hsJsyEpTAPtJiZM0CkYCbydSUMgcXcJHM",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "prorunlb.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "prorunlb",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "prorunlb.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "5064421357",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:5064421357:web:c595b37f9f693f752041e4"
};

// Initialize Firebase only if config is available
export const app = initializeApp(firebaseConfig);
export const auth = app ? getAuth(app) : null;

// Inicializa o Firestore com cache persistente para evitar timeouts e permitir uso offline
export const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : null;
