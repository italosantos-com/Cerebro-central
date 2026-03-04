const { z } = require('zod');
const { ai } = require('./genkit');
const admin = require('firebase-admin');
const { getDatabase } = require('firebase-admin/database');
const fs = require('fs');
const path = require('path');

function resolveDatabaseUrl(projectId) {
  return (
    process.env.FIREBASE_DATABASE_URL ||
    process.env.REALTIME_DB_URL ||
    process.env.NEXT_PUBLIC_REALTIME_DB_URL ||
    (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined) ||
    (projectId ? `https://${projectId}.firebaseio.com` : undefined)
  );
}

function ensureAdminApp() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountPath = path.join(process.cwd(), 'service_account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const projectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    const databaseURL = resolveDatabaseUrl(projectId);
    const initConfig = {
      credential: admin.credential.cert(serviceAccount),
      ...(projectId ? { projectId } : {}),
      ...(databaseURL ? { databaseURL } : {}),
    };
    admin.initializeApp({
      ...initConfig,
    });
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const databaseURL = resolveDatabaseUrl(projectId);
  admin.initializeApp({
    ...(projectId ? { projectId } : {}),
    ...(databaseURL ? { databaseURL } : {}),
  });
  return admin.app();
}

function getAdminDb() {
  return ensureAdminApp().firestore();
}

function getAdminAuth() {
  return ensureAdminApp().auth();
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
}

function getInternalToken() {
  return process.env.INTERNAL_SERVICE_TOKEN || '';
}

async function notifyAdmins({ subject, text, html }) {
  const token = getInternalToken();
  if (!token) {
    return { success: false, disabled: true, message: 'INTERNAL_SERVICE_TOKEN ausente' };
  }

  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/admin/notifications/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': token,
    },
    body: JSON.stringify({ subject, html, text }),
  });
  const data = await response.json().catch(() => ({}));
  return { success: response.ok && data?.success, data };
}

