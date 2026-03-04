import nodemailer, { Transporter } from 'nodemailer';
import { adminAuth, adminDb } from '../firebase-admin';
import { renderTemplate, EmailTemplateType } from './templates';

// Email delivery strategy:
// - 'firebase-auth' (default): send OOB emails via Firebase Auth REST API.
// - 'smtp': enable nodemailer SMTP delivery (not recommended per current project decision).
const EMAIL_DELIVERY_MODE = (process.env.EMAIL_DELIVERY_MODE || 'firebase-auth').toLowerCase();
const SERVER_SIDE_EMAIL_ENABLED = EMAIL_DELIVERY_MODE === 'smtp';

function logEmail(event: string, data: Record<string, any>) {
  // Log em formato JSON único por linha para fácil parsing/centralização
  const payload: Record<string, any> = {
    ts: new Date().toISOString(),
    event: `email.${event}`, // Explicitly define event as string
    ...data,
  };
  // Evitar logar HTML completo quando não necessário
  if (data.html && String(data.html).length > 500) { // Check data.html instead of payload.html
    payload.htmlPreview = String(data.html).slice(0, 500) + '...';
    delete payload.html; // remover corpo completo do snapshot do log principal
  }
  console.log(JSON.stringify(payload));
}

async function persistLog(data: Record<string, any>) {
  try {
    if (!adminDb) return; // Admin não inicializado
    const doc = {
      ...data,
      createdAt: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    };
    await adminDb.collection('email_logs').add(doc);
  } catch (err) {
    console.error('[Email] Falha ao persistir log Firestore:', err);
  }
}

async function enqueueFirebaseMail(to: string, subject: string, html: string) {
  // Intencionalmente desabilitado: evita dependência da extensão firestore-send-email.
  // Mantemos a função para compatibilidade, mas sempre retorna false.
  void to;
  void subject;
  void html;
  return false;
}

interface SendOptionsBase {
  email: string;
  displayName?: string;
  appName?: string;
  link?: string;
  continueUrl?: string;
  idToken?: string;
}
interface SendReset extends SendOptionsBase { type: 'reset-password'; }
interface SendVerify extends SendOptionsBase { type: 'verify-email'; }
interface SendRecover extends SendOptionsBase { type: 'recover-email'; }
interface SendVerifyAndChange extends SendOptionsBase { type: 'verify-and-change-email'; newEmail: string; }
interface SendChanged extends SendOptionsBase { type: 'email-changed'; newEmail: string; }
interface SendMfa extends SendOptionsBase { type: 'mfa-enabled'; secondFactor: string; }

export type SendTemplateOptions =
  | SendReset
  | SendVerify
  | SendRecover
  | SendVerifyAndChange
  | SendChanged
  | SendMfa;

function getActionBaseUrl() {
  return process.env.EMAIL_ACTION_BASE_URL || 'https://italosantos.com/auth/action';
}

async function getFirebaseApiKey() {
  return (
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  );
}

async function exchangeCustomTokenForIdToken(customToken: string, apiKey: string) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Falha ao trocar custom token (HTTP ${response.status})`;
    throw new Error(message);
  }
  const idToken = data?.idToken;
  if (!idToken) throw new Error('idToken ausente na resposta do Firebase Auth');
  return idToken;
}

async function resolveIdTokenForEmail(email: string, apiKey: string) {
  if (!adminAuth) throw new Error('Firebase Admin Auth indisponivel');
  const user = await adminAuth.getUserByEmail(email);
  const customToken = await adminAuth.createCustomToken(user.uid);
  return await exchangeCustomTokenForIdToken(customToken, apiKey);
}

async function sendFirebaseAuthEmail(opts: SendTemplateOptions) {
  const apiKey = await getFirebaseApiKey();
  if (!apiKey) {
    return {
      success: false,
      deliveryMode: EMAIL_DELIVERY_MODE,
      message: 'FIREBASE_API_KEY ausente para envio via Firebase Auth',
    };
  }

  const baseUrl = getActionBaseUrl();
  const continueUrl = opts.continueUrl || opts.link || baseUrl;
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`;

  let requestType: string | null = null;
  const payload: Record<string, any> = {
    continueUrl,
  };

  if (opts.type === 'reset-password') {
    requestType = 'PASSWORD_RESET';
    payload.email = opts.email;
  } else if (opts.type === 'verify-email') {
    requestType = 'VERIFY_EMAIL';
    payload.idToken = opts.idToken || (await resolveIdTokenForEmail(opts.email, apiKey));
  } else if (opts.type === 'recover-email') {
    requestType = 'RECOVER_EMAIL';
    payload.email = opts.email;
  } else if (opts.type === 'verify-and-change-email') {
    requestType = 'VERIFY_AND_CHANGE_EMAIL';
    payload.idToken = opts.idToken || (await resolveIdTokenForEmail(opts.email, apiKey));
    payload.newEmail = opts.newEmail;
  } else if (opts.type === 'email-changed') {
    requestType = 'VERIFY_AND_CHANGE_EMAIL';
    payload.idToken = opts.idToken || (await resolveIdTokenForEmail(opts.email, apiKey));
    payload.newEmail = opts.newEmail;
  } else if (opts.type === 'mfa-enabled') {
    return {
      success: false,
      deliveryMode: EMAIL_DELIVERY_MODE,
      message: 'Tipo mfa-enabled nao suportado pelo Firebase Auth',
    };
  } else {
    return {
      success: false,
      deliveryMode: EMAIL_DELIVERY_MODE,
      message: 'Tipo de email nao suportado pelo Firebase Auth',
    };
  }

  payload.requestType = requestType;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data?.error?.message || `Falha no Firebase Auth (HTTP ${response.status})`;
    return {
      success: false,
      deliveryMode: EMAIL_DELIVERY_MODE,
      message: errorMessage,
      details: data?.error || data,
    };
  }

  return {
    success: true,
    deliveryMode: EMAIL_DELIVERY_MODE,
    requestType,
    data,
  };
}

