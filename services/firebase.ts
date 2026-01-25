
import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Configuração do Firebase.
 * Chave de API injetada via ambiente.
 * Para resolver o erro de conexão, habilitamos experimentalForceLongPolling.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// initializeFirestore permite configurações específicas para evitar erros de rede gRPC/timeout
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
