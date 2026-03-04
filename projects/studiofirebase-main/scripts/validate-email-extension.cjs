/*
  Validates Firestore Send Email (firebase/firestore-send-email) extension.

  What it does:
  - Writes a document to the `mail` collection
  - Polls the same doc until the extension adds `delivery` or `error`

  Usage:
    EMAIL_EXTENSION_TEST_TO=you@example.com node scripts/validate-email-extension.cjs
*/

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const serviceAccount = require('../service_account.json');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const to = process.env.EMAIL_EXTENSION_TEST_TO || 'is@italosantos.com';
  console.log('[validate-email-extension] starting', {
    projectId: serviceAccount.project_id,
    to,
    toAsArray: process.env.EMAIL_EXTENSION_TO_AS_ARRAY === 'true',
  });

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const db = getFirestore();
  console.log('[validate-email-extension] firebase initialized; writing mail doc...');
  const subject = `Teste Email Extension (${new Date().toISOString()})`;

  // A extensão aceita `to` como string ou array dependendo da versão/config.
  // Usamos string por compatibilidade e mantemos opção de array via env.
  const toField = process.env.EMAIL_EXTENSION_TO_AS_ARRAY === 'true' ? [to] : to;

  const writeTimeoutMs = Number(process.env.EMAIL_EXTENSION_FIRESTORE_WRITE_TIMEOUT_MS || 15000);

  const writePromise = db.collection('mail').add({
    to: toField,
    message: {
      subject,
      text: 'Teste automático: documento criado para validar a extensão firestore-send-email.',
      html: '<p>Teste automático: documento criado para validar a extensão <code>firestore-send-email</code>.</p>',
    },
    createdAt: FieldValue.serverTimestamp(),
    metadata: {
      type: 'email-extension-validation',
      createdBy: 'scripts/validate-email-extension.cjs',
      projectId: serviceAccount.project_id,
    },
  });

  const ref = await Promise.race([
    writePromise,
    (async () => {
      await sleep(writeTimeoutMs);
      throw new Error(
        `Timeout ao escrever no Firestore (mail) após ${writeTimeoutMs}ms. Verifique rede/credenciais/projeto.`
      );
    })(),
  ]);

  console.log('[mail] created doc:', ref.id, 'to:', to);

  const maxAttempts = Number(process.env.EMAIL_EXTENSION_MAX_ATTEMPTS || 100);
  const delayMs = Number(process.env.EMAIL_EXTENSION_DELAY_MS || 3000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const snap = await ref.get();
    const data = snap.data() || {};

    const delivery = data.delivery;
    const state = delivery?.state || delivery?.status || null;
    const error = data.error || delivery?.error || null;

    if (delivery || state || error) {
      const normalizedState = typeof state === 'string' ? state.toUpperCase() : null;
      const delivered = delivery?.delivered === true;

      const terminalSuccessStates = new Set(['SUCCESS', 'SENT', 'DELIVERED']);
      const terminalErrorStates = new Set(['ERROR', 'FAILED']);

      if (error || (normalizedState && terminalErrorStates.has(normalizedState))) {
        console.log('[mail] processed (error):', {
          attempt,
          hasDelivery: !!delivery,
          state,
          error,
          info: delivery?.info,
        });
        process.exit(1);
      }

      if (delivered || (normalizedState && terminalSuccessStates.has(normalizedState))) {
        console.log('[mail] processed (success):', {
          attempt,
          hasDelivery: !!delivery,
          state,
          error,
          info: delivery?.info,
        });
        process.exit(0);
      }

      // PENDING/PROCESSING/RETRYING/etc — keep polling.
      console.log('[mail] processed (non-terminal):', {
        attempt,
        state,
      });
    }

    process.stdout.write(`waiting ${attempt}/${maxAttempts}...\n`);
    await sleep(delayMs);
  }

  console.log('[mail] not processed yet: no delivery/error fields after polling');
  process.exit(2);
}

main().catch((err) => {
  console.error('[validate-email-extension] failed:', err?.message || err);
  process.exit(1);
});