async function generateActionLink(type: EmailTemplateType, email: string): Promise<string | undefined> {
  if (!adminAuth) return undefined;
  const base = getActionBaseUrl();
  try {
    switch (type) {
      case 'reset-password':
        return await adminAuth.generatePasswordResetLink(email, { url: base });
      case 'verify-email':
        return await adminAuth.generateEmailVerificationLink(email, { url: base });
      // Outros tipos não possuem helpers diretos no Admin SDK
      default:
        return undefined;
    }
  } catch (e) {
    console.error('[Email] Falha ao gerar link de ação:', e);
    return undefined;
  }
}

function buildTransport(): Transporter | null {
  const smtpUrl =
    process.env.SMTP_URL ||
    process.env.SMTP_CONNECTION_URL ||
    process.env.SMTP_CONNECTION_URI ||
    process.env.MAILER_URL;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user =
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.EMAIL_SMTP_USER ||
    process.env.EMAIL_SMTP_USERNAME;
  let pass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_SMTP_PASS ||
    process.env.EMAIL_SMTP_PASSWORD;

  // iCloud App Passwords são frequentemente exibidos com espaços (XXXX XXXX XXXX XXXX)
  // Remover espaços evita auth 535 quando o valor foi copiado "como aparece".
  const lowerHost = String(host || '').toLowerCase();
  const isICloud =
    lowerHost.includes('smtp.mail.me.com') ||
    lowerHost.includes('smtp.mail.icloud.com') ||
    lowerHost.includes('smtp.me.com');
  if (isICloud && pass) {
    // Remove separadores comuns (espaços/hífens) para evitar 535.
    // Apple costuma exibir como "XXXX XXXX XXXX XXXX".
    const normalized = pass.replace(/[^A-Za-z0-9]/g, '');
    if (normalized && normalized !== pass) pass = normalized;
  }
  const secure = process.env.SMTP_SECURE === 'true'; // false para STARTTLS
  const requireTLS = process.env.SMTP_REQUIRE_TLS === 'true';
  const ignoreTLS = process.env.SMTP_IGNORE_TLS === 'true'; // força conexão sem upgrade
  let minVersion = process.env.SMTP_MIN_TLS || 'TLSv1.2';
  const allowedMinVersions = ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
  if (!allowedMinVersions.includes(minVersion)) {
    console.warn('[Email] Valor inválido em SMTP_MIN_TLS:', minVersion, '-> usando TLSv1.2');
    minVersion = 'TLSv1.2';
  }
  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTH !== 'false';
  const debug = process.env.SMTP_DEBUG === 'true';

  // Suporte a URI completa (comum em providers / Cloud Run / Secrets)
  // Ex: smtps://user:pass@smtp.example.com:465
  if (smtpUrl) {
    try {
      return nodemailer.createTransport(smtpUrl, {
        logger: debug,
        debug,
        tls: {
          minVersion,
          rejectUnauthorized,
        },
      } as any);
    } catch (e) {
      console.error('[Email] Erro ao criar transport via SMTP_URL:', (e as Error).message);
      // Continua para fallback host/user/pass
    }
  }

  if (!host || !user || !pass) {
    console.warn(
      '[Email] SMTP não configurado. Defina SMTP_HOST + (SMTP_USER/SMTP_USERNAME) + (SMTP_PASS/SMTP_PASSWORD) ou SMTP_URL. (Host atual:',
      host || 'undefined',
      'User presente:',
      user ? 'sim' : 'não',
      'Pass presente:',
      pass ? 'sim' : 'não',
      'SMTP_URL presente:',
      smtpUrl ? 'sim' : 'não',
      ')'
    );
    return null;
  }

  const baseConfig: any = {
    host,
    port,
    secure,
    auth: { user, pass },
    authMethod: isICloud ? 'LOGIN' : undefined,
    requireTLS,
    ignoreTLS,
    logger: debug,
    debug,
    tls: {
      minVersion,
      rejectUnauthorized
    }
  };

  try {
    return nodemailer.createTransport(baseConfig);
  } catch (e) {
    console.error('[Email] Erro ao criar transport SMTP primário:', (e as Error).message);
    // Tentativa de fallback: desabilitar TLS constraints
    const fallbackConfig = { ...baseConfig, requireTLS: false, ignoreTLS: true };
    try {
      console.warn('[Email] Tentando fallback transport sem STARTTLS (ignoreTLS=true)');
      return nodemailer.createTransport(fallbackConfig);
    } catch (e2) {
      console.error('[Email] Fallback transport falhou:', (e2 as Error).message);
      return null;
    }
  }
}

