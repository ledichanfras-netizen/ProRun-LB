
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "tTnQATkTY9hsJsyEpTAPtJiZM0CkYCbydSUMgcXcJHM",
  authDomain: "prorunlb.firebaseapp.com",
  projectId: "prorunlb",
  storageBucket: "prorunlb.firebasestorage.app",
  messagingSenderId: "5064421357",
  appId: "1:5064421357:web:c595b37f9f693f752041e4"
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
