import { applyPlaceholders } from './utils';

export interface VerifyEmailParams {
  appName: string;
  displayName: string;
  email: string;
  link: string;
}

const RAW_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-mail Template - %APP_NAME%</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #0a0a0a;
            color: #ffffff;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
            border: 1px solid rgba(255, 0, 0, 0.3);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: bold;
            text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 20px;
            margin-bottom: 20px;
            color: #ffffff;
        }
        .message {
            font-size: 16px;
            line-height: 1.6;
            color: #cccccc;
            margin-bottom: 30px;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        .action-button {
            display: inline-block;
            padding: 16px 40px;
            background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
            transition: all 0.3s ease;
        }
        .action-button:hover {
            box-shadow: 0 0 30px rgba(255, 0, 0, 0.8);
            transform: translateY(-2px);
        }
        .alternative-link {
            margin-top: 20px;
            font-size: 14px;
            color: #888888;
        }
        .alternative-link a {
            color: #ff0000;
            text-decoration: none;
        }
        .footer {
            padding: 30px;
            text-align: center;
            border-top: 1px solid rgba(255, 0, 0, 0.2);
            color: #666666;
            font-size: 14px;
        }
        .warning {
            background: rgba(255, 0, 0, 0.1);
            border-left: 4px solid #ff0000;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .logo {
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 4px;
            text-shadow: 0 0 30px rgba(255, 0, 0, 1);
        }
    </style>
</head>
<body>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 20px 0;">
        <tr>
            <td align="center">
                <div class="email-container">
                    <!-- Header -->
                    <div class="header">
                        <div class="logo">IS</div>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">%APP_NAME%</p>
                    </div>

                    <!-- Content -->
                    <div class="content">
                        <!-- TEMPLATE PARA VERIFICAÇÃO DE E-MAIL -->
                        <div class="greeting">Olá, %DISPLAY_NAME%! 👋</div>
                        <div class="message">
                            <p>Bem-vindo(a) ao <strong>%APP_NAME%</strong>! 🎉</p>
                            <p>Obrigado por se cadastrar. Estamos muito felizes em ter você conosco!</p>
                            <p>Para completar seu cadastro e ter acesso total ao conteúdo exclusivo, fotos, vídeos e todos os recursos premium, você precisa verificar seu endereço de e-mail (<strong>%EMAIL%</strong>).</p>
                            <p><strong>É rápido e fácil!</strong> Basta clicar no botão abaixo:</p>
                        </div>

                        <div class="button-container">
                            <a href="%LINK%" class="action-button">✓ Verificar Meu E-mail</a>
                        </div>

                        <div class="alternative-link">
                            <p>Caso o botão não funcione, copie e cole este link no seu navegador:</p>
                            <a href="%LINK%" style="word-break: break-all;">%LINK%</a>
                        </div>

                        <div class="warning">
                            <p style="margin: 0; font-size: 13px;">
                                <strong>⚠️ Importante:</strong> Este link expira em 24 horas por motivos de segurança.
                                <br>Se você não solicitou este cadastro, ignore este e-mail com segurança.
                            </p>
                        </div>

                        <div style="margin-top: 30px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #cccccc;"><strong>💎 O que você terá acesso após verificar:</strong></p>
                            <ul style="margin: 0; padding-left: 20px; color: #aaaaaa; font-size: 14px;">
                                <li>Conteúdo exclusivo premium</li>
                                <li>Galeria completa de fotos e vídeos</li>
                                <li>Área de assinante VIP</li>
                                <li>Downloads ilimitados</li>
                                <li>Suporte prioritário</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                        <p>Este é um e-mail automático, por favor não responda.</p>
                        <p>&copy; 2025 %APP_NAME%. Todos os direitos reservados.</p>
                        <p style="margin-top: 20px;">
                            <a href="https://italosantos.com" style="color: #ff0000; text-decoration: none;">italosantos.com</a>
                        </p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const PLACEHOLDERS = ['%APP_NAME%', '%DISPLAY_NAME%', '%EMAIL%', '%LINK%'] as const;

type VerifyEmailPlaceholder = typeof PLACEHOLDERS[number];

export const verifyEmailTemplate = {
  id: 'verify-email',
  description: 'Template de verificação de e-mail',
  placeholders: PLACEHOLDERS,
  raw: RAW_TEMPLATE,
  render(params: VerifyEmailParams): string {
    const replacements: Record<VerifyEmailPlaceholder, string> = {
      '%APP_NAME%': params.appName,
      '%DISPLAY_NAME%': params.displayName,
      '%EMAIL%': params.email,
      '%LINK%': params.link
    };

    return applyPlaceholders(RAW_TEMPLATE, replacements);
  }
};
