// src/lib/firebase-admin.ts
/**
 * @fileOverview Initializes and exports the Firebase Admin SDK instance.
 */

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const isServiceAccountJson = (value: unknown): value is { project_id: string; client_email: string; private_key: string } => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'project_id' in value &&
    typeof (value as any).project_id === 'string' &&
    'client_email' in value &&
    typeof (value as any).client_email === 'string' &&
    'private_key' in value &&
    typeof (value as any).private_key === 'string'
  );
};

const isFirebaseWebConfig = (value: any): value is { projectId: string } => {
  return Boolean(
    value &&
    typeof value.apiKey === 'string' &&
    typeof value.projectId === 'string'
  );
};

const ensureEmulatorEnvDefaults = () => {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
  process.env.FIREBASE_DATABASE_EMULATOR_HOST ||= '127.0.0.1:9000';
  process.env.STORAGE_EMULATOR_HOST ||= 'http://127.0.0.1:9199';
};

// Only load dotenv in development environment
if (process.env.NODE_ENV !== 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');

    // Carregar .env.local (mais específico)
    const envLocalPath = path.resolve(process.cwd(), '.env.local');

    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase Admin] Carregando .env.local de:', envLocalPath);
    }

    const envResult = dotenv.config({
      path: envLocalPath,
      override: true
    });

    if (process.env.NODE_ENV === 'development') {
      if (envResult.error) {
        console.log('[Firebase Admin] .env.local não encontrado:', envResult.error.message);
      } else {
        console.log('[Firebase Admin] .env.local carregado com sucesso!');
        console.log('[Firebase Admin] ADMIN_USE_EMULATOR:', process.env.ADMIN_USE_EMULATOR);
        console.log('[Firebase Admin] NEXT_PUBLIC_USE_FIREBASE_EMULATORS:', process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase Admin] dotenv não disponível, usando variáveis de ambiente');
    }
  }
}

// Verificar se deve usar emulators
const shouldUseEmulators = () => {
  const useEmulators = process.env.NODE_ENV === 'development' &&
    (process.env.ADMIN_USE_EMULATOR === 'true' ||
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true');

  if (process.env.NODE_ENV === 'development') {
    console.log('[Firebase Admin] 🔍 Verificando emulators:', {
      NODE_ENV: process.env.NODE_ENV,
      ADMIN_USE_EMULATOR: process.env.ADMIN_USE_EMULATOR,
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
      shouldUseEmulators: useEmulators
    });
  }

  return useEmulators;
};

// Resolve database URL de forma robusta
const resolveDatabaseUrl = (projectId?: string) => {
  const dbUrl = (
    process.env.FIREBASE_DATABASE_URL ||
    process.env.REALTIME_DB_URL ||
    process.env.NEXT_PUBLIC_REALTIME_DB_URL ||
    (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined) ||
    (projectId ? `https://${projectId}.firebaseio.com` : undefined) ||
    (process.env.FIREBASE_PROJECT_ID ? `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com` : undefined) ||
    'https://projeto-italo-bc5ef-default-rtdb.firebaseio.com'
  );

  if (process.env.NODE_ENV === 'development') {
    console.log('[Firebase Admin] 🔗 Resolved Database URL:', dbUrl);
  }
  return dbUrl;
};

// Normaliza o nome do bucket para usar o formato correto do Firebase Storage
const resolveStorageBucket = (projectId?: string) => {
  // Prioridade: variável de ambiente > fallback com projectId
  let rawBucket = (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.appspot.com` : undefined) ||
    (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com` : undefined) ||
    'projeto-italo-bc5ef.appspot.com'
  );

  // Log para debug
  if (process.env.NODE_ENV === 'development') {
    console.log('[Firebase Admin] 🪣 Raw bucket value:', rawBucket);
  }

  // Normalizar: o Admin SDK funciona melhor with .appspot.com
  // mas também aceita .firebasestorage.app em versões mais recentes
  // Vamos manter o formato original se já estiver correto
  if (rawBucket?.endsWith('.firebasestorage.app')) {
    // Tentar usar o formato .firebasestorage.app diretamente (novo formato)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Firebase Admin] ℹ️ Usando bucket com formato .firebasestorage.app:', rawBucket);
    }
    return rawBucket;
  }

  return rawBucket;
};

