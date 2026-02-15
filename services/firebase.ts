import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuração robusta para Vite e Render.com
// As chaves devem estar no Render.com com o prefixo VITE_
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_AUTH_DOMAIN || "prorun-lb.firebaseapp.com",
  projectId: import.meta.env.VITE_PROJECT_ID || "prorun-lb",
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET || "prorun-lb.appspot.com",
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID || "458712548963",
  appId: import.meta.env.VITE_APP_ID || "1:458712548963:web:7f8e9a0b1c2d3e4f5"
};

// Validação mínima para evitar crash em inicialização
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
  console.error("Firebase Error: VITE_API_KEY não encontrada nas variáveis de ambiente.");
}

let app: any = null;
let auth: any = null;
let db: any = null;

try {
  // 1. Inicializa o App
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error("Erro fatal ao inicializar Firebase App:", error);
}

if (app) {
  // 2. Inicializa Auth independentemente
  try {
    auth = getAuth(app);
  } catch (error) {
    console.error("Erro ao inicializar Firebase Auth:", error);
  }

  // 3. Inicializa Firestore independentemente
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (error) {
    console.error("Erro ao inicializar Firestore:", error);
  }
}

export { app, auth, db };
