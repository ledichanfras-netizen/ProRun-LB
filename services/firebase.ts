
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const getFirebaseConfig = () => {
  const apiKey = 
    import.meta.env.VITE_FIREBASE_API_KEY || 
    process.env.VITE_FIREBASE_API_KEY || 
    process.env.API_KEY || 
    import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("Firebase API Key is missing. Auth and Database features will be disabled.");
    return null;
  }

  return {
    apiKey,
    authDomain: "prorun-lb.firebaseapp.com",
    projectId: "prorun-lb",
    storageBucket: "prorun-lb.appspot.com",
    messagingSenderId: "458712548963",
    appId: "1:458712548963:web:7f8e9a0b1c2d3e4f5"
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase only if config is available
export const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

// Inicializa o Firestore com cache persistente para evitar timeouts e permitir uso offline
export const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : null;
