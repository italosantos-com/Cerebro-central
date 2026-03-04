// ✅ FIREBASE CONFIGURAÇÃO OFICIAL - MÉTODO PADRÃO DA INDÚSTRIA
// Import the functions you need from the SDKs
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, query, orderByChild, ref, off } from "firebase/database";
import { getFirestore, connectFirestoreEmulator, initializeFirestore, FirestoreSettings } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

function isVerboseDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_VERBOSE_DEBUG === 'true') {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem('verboseDebug') === 'true';
  } catch {
    return false;
  }
}

function firebaseInfo(message: string, ...args: unknown[]) {
  if (!isVerboseDebugEnabled()) {
    return;
  }
  console.log(message, ...args);
}

// 🚀 CONFIGURAÇÃO OFICIAL
firebaseInfo('🔧 [Firebase] Inicializando configuração oficial');

// Helper para montar config de forma resiliente (usa env ou fallback para arquivo JSON)
function buildFirebaseConfig() {
  const fromEnv = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  } as const;

  // Se algum campo essencial estiver ausente, tenta fallback para firebase-config.json
  const missingCore = !fromEnv.apiKey || !fromEnv.authDomain || !fromEnv.projectId || !fromEnv.appId;
  if (missingCore) {
    try {
      // Import dinâmico para evitar incluir no client se não precisar
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fromFile = require('../../firebase-config.json');
      const merged = {
        apiKey: fromEnv.apiKey || fromFile.apiKey,
        authDomain: fromEnv.authDomain || fromFile.authDomain,
        databaseURL: fromEnv.databaseURL || fromFile.databaseURL,
        projectId: fromEnv.projectId || fromFile.projectId,
        storageBucket: fromEnv.storageBucket || fromFile.storageBucket,
        messagingSenderId: fromEnv.messagingSenderId || fromFile.messagingSenderId,
        appId: fromEnv.appId || fromFile.appId,
        measurementId: fromEnv.measurementId || fromFile.measurementId,
      };
      if (!merged.apiKey) {
        // Log claro para diagnosticar erro de API key inválida
        console.error('❌ [Firebase] API key ausente. Defina NEXT_PUBLIC_FIREBASE_API_KEY ou preencha firebase-config.json');
      }
      return merged;
    } catch (err) {
      console.error('❌ [Firebase] Não foi possível carregar firebase-config.json como fallback:', err);
    }
  }

  return fromEnv;
}

// Your web app's Firebase configuration (com fallback resiliente)
const firebaseConfig = buildFirebaseConfig();

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const forceLongPolling = process.env.NEXT_PUBLIC_FIRESTORE_FORCE_LONG_POLLING === 'true'
  || (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname));

const firestoreSettings: FirestoreSettings & { useFetchStreams?: boolean } = {
  experimentalForceLongPolling: forceLongPolling,
  experimentalAutoDetectLongPolling: !forceLongPolling,
  // Ative somente se precisar. Alguns builds não reconhecem a flag no tipo.
  useFetchStreams: process.env.NEXT_PUBLIC_FIRESTORE_USE_FETCH_STREAMS === 'true',
};

const db = typeof window !== 'undefined'
  ? initializeFirestore(app, firestoreSettings)
  : getFirestore(app);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
// Use us-central1 region to match firebase.json hosting configuration
const functions = getFunctions(app, 'us-central1');

// 🔇 Silenciar erros de CORS do Firestore em desenvolvimento (WebChannel/HTTP long-polling)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Capturar e silenciar erros de CORS do Firestore
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const url = input instanceof Request ? input.url : input.toString ? input.toString() : '';
    
    // Se for Firestore WebChannel, capturar erros de CORS silenciosamente
    if (url.includes('firestore.googleapis.com') && url.includes('/Listen/channel')) {
      return originalFetch(input, init).catch((error: any) => {
        if (error.message?.includes('access control') || error.message?.includes('CORS')) {
          firebaseInfo('[Firebase] CORS do Firestore silenciado (esperado em desenvolvimento)');
          // Retornar uma resposta vazia para não quebrar o app
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      });
    }
    
    return originalFetch(input, init);
  } as any;
}

// 🏗️ MÉTODO OFICIAL: USAR VARIÁVEL DE AMBIENTE DEDICADA
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

// 🔍 LOGS PARA DEBUG
firebaseInfo('🔍 [Firebase] Configuração detectada:', {
  useEmulators,
  envVar: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
  nodeEnv: process.env.NODE_ENV,
  isClient: typeof window !== 'undefined'
});

// 🚨 LOG ADICIONAL PARA DEBUG (apenas em produção, silenciar em dev)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  firebaseInfo('🚨 [CLIENT] Todas as variáveis de ambiente no cliente:');
  firebaseInfo('NEXT_PUBLIC_USE_FIREBASE_EMULATORS:', process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS);
  firebaseInfo('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  firebaseInfo('All NEXT_PUBLIC vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')));
}

// 🔧 CONECTAR AOS EMULATORS BASEADO NA VARIÁVEL OFICIAL
if (useEmulators) {
  firebaseInfo('🏠 [Firebase] MODO EMULATORS - Conectando aos emulators locais');
  firebaseInfo('🚨 [DEBUG] useEmulators é TRUE, indo para modo emulators');

  // ✅ Auth Emulator (resolve erro 503)
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    firebaseInfo('✅ [Firebase] Auth Emulator conectado (porta 9099)');
  } catch (error) {
    firebaseInfo('⚠️ [Firebase] Auth Emulator já conectado');
  }

  // ✅ Firestore Emulator (dados locais)
  try {
    connectFirestoreEmulator(db, 'localhost', 8081);
    firebaseInfo('✅ [Firebase] Firestore Emulator conectado (porta 8081)');
  } catch (error) {
    firebaseInfo('⚠️ [Firebase] Firestore Emulator já conectado');
  }

  // ✅ Functions Emulator (sync de email)
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    firebaseInfo('✅ [Firebase] Functions Emulator conectado (porta 5001)');
  } catch (error) {
    firebaseInfo('⚠️ [Firebase] Functions Emulator já conectado');
  }

  firebaseInfo('🎉 [Firebase] EMULATORS CONECTADOS COM SUCESSO!');
  firebaseInfo('🌐 [Firebase] Emulator UI: http://localhost:4000');
  firebaseInfo('🏠 [Firebase] Hosting: http://localhost:5000');

} else {
  firebaseInfo('🌐 [Firebase] MODO PRODUÇÃO - Usando Firebase real');
  firebaseInfo('🚨 [DEBUG] useEmulators é FALSE, indo para modo produção');
  firebaseInfo('🚨 [DEBUG] Valor da variável:', process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS);
  firebaseInfo('📍 [Firebase] Projeto:', firebaseConfig.projectId);
  if (!firebaseConfig.apiKey) {
    console.error('🚫 [Firebase] API key não encontrada. Isso causa "API key not valid" no Identity Toolkit.');
    console.error('   -> Verifique .env.local/.env.production: NEXT_PUBLIC_FIREBASE_API_KEY');
    console.error('   -> Ou preencha firebase-config.json com as credenciais Web do Firebase');
  }
}

// Compatibilidade
const isLocalhost = useEmulators;

export { app, firebaseConfig, db, auth, database, storage, functions, query, orderByChild, ref, off, isLocalhost };
