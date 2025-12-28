// Modular Firebase v9+ imports
// Fixed: Ensuring correct named import for initializeApp from 'firebase/app'
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

/**
 * Configuração centralizada do Firebase.
 * O SDK de IA e o Firebase compartilham a mesma chave de API neste ambiente.
 */
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "prorun-lb.firebaseapp.com",
  projectId: "prorun-lb",
  storageBucket: "prorun-lb.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);