// Usar variáveis de ambiente quando disponíveis, com fallback para ADC em produção
const getServiceAccountFromEnv = () => {
  // 1) Suporte a JSON completo via variável (mais robusto em ambientes gerenciados)
  const jsonCandidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT,
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    process.env.FIREBASE_CREDENTIALS_JSON,
    process.env.GOOGLE_SERVICE_ACCOUNT
  ].filter(Boolean) as string[];

  for (const json of jsonCandidates) {
    try {
      const parsed = JSON.parse(json);
      if (parsed?.private_key && parsed?.client_email) {
        parsed.private_key = String(parsed.private_key).replace(/\n/g, '\n');
        if (process.env.NODE_ENV === 'development') {
          console.log('[Firebase Admin] Credenciais via JSON em variável detectadas.');
        }
        return parsed;
      }
    } catch {
      // ignorar e tentar próxima opção
    }
  }

  // 2) Suporte a chave privada em Base64
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY || process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY;
  const base64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || process.env.GOOGLE_PRIVATE_KEY_BASE64;
  if (!privateKey && base64) {
    try {
      privateKey = Buffer.from(base64, 'base64').toString('utf8');
    } catch (e) {
      console.error('[Firebase Admin] Falha ao decodificar FIREBASE_PRIVATE_KEY_BASE64');
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.PROJECT_ID;
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.ADMIN_CLIENT_EMAIL ||
    process.env.NEXT_PUBLIC_ADMIN_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    if (process.env.NODE_ENV !== 'development') {
      console.log('[Firebase Admin] Variáveis de serviço ausentes. Tentando Application Default Credentials (ADC).');
    }
    return null;
  }

  // Processar a chave privada (remover escapes)
  let processedPrivateKey = privateKey;
  if (processedPrivateKey.includes('\\n')) {
    processedPrivateKey = processedPrivateKey.replace(/\\n/g, '\n');
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Firebase Admin] 🔧 Chave privada processada. BEGIN:', processedPrivateKey.includes('-----BEGIN PRIVATE KEY-----'), 'END:', processedPrivateKey.includes('-----END PRIVATE KEY-----'));
  }

  return {
    type: 'service_account',
    project_id: projectId,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || process.env.ADMIN_PRIVATE_KEY_ID,
    private_key: processedPrivateKey,
    client_email: clientEmail,
    client_id: process.env.FIREBASE_CLIENT_ID || process.env.ADMIN_CLIENT_ID,
    auth_uri: process.env.ADMIN_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.ADMIN_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url:
      process.env.ADMIN_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url:
      process.env.ADMIN_CLIENT_CERT_URL || `https://www.googleapis.com/robot/v1/metadata/x509/${clientEmail}`,
    universe_domain: process.env.ADMIN_UNIVERSE_DOMAIN || 'googleapis.com',
  };
};
export function initializeFirebaseAdmin() {
  try {
    // Verificar se já existe uma instância
    const existingApps = getApps();
    if (existingApps.length > 0) {
      console.log('[Firebase Admin] App already exists, returning existing instance');
      return existingApps[0];
    }

    let app;
    const useEmulators = shouldUseEmulators();
    let projectIdCandidateFromWebConfig: string | undefined;

    if (useEmulators) {
      ensureEmulatorEnvDefaults();
      if (process.env.NODE_ENV === 'development') {
        console.log('[Firebase Admin] 🧪 Emulator mode enabled. Hosts:', {
          FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
          FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
          FIREBASE_DATABASE_EMULATOR_HOST: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
          STORAGE_EMULATOR_HOST: process.env.STORAGE_EMULATOR_HOST,
        });
      }
    }

    // 🔹 PRIORIDADE 1: Tentar arquivo local de Service Account (funciona em dev e build local)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const path = require('path');
      const candidatePaths: string[] = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        path.join(process.cwd(), 'service_account.json'),
        path.join(process.cwd(), 'firebase-service-account.json'),
        path.join(process.cwd(), 'serviceAccountKey.json'),
        path.join(process.cwd(), 'firebase-adminsdk.json'),
        path.join(process.cwd(), 'firebase-credentials.json')
      ].filter(Boolean);

      console.log('[Firebase Admin] 🔍 process.cwd():', process.cwd());

      for (const candidatePath of candidatePaths) {
        console.log('[Firebase Admin] 🔍 Procurando credenciais em:', candidatePath);
        if (!fs.existsSync(candidatePath)) continue;

        console.log('[Firebase Admin] ✅ Arquivo encontrado:', candidatePath);
        const parsed = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));

        if (isServiceAccountJson(parsed)) {
          console.log('[Firebase Admin] 📄 Usando Service Account JSON - project:', parsed.project_id);

          const storageBucket = resolveStorageBucket(parsed.project_id);
          const databaseURL = resolveDatabaseUrl(parsed.project_id);

          app = initializeApp({
            credential: cert(parsed as any),
            databaseURL: databaseURL,
            projectId: parsed.project_id,
            storageBucket: storageBucket
          } as any);

          console.log('[Firebase Admin] ✅ Firebase Admin SDK initialized successfully with Service Account JSON');
          console.log('[Firebase Admin] 📦 Storage Bucket:', storageBucket);
          return app;
        }

        if (isFirebaseWebConfig(parsed)) {
          projectIdCandidateFromWebConfig = parsed.projectId;
          console.warn('[Firebase Admin] ⚠️ Arquivo encontrado parece ser config do Firebase Web SDK (apiKey/projectId).');
          console.warn('[Firebase Admin] ⚠️ Isso NÃO é uma Service Account e não pode ser usado pelo Admin SDK.');
          continue;
        }

        console.warn('[Firebase Admin] ⚠️ Arquivo de credenciais encontrado, mas não contém campos de Service Account (project_id/client_email/private_key).');
      }

      console.log('[Firebase Admin] ℹ️ Nenhum arquivo de Service Account válido encontrado. Tentando variáveis de ambiente...');
    } catch (error) {
      console.error('[Firebase Admin] ❌ Erro ao carregar firebase-credentials.json:', error);
      console.error('[Firebase Admin] ❌ Stack trace:', (error as Error).stack);
    }

    // 🔹 PRIORIDADE 2: Tentar credenciais de variáveis de ambiente
    const serviceAccount = getServiceAccountFromEnv();

    if (serviceAccount) {
      if (serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----') &&
        serviceAccount.private_key.includes('-----END PRIVATE KEY-----')) {
        console.log('[Firebase Admin] 🔐 Usando credenciais de variáveis de ambiente');

        // Obter storage bucket e database URL
        const storageBucket = resolveStorageBucket(serviceAccount.project_id);
        const databaseURL = resolveDatabaseUrl(serviceAccount.project_id);

        app = initializeApp({
          credential: cert(serviceAccount as any),
          databaseURL: databaseURL,
          projectId: serviceAccount.project_id,
          storageBucket: storageBucket
        });
        console.log('[Firebase Admin] 📦 Storage Bucket:', storageBucket);
      } else {
        console.error('[Firebase Admin] ❌ Chave privada incompleta/inválida nas variáveis.');
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Firebase Admin] ⚠️ Firebase Admin desabilitado em desenvolvimento.');
          return null;
        }
      }
    }

    // 🔹 PRIORIDADE 2.5: Emuladores em desenvolvimento (sem credenciais reais)
    if (!app && useEmulators) {
      const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GCLOUD_PROJECT ||
        process.env.GCP_PROJECT ||
        projectIdCandidateFromWebConfig ||
        'demo-project';

      const storageBucket = resolveStorageBucket(projectId);
      const databaseURL = resolveDatabaseUrl(projectId);

      if (process.env.NODE_ENV === 'development') {
        console.warn('[Firebase Admin] 🧪 Inicializando Admin SDK em modo emulador sem Service Account.');
        console.warn('[Firebase Admin] 🧪 Usando projectId:', projectId);
      }

      const options: any = {
        projectId,
        storageBucket,
        databaseURL
      };

      // Se o host do emulador estiver definido, o databaseURL pode precisar ser ajustado
      if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
        options.databaseURL = `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/?ns=${projectId}`;
      }

      app = initializeApp(options);
      console.log('[Firebase Admin] ✅ Firebase Admin SDK initialized (emulators)');
      return app;
    }

    // 🔹 PRIORIDADE 3: Application Default Credentials (ADC)
    // - Cloud Run: K_SERVICE
    // - Local/dev: GOOGLE_APPLICATION_CREDENTIALS (service account path) ou gcloud ADC já configurado
    if (!app && (process.env.K_SERVICE || process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.log('[Firebase Admin] 🔐 Usando Application Default Credentials (ADC)');

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const storageBucket = resolveStorageBucket(projectId);
      const databaseURL = resolveDatabaseUrl(projectId);

      app = initializeApp({
        credential: applicationDefault(),
        projectId: projectId,
        databaseURL: databaseURL,
        storageBucket: storageBucket
      } as any);
      console.log('[Firebase Admin] 📦 Storage Bucket:', storageBucket);
    }

    // Se chegou aqui sem app, falhou
    if (!app) {
      console.error('--------------------------------------------------------------------------------');
      console.error('[Firebase Admin] ❌ FATAL: Nenhuma credencial válida foi encontrada.');
      console.error('[Firebase Admin] O SDK Admin não pôde ser inicializado.');
      console.error('--------------------------------------------------------------------------------');
      console.error('[Firebase Admin] 💡 Como resolver:');
      if (process.env.NODE_ENV === 'development') {
        console.error('[Firebase Admin] Opção 1 (Recomendado para Dev): Crie um arquivo `.env.local` na raiz do projeto e adicione as variáveis de ambiente da sua Service Account. Exemplo:');
        console.error(`
  FIREBASE_PROJECT_ID="seu-projeto-id"
  FIREBASE_CLIENT_EMAIL="firebase-adminsdk-..."
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."`);
        console.error('\n[Firebase Admin] Opção 2: Coloque um arquivo de Service Account na raiz do projeto. Nomes aceitos:');
        console.error('  - firebase-service-account.json');
        console.error('  - serviceAccountKey.json');
        console.error('  - firebase-adminsdk.json');
        console.error('  - ou configure FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS');
        console.error('\n[Firebase Admin] ⚠️ Observação: firebase-credentials.json neste repo parece ser config do Firebase Web SDK (apiKey/projectId).');
        console.error('[Firebase Admin] ⚠️ Ele não serve como Service Account para o Admin SDK.');
      } else {
        console.error('[Firebase Admin] Em produção, configure as variáveis de ambiente (ex: FIREBASE_SERVICE_ACCOUNT ou GOOGLE_APPLICATION_CREDENTIALS_JSON) no seu provedor de hosting.');
      }
      console.error('[Firebase Admin] Opção 3: Se estiver em um ambiente GCP (Cloud Run, Functions), certifique-se de que a conta de serviço tem as permissões corretas (Application Default Credentials).');
      console.error('--------------------------------------------------------------------------------');
      return null;
    }

    console.log('[Firebase Admin] ✅ Firebase Admin SDK initialized successfully');

    return app;
  } catch (error) {
    console.error('[Admin SDK] Error during Firebase Admin initialization:', error);
    return null;
  }
}