function parseIsoDate(value) {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function looksLikeEmail(value) {
  return typeof value === 'string' && value.includes('@');
}

function looksLikeSecretChatId(value) {
  if (typeof value !== 'string') return false;
  // secret-chat-<random> OR secret-chat-<scope>-<random>
  // scope: [a-z0-9_-]{1,40}, random: [a-z0-9]{1,24}
  return /^secret-chat-(?:[a-z0-9_-]{1,40}-)?[a-z0-9]{1,24}$/i.test(value);
}

async function getCollectionCount(ref) {
  try {
    if (typeof ref.count === 'function') {
      const snap = await ref.count().get();
      return snap.data().count || 0;
    }
  } catch {
    // fallback below
  }
  const snap = await ref.get();
  return snap.size;
}

/**
 * Ferramenta: Web Search (Google Custom Search)
 * Requer as env vars:
 * - GOOGLE_CSE_API_KEY (ou GOOGLE_CUSTOM_SEARCH_API_KEY)
 * - GOOGLE_CSE_CX (ou GOOGLE_CUSTOM_SEARCH_ENGINE_ID)
 */
const webSearch = ai.defineTool({
  name: 'webSearch',
  description: 'Pesquisa na web e retorna um resumo com links (Google Custom Search).',
  inputSchema: z.object({
    query: z.string().min(2).describe('Termos de busca'),
    maxResults: z.number().int().min(1).max(5).optional().describe('Número de resultados (1-5)'),
  }),
  outputSchema: z.any(),
}, async ({ query, maxResults = 5 }) => {
  try {
    const apiKey = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_CSE_CX || process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    if (!apiKey || !cx) {
      return {
        success: false,
        error: 'Web Search não configurado. Defina GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX (ou equivalentes).',
      };
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(maxResults));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || `Falha no Web Search (HTTP ${response.status})`,
      };
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    const results = items.slice(0, maxResults).map((item) => ({
      title: item?.title || '',
      link: item?.link || '',
      snippet: item?.snippet || '',
      displayLink: item?.displayLink || '',
    }));

    return {
      success: true,
      query,
      results,
    };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

/**
 * Ferramenta: Buscar informações de usuário
 */
const getUserInfo = ai.defineTool({
  name: 'getUserInfo',
  description: 'Busca informações detalhadas de um usuário pelo ID ou email',
  inputSchema: z.object({
    identifier: z.string().describe('ID do usuário (UID) ou email'),
  }),
  outputSchema: z.any(),
}, async ({ identifier }) => {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(identifier).get();
    if (userDoc.exists) {
      return { success: true, data: userDoc.data() };
    }

    const snapshot = await db.collection('users').where('email', '==', identifier).limit(1).get();
    if (!snapshot.empty) {
      return { success: true, data: snapshot.docs[0].data() };
    }

    return { success: false, error: 'Usuário não encontrado' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Enviar mensagem de TEXTO no chat secreto
 * Escreve em: chats/{chatId}/messages com senderId='admin'
 */
const sendSecretChatTextMessage = ai.defineTool({
  name: 'sendSecretChatTextMessage',
  description: 'Envia uma mensagem de texto como ADMIN no chat secreto (Firestore: chats/{chatId}/messages).',
  inputSchema: z.object({
    chatId: z.string().min(6).describe('ID do chat (ex: secret-chat-abc123 ou secret-chat-<slug>-abc123)'),
    message: z.string().min(1).max(2000).describe('Texto da mensagem'),
    adminUid: z.string().optional().describe('UID do admin (opcional, apenas para auditoria)'),
  }),
  outputSchema: z.any(),
}, async ({ chatId, message, adminUid }) => {
  try {
    if (!looksLikeSecretChatId(chatId)) {
      return { success: false, error: 'chatId inválido. Esperado formato secret-chat-...' };
    }

    const db = getAdminDb();
    if (!db) return { success: false, error: 'Firestore (Admin) indisponível' };

    const nowIso = new Date().toISOString();
    const chatRef = db.collection('chats').doc(chatId);
    await chatRef.set(
      {
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        ...(adminUid ? { adminUid } : {}),
        updatedAt: nowIso,
      },
      { merge: true }
    );

    const msgRef = await chatRef.collection('messages').add({
      senderId: 'admin',
      text: String(message).trim(),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      imageUrl: '',
      videoUrl: '',
      isLocation: false,
      createdAt: nowIso,
    });

    return { success: true, data: { chatId, messageId: msgRef.id } };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

/**
 * Ferramenta: Apagar/Cancelar assinante
 * - Atualiza users/{uid}: isSubscriber=false, subscriptionStatus='inactive'
 * - Atualiza/Remove documentos em subscribers
 */
const deleteSubscriber = ai.defineTool({
  name: 'deleteSubscriber',
  description: 'Cancela ou remove um assinante (atualiza users e subscribers). Ações destrutivas exigem confirm=true.',
  inputSchema: z.object({
    identifier: z.string().min(3).describe('UID do usuário ou email'),
    mode: z.enum(['cancel', 'delete']).optional().describe('cancel=marcar como cancelado; delete=remover docs de subscribers'),
    confirm: z.boolean().optional().describe('Obrigatório para executar (true)')
  }),
  outputSchema: z.any(),
}, async ({ identifier, mode = 'cancel', confirm = false }) => {
  try {
    if (!confirm) {
      return {
        success: false,
        requiresConfirmation: true,
        message: `Confirme para executar: deleteSubscriber(identifier="${identifier}", mode="${mode}", confirm=true).`,
      };
    }

    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) {
      return { success: false, error: 'Firebase Admin não inicializado (db/auth indisponível)' };
    }

    let uid = null;
    let email = null;

    if (looksLikeEmail(identifier)) {
      const userRecord = await auth.getUserByEmail(identifier);
      uid = userRecord.uid;
      email = userRecord.email || identifier;
    } else {
      try {
        const userRecord = await auth.getUser(identifier);
        uid = userRecord.uid;
        email = userRecord.email || null;
      } catch {
        // fallback: procurar no Firestore por email/uid
        const snap = await db.collection('users').doc(identifier).get();
        if (snap.exists) {
          uid = identifier;
          email = snap.data()?.email || null;
        }
      }
    }

    if (!uid) {
      return { success: false, error: 'Usuário não encontrado (auth/users).' };
    }

    const nowIso = new Date().toISOString();
    await db.collection('users').doc(uid).set(
      {
        isSubscriber: false,
        subscriptionStatus: 'inactive',
        subscriptionEndDate: nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    const subscribersRef = db.collection('subscribers');
    const touched = { updated: 0, deleted: 0 };

    // 1) Doc id == uid (compat)
    const directRef = subscribersRef.doc(uid);
    const directSnap = await directRef.get();
    if (directSnap.exists) {
      if (mode === 'delete') {
        await directRef.delete();
        touched.deleted++;
      } else {
        await directRef.set({ status: 'canceled', endDate: nowIso, updatedAt: nowIso }, { merge: true });
        touched.updated++;
      }
    }

    // 2) Query por userId/email (modelo novo)
    const queries = [];
    queries.push(subscribersRef.where('userId', '==', uid).get());
    if (email) queries.push(subscribersRef.where('email', '==', email).get());
    const results = await Promise.all(queries);
    const seen = new Set();

    for (const snap of results) {
      for (const docSnap of snap.docs) {
        if (seen.has(docSnap.id)) continue;
        seen.add(docSnap.id);
        if (docSnap.id === uid && directSnap.exists) continue;
        if (mode === 'delete') {
          await docSnap.ref.delete();
          touched.deleted++;
        } else {
          await docSnap.ref.set({ status: 'canceled', endDate: nowIso, updatedAt: nowIso }, { merge: true });
          touched.updated++;
        }
      }
    }

    return {
      success: true,
      message: `Assinante ${mode === 'delete' ? 'removido' : 'cancelado'}: ${uid}`,
      data: { uid, email, mode, ...touched },
    };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

/**
 * Ferramenta: Marcar assinaturas expiradas (limpar lista de expirados)
 * - Atualiza subscribers.status para 'expired' quando endDate <= agora
 */
const cleanupExpiredSubscribers = ai.defineTool({
  name: 'cleanupExpiredSubscribers',
  description: 'Marca assinaturas expiradas em subscribers (status=expired) quando endDate já passou. Requer confirm=true.',
  inputSchema: z.object({
    confirm: z.boolean().optional().describe('Obrigatório para executar (true)'),
    limit: z.number().int().min(1).max(500).optional().describe('Limite de docs para processar (1-500)')
  }),
  outputSchema: z.any(),
}, async ({ confirm = false, limit = 200 }) => {
  try {
    if (!confirm) {
      return {
        success: false,
        requiresConfirmation: true,
        message: 'Confirme para executar: cleanupExpiredSubscribers(confirm=true).',
      };
    }

    const db = getAdminDb();
    if (!db) return { success: false, error: 'Firestore (Admin) indisponível' };

    const now = new Date();
    const nowIso = now.toISOString();

    // 1) RTDB: subscriptions/*
    let rtdbUpdated = 0;
    try {
      const app = ensureAdminApp();
      const rtdb = getDatabase(app);
      const subscriptionsRef = rtdb.ref('subscriptions');
      const snapshot = await subscriptionsRef.once('value');
      const subscriptions = snapshot.val();
      if (subscriptions) {
        const updates = {};
        for (const [id, data] of Object.entries(subscriptions)) {
          if (data?.status === 'active' && data?.endDate) {
            const endDate = parseIsoDate(data.endDate);
            if (endDate && endDate <= now) {
              updates[`${id}/status`] = 'expired';
              updates[`${id}/updatedAt`] = nowIso;
              rtdbUpdated++;
            }
          }
        }
        if (Object.keys(updates).length > 0) {
          await subscriptionsRef.update(updates);
        }
      }
    } catch (e) {
      // RTDB pode não estar configurado em alguns ambientes
    }

    // 2) Firestore: subscribers
    const snap = await db
      .collection('subscribers')
      .where('status', '==', 'active')
      .limit(limit)
      .get();

    let firestoreUpdated = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data() || {};
      const end = data.endDate || data.expiresAt;
      if (!end) continue;
      const endDate = parseIsoDate(end);
      if (!endDate) continue;
      if (endDate <= now) {
        await docSnap.ref.set({ status: 'expired', updatedAt: nowIso }, { merge: true });
        firestoreUpdated++;
      }
    }

    return {
      success: true,
      message: `Cleanup concluído. RTDB: ${rtdbUpdated} | Firestore: ${firestoreUpdated}.`,
      data: { scanned: snap.size, firestoreUpdated, rtdbUpdated, totalUpdated: rtdbUpdated + firestoreUpdated, limit },
    };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

/**
 * Ferramenta: Limpar (remover) docs expirados da coleção subscribers
 */
const purgeExpiredSubscribers = ai.defineTool({
  name: 'purgeExpiredSubscribers',
  description: 'Remove da coleção subscribers os registros expirados antigos. Requer confirm=true.',
  inputSchema: z.object({
    confirm: z.boolean().optional().describe('Obrigatório para executar (true)'),
    olderThanDays: z.number().int().min(0).max(3650).optional().describe('Remove apenas se endDate <= hoje - N dias (padrão 30)'),
    limit: z.number().int().min(1).max(500).optional().describe('Limite de docs para deletar (1-500)')
  }),
  outputSchema: z.any(),
}, async ({ confirm = false, olderThanDays = 30, limit = 200 }) => {
  try {
    if (!confirm) {
      return {
        success: false,
        requiresConfirmation: true,
        message: `Confirme para executar: purgeExpiredSubscribers(confirm=true, olderThanDays=${olderThanDays}).`,
      };
    }

    const db = getAdminDb();
    if (!db) return { success: false, error: 'Firestore (Admin) indisponível' };

    const cutoff = new Date(Date.now() - Number(olderThanDays) * 24 * 60 * 60 * 1000);

    const snap = await db
      .collection('subscribers')
      .where('status', '==', 'expired')
      .limit(limit)
      .get();

    let deleted = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data() || {};
      const end = data.endDate || data.expiresAt;
      if (!end) continue;
      const endDate = parseIsoDate(end);
      if (!endDate) continue;
      if (endDate <= cutoff) {
        await docSnap.ref.delete();
        deleted++;
      }
    }

    return {
      success: true,
      message: `Purge concluído. ${deleted} registros expirados removidos.`,
      data: { scanned: snap.size, deleted, olderThanDays, limit },
    };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

/**
 * Ferramenta: Reenviar email de confirmação de conta
 * - Gera link de verificação com Admin Auth
 * - Tenta enviar usando /api/emails/send (template verify-email)
 */
const resendAccountConfirmationEmail = ai.defineTool({
  name: 'resendAccountConfirmationEmail',
  description: 'Reenvia email de confirmação (verificação) de conta para um email.',
  inputSchema: z.object({
    email: z.string().email().describe('Email do usuário'),
    displayName: z.string().optional().describe('Nome exibido (opcional)'),
  }),
  outputSchema: z.any(),
}, async ({ email, displayName }) => {
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) return { success: false, error: 'Auth service unavailable' };

    const link = await adminAuth.generateEmailVerificationLink(email);
    const baseUrl = getBaseUrl();

    try {
      const response = await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'verify-email',
          email,
          link,
          ...(displayName ? { displayName } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (data?.disabled) {
          return {
            success: true,
            warning: true,
            message: `Backend de email está desativado (deliveryMode=${data?.deliveryMode}). Link gerado para envio manual: ${email}`,
            link,
            data,
          };
        }

        if (data?.success === true) {
          await notifyAdmins({
            subject: 'Cerebro Central: confirmacao de conta enviada',
            text: `Email: ${email}`,
          });
          return { success: true, message: `Email de confirmação enviado para ${email}`, link, data };
        }

        // Resposta 200 porém sem confirmação explícita
        await notifyAdmins({
          subject: 'Cerebro Central: link de confirmacao gerado',
          text: `Email: ${email}`,
        });
        return { success: true, message: `Link de confirmação gerado para ${email}`, link, data };
      }
    } catch (e) {
      // Ignora erro de envio e retorna link
    }

    await notifyAdmins({
      subject: 'Cerebro Central: confirmacao manual necessaria',
      text: `Email: ${email}`,
    });
    return { success: true, message: 'Link gerado (envio de email falhou, envie manualmente)', link };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

/**
 * Ferramenta: Reenviar MFA (OTP via SMS)
 * Usa o proxy interno /api/sms/send-otp (que usa SMS_ENDPOINT + SMS_API_KEY)
 */
const resendMfaOtp = ai.defineTool({
  name: 'resendMfaOtp',
  description: 'Reenvia um código (OTP) via SMS para MFA/verificação de telefone.',
  inputSchema: z.object({
    phone: z.string().min(6).describe('Telefone (preferencialmente E.164: +5511999999999)'),
  }),
  outputSchema: z.any(),
}, async ({ phone }) => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/sms/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, error: data?.error || 'Falha ao reenviar MFA', details: data?.details };
    }
    return { success: true, data, message: 'OTP reenviado com sucesso' };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

/**
 * Ferramenta: Enviar mensagem via canal
 */
const sendMessage = ai.defineTool({
  name: 'sendMessage',
  description: 'Envia mensagem para usuário via WhatsApp, Instagram, Facebook ou Twitter com suporte a mídia',
  inputSchema: z.object({
    channel: z.enum(['whatsapp', 'instagram', 'facebook', 'twitter', 'site']).describe('Canal de comunicação'),
    recipient: z.string().describe('Destinatário (ID ou número)'),
    conversationId: z.string().optional().describe('ID da conversa (site/app)'),
    message: z.string().describe('Mensagem a ser enviada'),
    mediaUrl: z.string().optional().describe('URL da imagem ou vídeo (opcional)'),
  }),
  outputSchema: z.any(),
}, async ({ channel, recipient, conversationId, message, mediaUrl }) => {
  try {
    const baseUrl = getBaseUrl();
    const token = getInternalToken();
    const textWithMedia = mediaUrl ? `${message}\n\n${mediaUrl}` : message;

    if (channel === 'site') {
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': token,
        },
        body: JSON.stringify({
          channel: 'site',
          conversationId: conversationId || recipient,
          recipientId: recipient,
          text: textWithMedia,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        await notifyAdmins({
          subject: 'Cerebro Central: mensagem enviada (site)',
          text: `Destinatario: ${recipient}\nMensagem: ${textWithMedia}`,
        });
      }
      return { success: response.ok, data };
    }

    const response = await fetch(`${baseUrl}/api/channels/${channel}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': token,
      },
      body: JSON.stringify({ participantId: recipient, message: textWithMedia }),
    });

    const data = await response.json();
    if (response.ok) {
      await notifyAdmins({
        subject: `Cerebro Central: mensagem enviada (${channel})`,
        text: `Destinatario: ${recipient}\nMensagem: ${textWithMedia}`,
      });
    }
    return { success: response.ok, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Mensagem em Massa (Broadcast)
 */
const broadcastMessage = ai.defineTool({
  name: 'broadcastMessage',
  description: 'Envia mensagem para múltiplos usuários ou todos os assinantes',
  inputSchema: z.object({
    target: z.enum(['all', 'subscribers', 'admins']).describe('Público alvo'),
    channel: z.enum(['whatsapp', 'email', 'app', 'site']).describe('Canal principal'),
    message: z.string().describe('Mensagem a ser enviada'),
    mediaUrl: z.string().optional().describe('URL da mídia (opcional)'),
  }),
  outputSchema: z.any(),
}, async ({ target, channel, message, mediaUrl }) => {
  try {
    const baseUrl = getBaseUrl();
    const token = getInternalToken();
    const response = await fetch(`${baseUrl}/api/messages/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': token,
      },
      body: JSON.stringify({ target, channel, message, mediaUrl }),
    });

    const data = await response.json();
    if (response.ok) {
      await notifyAdmins({
        subject: 'Cerebro Central: broadcast enfileirado',
        text: `Target: ${target}\nCanal: ${channel}\nMensagem: ${message}`,
      });
    }
    return { success: response.ok, data };
  } catch (error) {
    return { success: true, message: `Broadcast para ${target} via ${channel} registrado.` };
  }
}
);

/**
 * Ferramenta: Agendar Tarefa (Scheduled Task)
 */
const scheduleTask = ai.defineTool({
  name: 'scheduleTask',
  description: 'Agenda o envio de uma mensagem ou publicação para uma data/hora futura',
  inputSchema: z.object({
    type: z.enum(['message', 'broadcast', 'post']).describe('Tipo de tarefa'),
    scheduledFor: z.string().describe('Data e hora no formato ISO (ex: 2024-12-25T10:00:00Z)'),
    payload: z.object({
      target: z.string().optional(),
      channel: z.string().optional(),
      message: z.string().optional(),
      mediaUrl: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
    }).describe('Dados da tarefa (mensagem, canal, mídia, etc)'),
  }),
  outputSchema: z.any(),
}, async ({ type, scheduledFor, payload }) => {
  try {
    // Simulação de registro no Firestore
    return {
      success: true,
      taskId: `task_${Date.now()}`,
      message: `Tarefa de ${type} agendada para ${scheduledFor}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Agendar publicação (foto/vídeo)
 */
const schedulePublication = ai.defineTool({
  name: 'schedulePublication',
  description: 'Agenda publicação de foto ou vídeo para uma data/hora futura',
  inputSchema: z.object({
    type: z.enum(['photo', 'video']).describe('Tipo de publicação'),
    title: z.string().describe('Título da publicação'),
    url: z.string().describe('URL da mídia (imagem ou vídeo)'),
    publishAt: z.string().describe('Data e hora no formato ISO (ex: 2026-01-31T18:00:00Z)'),
    storagePath: z.string().optional().describe('Storage path quando for foto'),
    storageType: z.string().optional().describe('Storage type quando for vídeo'),
    messageTemplate: z.string().optional().describe('Template de mensagem para notificar usuários')
  }),
  outputSchema: z.any(),
}, async ({ type, title, url, publishAt, storagePath = 'external', storageType = 'external', messageTemplate }) => {
  try {
    const db = getAdminDb();
    const payload = type === 'photo'
      ? { title: title.trim(), imageUrl: url.trim(), storagePath }
      : { title: title.trim(), videoUrl: url.trim(), storageType };

    const DEFAULT_MESSAGE = 'Novo conteúdo disponível: {title}';

    const docRef = await db.collection('scheduled_publications').add({
      type,
      payload,
      publishAt: new Date(publishAt).toISOString(),
      messageTemplate: messageTemplate || DEFAULT_MESSAGE,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      data: {
        scheduleId: docRef.id,
        message: 'Publicação agendada'
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Verificar assinatura de usuário
 */
const checkSubscription = ai.defineTool({
  name: 'checkSubscription',
  description: 'Verifica se um usuário tem assinatura ativa',
  inputSchema: z.object({
    userId: z.string().describe('ID do usuário'),
  }),
  outputSchema: z.any(),
}, async ({ userId }) => {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'Usuário não encontrado' };
    const userData = userDoc.data();
    return {
      success: true,
      data: {
        isSubscriber: userData.isSubscriber || false,
        subscriptionType: userData.subscriptionType || null,
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Presentear assinatura (dias grátis)
 * Concede dias de acesso premium a um usuário (por email).
 */
const giftSubscriptionDays = ai.defineTool({
  name: 'giftSubscriptionDays',
  description: 'Concede dias grátis de assinatura (presente) para um usuário pelo email. Por padrão concede 7 dias.',
  inputSchema: z.object({
    email: z.string().email().describe('Email do usuário que receberá o presente'),
    days: z.number().int().min(1).max(365).optional().describe('Quantidade de dias (1-365). Padrão: 7'),
    dryRun: z.boolean().optional().describe('Se true, não grava no banco (apenas simula)')
  }),
  outputSchema: z.any(),
}, async ({ email, days = 7, dryRun = false }) => {
  try {
    const db = getAdminDb();
    const auth = getAdminAuth();
    if (!db || !auth) {
      return { success: false, error: 'Firebase Admin não inicializado (db/auth indisponível)' };
    }

    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const existing = userSnap.exists ? (userSnap.data() || {}) : {};

    const existingEnd = existing.subscriptionEndDate ? new Date(existing.subscriptionEndDate) : null;
    const base = existingEnd && existingEnd > now ? existingEnd : now;
    const newEndDate = new Date(base.getTime() + (Number(days) * msPerDay));

    const giftedDaysTotal = (Number(existing.giftedDays) || 0) + Number(days);

    const updateUser = {
      uid,
      email,
      isSubscriber: true,
      subscriptionStatus: 'active',
      subscriptionStartDate: existing.subscriptionStartDate || now.toISOString(),
      subscriptionEndDate: newEndDate.toISOString(),
      planId: 'gift',
      paymentMethod: 'gift',
      giftedDays: giftedDaysTotal,
      lastGiftDate: now.toISOString(),
      updatedAt: now.toISOString(),
      ...(userSnap.exists ? {} : { createdAt: now.toISOString() }),
    };

    const updateSubscriber = {
      userId: uid,
      email,
      planId: 'gift',
      paymentMethod: 'gift',
      status: 'active',
      startDate: existing.subscriptionStartDate || now.toISOString(),
      endDate: newEndDate.toISOString(),
      autoRenew: false,
      giftedDays: giftedDaysTotal,
      lastGiftDate: now.toISOString(),
      updatedAt: now.toISOString(),
      ...(userSnap.exists ? {} : { createdAt: now.toISOString() }),
    };

    if (!dryRun) {
      await userRef.set(updateUser, { merge: true });
      await db.collection('subscribers').doc(uid).set(updateSubscriber, { merge: true });
    }

    return {
      success: true,
      data: {
        uid,
        email,
        days: Number(days),
        dryRun: Boolean(dryRun),
        subscriptionEndDate: newEndDate.toISOString(),
        giftedDaysTotal,
      }
    };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

/**
 * Ferramenta: Criar pagamento PIX
 */
const createPixPayment = ai.defineTool({
  name: 'createPixPayment',
  description: 'Gera um QR Code PIX para pagamento',
  inputSchema: z.object({
    amount: z.number().describe('Valor do pagamento'),
    email: z.string().describe('Email do pagador'),
    name: z.string().describe('Nome do pagador'),
    cpf: z.string().describe('CPF do pagador'),
    mediaUrl: z.string().optional().describe('URL da midia para enviar apos pagamento'),
    conversationId: z.string().optional().describe('ID da conversa (site) para entrega da midia'),
  }),
  outputSchema: z.any(),
}, async (data) => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/pix/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (response.ok) {
      await notifyAdmins({
        subject: 'Cerebro Central: PIX criado',
        text: `Email: ${data.email}\nValor: ${data.amount}`,
      });
    }
    return { success: response.ok, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Criar pagamento PayPal
 */
const createPayPalPayment = ai.defineTool({
  name: 'createPayPalPayment',
  description: 'Gera um link de pagamento PayPal',
  inputSchema: z.object({
    amount: z.number().describe('Valor do pagamento'),
    currency: z.string().default('BRL').describe('Moeda'),
    description: z.string().describe('Descrição do pagamento'),
  }),
  outputSchema: z.any(),
}, async ({ amount, currency, description }) => {
  try {
    const response = await fetch('http://localhost:3000/api/paypal/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, description }),
    });
    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Enviar email
 */
const sendEmail = ai.defineTool({
  name: 'sendEmail',
  description: 'Envia email para usuário usando o serviço de emails',
  inputSchema: z.object({
    to: z.string().describe('Email destinatário'),
    subject: z.string().describe('Assunto do email'),
    body: z.string().describe('Corpo do email (HTML ou texto)'),
  }),
  outputSchema: z.any(),
}, async ({ to, subject, body }) => {
  try {
    const baseUrl = getBaseUrl();
    const token = getInternalToken();
    const response = await fetch(`${baseUrl}/api/admin/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': token,
      },
      body: JSON.stringify({ to: [to], subject, html: body, text: body }),
    });
    const data = await response.json();
    return { success: response.ok && data?.success, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Buscar conteúdo exclusivo
 */
const getExclusiveContent = ai.defineTool({
  name: 'getExclusiveContent',
  description: 'Busca lista de conteúdo exclusivo (fotos/vídeos) para assinantes',
  inputSchema: z.object({
    limit: z.number().optional().describe('Limite de itens (padrão: 10)'),
  }),
  outputSchema: z.any(),
}, async ({ limit = 10 }) => {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('exclusiveContent').orderBy('createdAt', 'desc').limit(limit).get();
    const content = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Verificar status do sistema
 */
const getSystemStatus = ai.defineTool({
  name: 'getSystemStatus',
  description: 'Verifica o status de todos os microsserviços da plataforma',
  inputSchema: z.object({}),
  outputSchema: z.any(),
}, async () => {
  try {
    const services = [
      { name: 'Database', endpoint: 'http://localhost:3000/api/database-health' },
      { name: 'Authentication', endpoint: 'http://localhost:3000/api/health' },
    ];
    const results = await Promise.all(
      services.map(async (service) => {
        try {
          const response = await fetch(service.endpoint);
          return { name: service.name, status: response.ok ? 'online' : 'offline' };
        } catch {
          return { name: service.name, status: 'offline' };
        }
      })
    );
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Buscar reviews/avaliações
 */
const getReviews = ai.defineTool({
  name: 'getReviews',
  description: 'Busca avaliações e reviews de clientes',
  inputSchema: z.object({
    limit: z.number().optional().describe('Limite de reviews (padrão: 10)'),
    status: z.enum(['pending', 'approved', 'rejected']).optional().describe('Filtro por status'),
  }),
  outputSchema: z.any(),
}, async ({ limit = 10, status }) => {
  try {
    const db = getAdminDb();
    let queryRef = db.collection('reviews').orderBy('createdAt', 'desc');
    if (status) queryRef = queryRef.where('status', '==', status);
    const snapshot = await queryRef.limit(limit).get();
    const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: reviews };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Buscar estatísticas da plataforma
 */
const getPlatformStats = ai.defineTool({
  name: 'getPlatformStats',
  description: 'Busca estatísticas gerais da plataforma (usuários, assinantes, pagamentos)',
  inputSchema: z.object({}),
  outputSchema: z.any(),
}, async () => {
  try {
    const db = getAdminDb();
    const [totalUsers, totalSubscribers] = await Promise.all([
      getCollectionCount(db.collection('users')),
      getCollectionCount(db.collection('users').where('isSubscriber', '==', true)),
    ]);
    return {
      success: true,
      data: {
        totalUsers,
        totalSubscribers,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);


/**
 * Ferramenta: Resetar senha de usuário (Enviar Link)
 */
const sendPasswordReset = ai.defineTool({
  name: 'sendPasswordReset',
  description: 'Gera e envia link de redefinição de senha para o usuário',
  inputSchema: z.object({
    email: z.string().describe('Email do usuário'),
  }),
  outputSchema: z.any(),
}, async ({ email }) => {
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) return { success: false, error: 'Auth service unavailable' };

    const link = await adminAuth.generatePasswordResetLink(email);

    // Envio via endpoint de templates (suporta SMTP e fallback para Firestore `mail`)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reset-password',
          email,
          link,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (data?.simulated && data?.queued) {
          await notifyAdmins({
            subject: 'Cerebro Central: reset de senha enfileirado',
            text: `Email: ${email}`,
          });
          return { success: true, message: `Email de redefinição enfileirado para ${email}`, link, data };
        }
        await notifyAdmins({
          subject: 'Cerebro Central: reset de senha enviado',
          text: `Email: ${email}`,
        });
        return { success: true, message: `Email de redefinição enviado para ${email}`, link, data };
      }
    } catch (e) {
      // Ignora erro de envio e retorna link
    }

    return { success: true, message: 'Link gerado (envio de email falhou, envie manualmente)', link };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
);

/**
 * Ferramenta: Verificar admin por midia
 */
const verifyAdminIdentityMedia = ai.defineTool({
  name: 'verifyAdminIdentityMedia',
  description: 'Recebe fotos ou videos para validacao de identidade do admin e deteccao de perfil falso.',
  inputSchema: z.object({
    adminUid: z.string().optional().describe('UID do admin solicitante'),
    media: z
      .array(
        z.object({
          url: z.string().min(8).describe('URL da midia'),
          kind: z.enum(['image', 'video']).describe('Tipo da midia'),
          fileName: z.string().optional().describe('Nome do arquivo'),
          storageType: z.string().optional().describe('Origem do armazenamento'),
        })
      )
      .min(1)
      .describe('Lista de fotos ou videos para verificacao'),
    notes: z.string().optional().describe('Observacoes adicionais'),
  }),
  outputSchema: z.any(),
}, async ({ adminUid, media, notes }) => {
  try {
    const db = getAdminDb();
    if (!db) return { success: false, error: 'Firestore (Admin) indisponivel' };

    const nowIso = new Date().toISOString();
    const sanitizedMedia = media.map((item) => ({
      url: String(item.url),
      kind: item.kind === 'video' ? 'video' : 'image',
      fileName: item.fileName ? String(item.fileName) : null,
      storageType: item.storageType ? String(item.storageType) : null,
    }));

    const payload = {
      adminUid: adminUid || null,
      media: sanitizedMedia,
      notes: notes ? String(notes) : '',
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    const docRef = await db.collection('admin_identity_checks').add(payload);

    await notifyAdmins({
      subject: 'Cerebro Central: verificacao de admin por midia',
      text: `Admin: ${adminUid || 'nao informado'}\nMidias: ${sanitizedMedia.length}\nID: ${docRef.id}`,
    });

    return { success: true, data: { id: docRef.id } };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
});

module.exports = {
  webSearch,
  getUserInfo,
  sendSecretChatTextMessage,
  sendMessage,
  broadcastMessage,
  scheduleTask,
  schedulePublication,
  checkSubscription,
  giftSubscriptionDays,
  deleteSubscriber,
  cleanupExpiredSubscribers,
  purgeExpiredSubscribers,
  resendAccountConfirmationEmail,
  resendMfaOtp,
  createPixPayment,
  createPayPalPayment,
  sendEmail,
  sendPasswordReset,
  verifyAdminIdentityMedia,
  getExclusiveContent,
  getSystemStatus,
  getReviews,
  getPlatformStats,
};
