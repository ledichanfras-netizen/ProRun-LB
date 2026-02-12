import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuração robusta para Vite e Render.com
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "prorun-lb.firebaseapp.com",
  projectId: "prorun-lb",
  storageBucket: "prorun-lb.appspot.com",
  messagingSenderId: "458712548963",
  appId: "1:458712548963:web:7f8e9a0b1c2d3e4f5"
};

let app: any = null;
let auth: any = null;
let db: any = null;

try {
  // Inicializa o Firebase apenas se ainda não foi inicializado
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);

  // Inicializa o Firestore com cache persistente
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error) {
  console.error("Erro crítico na inicialização do Firebase:", error);
  // Mantemos como null para que o AppContext possa verificar
}

export { app, auth, db };