function deriveSmtpHint(msg: string) {
  const lower = msg.toLowerCase();
  if (lower.includes('wrong version number')) {
    return 'Verifique porta (587 para STARTTLS) e secure=false; possivelmente servidor não suporta TLS direto ou firewall interceptando.';
  }
  if (lower.includes('invalid login') || lower.includes('535')) {
    const host = String(process.env.SMTP_HOST || '').toLowerCase();
    const isICloud = host.includes('smtp.mail.me.com') || host.includes('smtp.mail.icloud.com') || host.includes('smtp.me.com');
    if (isICloud) {
      return 'Credenciais inválidas (iCloud). Use SMTP_USER como email completo e SMTP_PASS como senha app-specific gerada em appleid.apple.com (Apple ID com 2FA).';
    }
    return 'Credenciais inválidas: confirme usuário e senha. Se houver 2FA, use senha app-specific.';
  }
  if (lower.includes('self signed certificate') || lower.includes('unable to verify')) {
    return 'Problema de certificado: tente SMTP_TLS_REJECT_UNAUTH=false apenas para teste.';
  }
  if (lower.includes('timeout')) {
    return 'Timeout: confirme conectividade rede/porta e ausência de bloqueio por firewall.';
  }
  if (lower.includes('handshake')) {
    return 'Falha handshake TLS: revise STARTTLS (secure=false) ou ajuste SMTP_IGNORE_TLS=true para diagnóstico.';
  }
  if (lower.includes('not a valid minimum tls')) {
    return 'Valor inválido em SMTP_MIN_TLS; use TLSv1.2 ou TLSv1.3.';
  }
  return 'Verifique variáveis SMTP, rede e logs detalhados (SMTP_DEBUG=true).';
}

export async function sendRawEmail(options: { to: string; subject: string; html: string; text?: string }) {
  if (EMAIL_DELIVERY_MODE !== 'smtp') {
    return {
      success: false,
      disabled: true,
      deliveryMode: EMAIL_DELIVERY_MODE,
      message: 'SMTP desativado. Configure EMAIL_DELIVERY_MODE=smtp.',
    };
  }

  const transport = buildTransport();
  if (!transport) {
    return {
      success: false,
      deliveryMode: EMAIL_DELIVERY_MODE,
      message: 'SMTP nao configurado. Verifique SMTP_HOST/SMTP_USER/SMTP_PASS.',
    };
  }

  const from = process.env.SMTP_FROM || `no-reply@${(process.env.FIREBASE_PROJECT_ID || 'example')}.firebaseapp.com`;

  try {
    const info = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logEmail('raw_sent', { to: options.to, subject: options.subject, messageId: info.messageId });
    persistLog({ to: options.to, subject: options.subject, messageId: info.messageId, type: 'raw' });
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    const errorMsg = String(err && err.message || 'Erro desconhecido');
    const hint = deriveSmtpHint(errorMsg);
    logEmail('raw_error', { to: options.to, subject: options.subject, error: errorMsg, hint });
    persistLog({ to: options.to, subject: options.subject, error: errorMsg, hint, type: 'raw' });
    return { success: false, message: errorMsg, hint };
  }
}