/**
 * Gets the Firebase Admin App instance, initializing it if necessary.
 *
 * @returns {App | null} The Firebase Admin App instance or null if initialization fails.
 */
export function getAdminApp() {
  try {
    return initializeFirebaseAdmin();
  } catch (error) {
    console.error('[Admin SDK] Error getting admin app:', error);
    return null;
  }
}

/**
 * Gets the Firestore instance from the Firebase Admin App.
 *
 * @returns {Firestore | null} The Firestore instance or null if the app is not initialized.
 */
export function getAdminDb() {
  try {
    const app = getAdminApp();
    if (!app) {
      console.error('[Admin SDK] Cannot get Firestore: Admin app not initialized');
      return null;
    }
    return getFirestore(app);
  } catch (error) {
    console.error('[Admin SDK] Error getting admin database:', error);
    return null;
  }
}

/**
 * Gets the Realtime Database instance from the Firebase Admin App.
 * 
 * @returns {Database | null} The Database instance or null if the app is not initialized or databaseURL is missing.
 */
export function getAdminRtdb() {
  try {
    const app = getAdminApp();
    if (!app) {
      return null;
    }
    return getDatabase(app);
  } catch (error) {
    console.warn('[Admin SDK] Could not get Realtime Database. Ensure databaseURL is configured.');
    return null;
  }
}

