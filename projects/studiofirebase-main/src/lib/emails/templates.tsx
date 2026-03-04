export type EmailTemplateType = 'verify-email' | 'reset-password' | 'email-changed' | 'mfa-enabled';

interface BaseVars { appName: string; }
export interface VerifyEmailVars extends BaseVars { displayName?: string; email: string; link: string; }
export interface ResetPasswordVars extends BaseVars { email: string; link: string; }
export interface EmailChangedVars extends BaseVars { displayName?: string; email: string; newEmail: string; link: string; }
export interface MfaEnabledVars extends BaseVars { displayName?: string; email: string; secondFactor: string; link: string; }

function layout(title: string, accent: string, inner: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>
  body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#0a0a0a;color:#fff}
  .container{max-width:600px;margin:0 auto;background:linear-gradient(135deg,#1a1a1a,#0a0a0a);border:1px solid ${accent}33;border-radius:12px;overflow:hidden}
  .header{background:linear-gradient(135deg,${accent},${accent}cc);padding:40px 20px;text-align:center}
  .logo{font-size:48px;font-weight:bold;letter-spacing:4px;text-shadow:0 0 30px ${accent}}
  .content{padding:40px 30px}
  .footer{padding:30px;text-align:center;border-top:1px solid ${accent}33;color:#666;font-size:14px}
  a.button{display:inline-block;padding:16px 40px;background:linear-gradient(135deg,${accent},${accent}cc);color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;box-shadow:0 0 20px ${accent}99}
  .link-alt{margin-top:20px;font-size:14px;color:#888;word-break:break-all}
  .panel{background:rgba(255,255,255,0.05);padding:20px;border-radius:8px;margin:25px 0}
  ul{margin:0;padding-left:20px;color:#aaa;font-size:13px;line-height:1.6}
  </style></head><body><table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:20px 0"><tr><td align="center"><div class="container"><div class="header"><div class="logo">IS</div></div><div class="content">${inner}</div><div class="footer"><p>Este é um e-mail automático, por favor não responda.</p><p>&copy; 2025 Todos os direitos reservados.</p><p style="margin-top:20px"><a href="https://italosantos.com" style="color:${accent};text-decoration:none">italosantos.com</a></p></div></div></td></tr></table></body></html>`;
}

export function renderVerifyEmailEmail(vars: VerifyEmailVars) {
  const accent = '#ff0000';
  const inner = `<h2 style="margin-top:0">Olá, ${vars.displayName || 'usuário'}! 👋</h2>
  <p>Bem-vindo(a) ao <strong>${vars.appName}</strong>! Para completar seu cadastro, verifique seu e-mail <strong>${vars.email}</strong>.</p>
  <p><a href="${vars.link}" class="button">✓ Verificar Meu E-mail</a></p>
  <div class="link-alt">Caso o botão não funcione copie o link:<br/><a href="${vars.link}">${vars.link}</a></div>
  <div class="panel"><p style="margin:0;font-size:14px"><strong>⚠️ Importante:</strong> Este link expira em 24 horas.</p></div>
  <div class="panel"><p style="margin:0 0 10px 0;font-size:14px"><strong>💎 Após verificar você terá acesso:</strong></p><ul><li>Conteúdo exclusivo</li><li>Galeria completa</li><li>Área VIP</li><li>Downloads</li><li>Suporte prioritário</li></ul></div>`;
  return layout(`Verificar E-mail - ${vars.appName}`, accent, inner);
}

export function renderResetPasswordEmail(vars: ResetPasswordVars) {
  const accent = '#ff0000';
  const inner = `<h2 style="margin-top:0">Olá! 🔒</h2>
  <p>Recebemos uma solicitação para redefinir a senha da sua conta <strong>${vars.email}</strong> no <strong>${vars.appName}</strong>.</p>
  <p><a href="${vars.link}" class="button">🔐 Criar Nova Senha</a></p>
  <div class="link-alt">Se o botão não funcionar copie:<br/><a href="${vars.link}">${vars.link}</a></div>
  <div class="panel"><ul><li>Link expira em 1 hora</li><li>Ignore se não solicitou</li><li>Não compartilhe este link</li></ul></div>
  <div class="panel"><p style="margin:0 0 10px 0;font-size:14px"><strong>🛡️ Dicas de Segurança:</strong></p><ul><li>Use senha forte (8+ caracteres)</li><li>Misture maiúsculas/minúsculas</li><li>Inclua números e símbolos</li><li>Não reutilize senhas</li></ul></div>`;
  return layout(`Redefinir Senha - ${vars.appName}`, accent, inner);
}

export function renderEmailChangedEmail(vars: EmailChangedVars) {
  const accent = '#ff8800';
  const inner = `<h2 style="margin-top:0">Olá, ${vars.displayName || 'usuário'}! 📧</h2>
  <p>O e-mail da sua conta foi alterado.</p>
  <div class="panel"><p style="margin:0"><strong>E-mail anterior:</strong> ${vars.email}</p><p style="margin:10px 0 0 0"><strong>Novo e-mail:</strong> <span style="color:${accent}">${vars.newEmail}</span></p></div>
  <div class="panel"><p style="margin:0;font-size:14px"><strong>⚠️ Não reconhece esta alteração?</strong><br/>Clique abaixo para reverter:</p></div>
  <p><a href="${vars.link}" class="button">🔄 Reverter Alteração</a></p>
  <div class="link-alt"><a href="${vars.link}">${vars.link}</a></div>`;
  return layout(`E-mail Alterado - ${vars.appName}`, accent, inner);
}

export function renderMfaEnabledEmail(vars: MfaEnabledVars) {
  const accent = '#00cc00';
  const inner = `<h2 style="margin-top:0">Olá, ${vars.displayName || 'usuário'}! 🛡️</h2>
  <p>Autenticação em duas etapas ativada para <strong>${vars.email}</strong>.</p>
  <div class="panel"><p style="margin:0 0 10px 0">Método de verificação:</p><p style="margin:0;font-weight:bold;color:${accent}">${vars.secondFactor}</p></div>
  <div class="panel"><p style="margin:0 0 10px 0">Como funciona agora:</p><ul><li>Insira sua senha</li><li>Receba código via ${vars.secondFactor}</li><li>Digite o código</li></ul></div>
  <div class="panel"><p style="margin:0;font-size:14px"><strong>⚠️ Não reconhece?</strong> Desative imediatamente:</p></div>
  <p><a href="${vars.link}" class="button">🚨 Desativar 2FA</a></p>
  <div class="link-alt"><a href="${vars.link}">${vars.link}</a></div>`;
  return layout(`2FA Ativada - ${vars.appName}`, accent, inner);
}

export function renderTemplate(type: EmailTemplateType, vars: any) {
  switch (type) {
    case 'verify-email': return renderVerifyEmailEmail(vars as VerifyEmailVars);
    case 'reset-password': return renderResetPasswordEmail(vars as ResetPasswordVars);
    case 'email-changed': return renderEmailChangedEmail(vars as EmailChangedVars);
    case 'mfa-enabled': return renderMfaEnabledEmail(vars as MfaEnabledVars);
    default: throw new Error(`Template desconhecido: ${type}`);
  }
}
