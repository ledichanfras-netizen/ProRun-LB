import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuração robusta para Vite e Render.com
// As variáveis devem ser prefixadas com VITE_ e configuradas no painel do Render
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN || "prorun-lb.firebaseapp.com",
  projectId: import.meta.env.VITE_PROJECT_ID || "prorun-lb",
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET || "prorun-lb.appspot.com",
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID || "458712548963",
  appId: import.meta.env.VITE_APP_ID || "1:458712548963:web:7f8e9a0b1c2d3e4f5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Inicializa o Firestore com cache persistente para evitar timeouts e permitir uso offline
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
