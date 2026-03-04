import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isICloudHost(host?: string | null) {
    const h = String(host || '').toLowerCase();
    return h.includes('smtp.mail.me.com') || h.includes('smtp.mail.icloud.com') || h.includes('smtp.me.com');
}

function buildSmtpConfig() {
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
    const secure = process.env.SMTP_SECURE === 'true';
    const requireTLS = process.env.SMTP_REQUIRE_TLS === 'true';
    const ignoreTLS = process.env.SMTP_IGNORE_TLS === 'true';
    let minVersion = process.env.SMTP_MIN_TLS || 'TLSv1.2';
    const allowed = ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
    if (!allowed.includes(minVersion)) minVersion = 'TLSv1.2';
    const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTH !== 'false';

    // iCloud App Password pode vir com espaços/hífens (exibição padrão da Apple).
    // Remover separadores reduz 535 quando o valor foi copiado como aparece.
    if (isICloudHost(host) && pass) {
        const normalized = pass.replace(/[^A-Za-z0-9]/g, '');
        if (normalized && normalized !== pass) pass = normalized;
    }

    // Se SMTP_URL está definido, use-o diretamente.
    if (smtpUrl) {
        return {
            url: smtpUrl,
            tls: { minVersion, rejectUnauthorized },
        };
    }

    return {
        host,
        port,
        secure,
        requireTLS,
        ignoreTLS,
        auth: user && pass ? { user, pass } : undefined,
        authMethod: isICloudHost(host) ? 'LOGIN' : undefined,
        tls: { minVersion, rejectUnauthorized },
    };
}

function smtpHintFromError(message: string) {
    const lower = (message || '').toLowerCase();
    if (lower.includes('wrong version number')) return 'Porta/STARTTLS incorretos (normalmente 587 com secure=false).';
    if (lower.includes('invalid login') || lower.includes('535')) return 'Credenciais inválidas (senha app-specific / 2FA).';
    if (lower.includes('timeout')) return 'Timeout: verifique rede/firewall e porta liberada.';
    if (lower.includes('handshake')) return 'Handshake TLS falhou: revise STARTTLS/secure/SMTP_MIN_TLS.';
    return 'Verifique SMTP_HOST/PORT/USER/PASS e logs do provedor.';
}

export async function GET() {
    const deliveryMode = (process.env.EMAIL_DELIVERY_MODE || 'firebase-auth').toLowerCase();
    if (deliveryMode !== 'smtp') {
        return NextResponse.json(
            {
                success: false,
                disabled: true,
                deliveryMode,
                message:
                    'Envio SMTP está desativado. Use o sistema nativo do Firebase Auth no client (sendEmailVerification / sendPasswordResetEmail / verifyBeforeUpdateEmail).',
            },
            { status: 200 }
        );
    }

    return NextResponse.json(
        {
            success: false,
            deliveryMode,
            message: 'Endpoint pronto. Use POST com { email, subject, code?, html? } para testar SMTP.',
        },
        { status: 200 }
    );
}

export async function POST(request: Request) {
    try {
        const deliveryMode = (process.env.EMAIL_DELIVERY_MODE || 'firebase-auth').toLowerCase();
        if (deliveryMode !== 'smtp') {
            return NextResponse.json(
                {
                    success: false,
                    disabled: true,
                    deliveryMode,
                    message:
                        'Envio SMTP está desativado. Use o sistema nativo do Firebase Auth no client (sendEmailVerification / sendPasswordResetEmail / verifyBeforeUpdateEmail).',
                },
                { status: 200 }
            );
        }

        const body = await request.json();
        const { email, subject, code, html } = body || {};

        if (!email || !subject) {
            return NextResponse.json(
                { success: false, message: 'Parâmetros inválidos: email e subject são obrigatórios.' },
                { status: 400 }
            );
        }

        const smtpCfg = buildSmtpConfig() as any;
        const smtpMissing: string[] = [];
        const hasSmtpUrl = Boolean(smtpCfg?.url);
        if (!hasSmtpUrl) {
            if (!smtpCfg.host) smtpMissing.push('SMTP_HOST');
            if (!smtpCfg.auth?.user) smtpMissing.push('SMTP_USER');
            if (!smtpCfg.auth?.pass) smtpMissing.push('SMTP_PASS');
        }

        let smtpFailure: { errorMessage: string; hint: string } | null = null;

        const htmlContent = html ?? `
      <h2>Teste de Envio – Firebase Extension</h2>
      <p>Assunto: <strong>${subject}</strong></p>
      ${code ? `<p>Código: <strong>${code}</strong></p>` : ''}
            <p>Este endpoint é <strong>SMTP-only</strong> (diagnóstico direto do backend). Se falhar, ele retorna o erro e a dica (hint) no JSON.</p>
    `;

        // SMTP-only: para diagnóstico direto do backend.
        // Se SMTP não estiver configurado, retorne erro imediatamente.
        if (!hasSmtpUrl && smtpMissing.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'SMTP não configurado no runtime. Configure as variáveis/Secrets e faça redeploy.',
                    transport: 'smtp',
                    smtpMissing,
                },
                { status: 500 }
            );
        }

        // 1) Enviar via SMTP (mais confiável para diagnóstico)
        const from = process.env.SMTP_FROM || smtpCfg.auth?.user || 'no-reply@example.com';
        try {
            const transport = hasSmtpUrl
                ? nodemailer.createTransport(smtpCfg.url, { tls: smtpCfg.tls } as any)
                : nodemailer.createTransport(smtpCfg as any);
            await transport.verify();
            const info = await transport.sendMail({
                from,
                to: email,
                subject,
                html: htmlContent,
            });
            return NextResponse.json({
                success: true,
                message: 'Email enviado via SMTP com sucesso.',
                transport: 'smtp',
                messageId: info.messageId,
            });
        } catch (err: any) {
            const errorMessage = String(err?.message || err || 'Erro desconhecido');
            const hint = smtpHintFromError(errorMessage);
            smtpFailure = { errorMessage, hint };
            console.error('[API/test/send-email] Falha SMTP:', { errorMessage, hint });
            return NextResponse.json(
                {
                    success: false,
                    message: 'Falha ao enviar via SMTP. Verifique secrets/credenciais e TLS.',
                    transport: 'smtp',
                    smtpMissing,
                    smtpFailure,
                },
                { status: 502 }
            );
        }

        // 2) Fallback removido: este endpoint é intencionalmente SMTP-only.
        // unreachable
    } catch (error: any) {
        console.error('[API/test/send-email] Erro ao enviar email:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Erro interno no envio.' },
            { status: 500 }
        );
    }
}
