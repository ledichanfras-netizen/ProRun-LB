
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || (process.env as any).FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: "prorun-lb.firebaseapp.com",
  projectId: "prorun-lb",
  storageBucket: "prorun-lb.appspot.com",
  messagingSenderId: "458712548963",
  appId: "1:458712548963:web:7f8e9a0b1c2d3e4f5"
};

// Initialize Firebase safely
let app;
try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
    throw new Error("Firebase API Key is missing. Please set VITE_FIREBASE_API_KEY in your environment.");
  }
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization failed:", error);
  // Create a dummy app object to prevent total crash, though services will fail when used
  app = { name: '[DEFAULT]', options: firebaseConfig, automaticDataCollectionEnabled: false } as any;
}

export const auth = getAuth(app);

// Inicializa o Firestore com cache persistente para evitar timeouts e permitir uso offline
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