/**
 * Gets the Storage instance from the Firebase Admin App.
 *
 * @returns {Storage | null} The Storage instance or null if the app is not initialized.
 */
export function getAdminStorage() {
  try {
    const app = getAdminApp();
    if (!app) {
      console.error('[Admin SDK] Cannot get Storage: Admin app not initialized');
      return null;
    }

    // Obter bucket name de variáveis de ambiente ou do firebase-config.json
    const bucketName = resolveStorageBucket();

    if (process.env.NODE_ENV === 'development') {
      console.log('[Admin SDK] Storage bucket configurado:', bucketName);
    }

    return getStorage(app);
  } catch (error) {
    console.error('[Admin SDK] Error getting admin storage:', error);
    return null;
  }
}

/**
 * Convenience helper to directly access the Storage Bucket with a consistent name.
 */
export function getAdminBucket() {
  const storage = getAdminStorage();
  if (!storage) return null;
  const bucketName = resolveStorageBucket();
  console.log('[Admin SDK] 🪣 Acessando bucket:', bucketName);
  return storage.bucket(bucketName);
}

/**
 * Gets the Auth instance from the Firebase Admin App.
 *
 * @returns {Auth | null} The Auth instance or null if the app is not initialized.
 */
export function getAdminAuth() {
  try {
    const app = getAdminApp();
    if (!app) {
      console.error('[Admin SDK] Cannot get Auth: Admin app not initialized');
      return null;
    }
    return getAuth(app);
  } catch (error) {
    console.error('[Admin SDK] Error getting admin auth:', error);
    return null;
  }
}

// Inicializar automaticamente
let adminApp: any = null;
let adminDb: any = null;
let adminRtdb: any = null;
let adminStorage: any = null;
let adminAuth: any = null;

try {
  adminApp = getAdminApp();
  adminDb = getAdminDb();
  adminRtdb = getAdminRtdb();
  adminStorage = getAdminStorage();
  adminAuth = getAdminAuth();
} catch (error) {
  console.error('[Admin SDK] Firebase Admin SDK initialization failed.');
}

// Exportações principais
export { adminApp, adminDb, adminRtdb, adminStorage, adminAuth };

// Exportação de auth como default para compatibilidade
export const auth = adminAuth;

// Exportação default
export default adminApp;
