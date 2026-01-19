
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Configuração do Firebase.
 * O erro 'unavailable' geralmente indica bloqueio de WebSockets ou falta de conectividade.
 * Forçamos o Long Polling para garantir compatibilidade máxima.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "prorun-lb.firebaseapp.com",
  projectId: "prorun-lb",
  storageBucket: "prorun-lb.appspot.com",
  messagingSenderId: "458712548963",
  appId: "1:458712548963:web:7f8e9a0b1c2d3e4f5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Configuração robusta para evitar o status 'Sincronizando...' infinito
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
