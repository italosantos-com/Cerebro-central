// Inicialização minimalista do Firebase Admin para leitura de logs.
// Evita importar módulo ESM complexo; usa require direto.

let adminApp = null;
let adminDb = null;

function initAdminMinimal() {
  try {
    const adminAppLib = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    const { cert, getApps } = adminAppLib;

    if (getApps().length) {
      adminApp = getApps()[0];
    } else {
      // Tenta service_account.json
      const fs = require('fs');
      const path = require('path');
      const servicePath = path.join(process.cwd(), 'service_account.json');
      let creds = null;
      if (fs.existsSync(servicePath)) {
        creds = JSON.parse(fs.readFileSync(servicePath, 'utf8'));
      } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
        creds = {
          project_id: process.env.FIREBASE_PROJECT_ID,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        };
      }

      const projectId = (creds && creds.project_id) || process.env.FIREBASE_PROJECT_ID || 'unknown-project';
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

      if (creds) {
        adminApp = adminAppLib.initializeApp({
          credential: cert(creds),
          projectId,
          storageBucket
        });
      } else {
        console.warn('[logs:emails] Sem credenciais. Tentando Application Default Credentials...');
        try {
          adminApp = adminAppLib.initializeApp({ projectId });
        } catch (e) {
          console.error('[logs:emails] Falha ADC:', e.message);
        }
      }
    }

    if (adminApp) {
      adminDb = getFirestore(adminApp);
    }
  } catch (e) {
    console.error('[logs:emails] Erro init admin:', e.message);
  }
}

async function run() {
  initAdminMinimal();
  if (!adminDb) {
    console.error('Firestore Admin não disponível (credenciais ausentes).');
    process.exit(1);
  }
  try {
    const snap = await adminDb.collection('email_logs').orderBy('createdAt', 'desc').limit(10).get();
    const rows = [];
    snap.forEach(doc => rows.push(doc.data()));
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('[logs:emails] Erro ao consultar email_logs:', e.message);
    process.exit(1);
  }
}

run();