export async function sendTemplateEmail(opts: SendTemplateOptions) {
  if (!SERVER_SIDE_EMAIL_ENABLED) {
    if (EMAIL_DELIVERY_MODE === 'firebase-auth') {
      const result = await sendFirebaseAuthEmail(opts);
      logEmail('firebase_auth', { to: opts.email, type: opts.type, result });
      persistLog({ to: opts.email, type: opts.type, deliveryMode: EMAIL_DELIVERY_MODE, result });
      return result;
    }

    const appName = opts.appName || process.env.NEXT_PUBLIC_APP_NAME || 'App';

    // Opcional: gerar link de ação apenas para tipos suportados pelo Admin SDK.
    let link = opts.link;
    if (!link) {
      const generated = await generateActionLink(opts.type as EmailTemplateType, opts.email);
      if (generated) link = generated;
    }
    if (!link) {
      link = `${getActionBaseUrl()}?mode=${opts.type}&email=${encodeURIComponent(opts.email)}`;
    }

    const html = renderTemplate(opts.type as EmailTemplateType, { ...opts, appName, link });
    const meta = {
      to: opts.email,
      type: opts.type,
      disabled: true,
      deliveryMode: EMAIL_DELIVERY_MODE,
      link,
      simulated: true,
    };

    logEmail('disabled', meta);
    persistLog(meta);

    return {
      simulated: true,
      disabled: true,
      queued: false,
      link,
      html,
      message:
        'Envio de email via backend esta desativado. Configure EMAIL_DELIVERY_MODE para smtp ou firebase-auth.',
    };
  }

  const appName = opts.appName || process.env.NEXT_PUBLIC_APP_NAME || 'App';
  const smtpTemplates = new Set(['verify-email', 'reset-password', 'email-changed', 'mfa-enabled']);
  if (!smtpTemplates.has(opts.type)) {
    const meta = { to: opts.email, type: opts.type, deliveryMode: EMAIL_DELIVERY_MODE };
    logEmail('unsupported_template', meta);
    persistLog(meta);
    return {
      success: false,
      message: `Template nao suportado para envio SMTP: ${opts.type}`,
    };
  }
  let link = opts.link;
  if (!link) {
    const generated = await generateActionLink(opts.type as EmailTemplateType, opts.email);
    if (generated) link = generated;
  }
  if (!link) {
    // Fallback básico
    link = `${getActionBaseUrl()}?mode=${opts.type}&email=${encodeURIComponent(opts.email)}`;
    logEmail('fallback_link', { type: opts.type, email: opts.email, link });
  }

  const html = renderTemplate(opts.type as EmailTemplateType, { ...opts, appName, link });
  const transport = buildTransport();

  const from = process.env.SMTP_FROM || `no-reply@${(process.env.FIREBASE_PROJECT_ID || 'example')}.firebaseapp.com`;
  const subjectMap: Record<EmailTemplateType, string> = {
    'verify-email': 'Verifique seu e-mail',
    'reset-password': 'Redefinição de senha',
    'email-changed': 'E-mail da conta alterado',
    'mfa-enabled': 'Autenticação em duas etapas ativada'
  };
  const subject = subjectMap[opts.type];

  if (!transport) {
    const meta = { to: opts.email, subject, type: opts.type, link, simulated: true };
    logEmail('simulate_send', meta);
    persistLog(meta);
    const queued = await enqueueFirebaseMail(opts.email, subject, html);
    return { simulated: true, queued, html, link };
  }

  let info;
  try {
    info = await transport.sendMail({ from, to: opts.email, subject, html });
  } catch (err: any) {
    const errorMsg = String(err && err.message || 'Erro desconhecido');
    const hint = deriveSmtpHint(errorMsg);
    logEmail('send_error', { to: opts.email, subject, type: opts.type, link, error: errorMsg, hint });
    persistLog({ to: opts.email, subject, type: opts.type, link, error: errorMsg, hint, simulated: true });
    const queued = await enqueueFirebaseMail(opts.email, subject, html);
    return { simulated: true, error: errorMsg, queued, html, link };
  }
  const meta = { to: opts.email, subject, type: opts.type, messageId: info.messageId, link, simulated: false };
  logEmail('sent', meta);
  persistLog(meta);
  return { simulated: false, messageId: info.messageId, html, link };
}
