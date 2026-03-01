
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const getFirebaseConfig = () => {
  // Configurações via variáveis de ambiente (Vite usa import.meta.env)
  const apiKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_APP_ID;
  
  // Verificação básica: se não houver API Key ou Project ID, o Firebase não funcionará na nuvem
  if (!apiKey || !projectId) {
    const missing = [];
    if (!apiKey) missing.push("VITE_API_KEY");
    if (!projectId) missing.push("VITE_PROJECT_ID");

    console.warn(`⚠️ Configuração do Firebase incompleta (Faltando: ${missing.join(", ")}).`);
    console.warn("O aplicativo funcionará apenas LOCALMENTE. Os dados não serão salvos na nuvem e não serão compartilhados entre dispositivos.");
    console.warn("Para corrigir, configure as variáveis de ambiente no seu serviço de hospedagem (ex: Render).");
    return null;
  }

  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: storageBucket || `${projectId}.appspot.com`,
    messagingSenderId: messagingSenderId,
    appId: appId
  };
};

const firebaseConfig = getFirebaseConfig();

// Inicializa o Firebase com proteção contra falhas de configuração
const getApp = () => {
  if (!firebaseConfig) return null;
  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase (Verifique se as chaves são válidas):", error);
    return null;
  }
};

export const app = getApp();
export const auth = app ? getAuth(app) : null;

// Inicializa o Firestore com cache persistente
export const db = app ? initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}) : null;

if (db) {
  console.log("✅ Conexão com Firebase Cloud estabelecida com sucesso.");
} else {
  console.warn("⚠️ Firestore desativado. O aplicativo salvará os dados apenas no navegador (localStorage).");
}
