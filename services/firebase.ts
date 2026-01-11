
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
  authDomain: "prorun-lb.firebaseapp.com",
  projectId: "prorun-lb",
  storageBucket: "prorun-lb.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// initializeFirestore permite configurações específicas para evitar erros de rede gRPC/timeout
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
