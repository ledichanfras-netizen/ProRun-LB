import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Helper to safely get env vars without crashing
const getEnv = (key: string) => {
  try {
    // Vite / Modern Browsers
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch (e) {
    // Ignore access errors
  }
  
  try {
    // Node / Webpack / Classic (Fallback)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore
  }
  
  return "";
};

// Configuração do Firebase
const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID")
};

// Check if config is present to avoid runtime crashes
const isConfigured = !!firebaseConfig.apiKey;

if (!isConfigured) {
  console.warn("Firebase não configurado! O app não salvará dados na nuvem. Verifique o arquivo .env ou as configurações da Vercel.");
}

// Inicializa o App (safe even with empty config, though it won't work for db calls)
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados Firestore
export const db = getFirestore(app);