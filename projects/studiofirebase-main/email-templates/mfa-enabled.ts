import { applyPlaceholders } from './utils';

export interface MfaEnabledParams {
  appName: string;
  displayName: string;
  email: string;
  secondFactor: string;
  link: string;
}

const RAW_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Autenticação em Duas Etapas - %APP_NAME%</title>
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
            border: 1px solid rgba(0, 255, 0, 0.3);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #00cc00 0%, #008800 100%);
            padding: 40px 20px;
            text-align: center;
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
        }
        .alternative-link {
            margin-top: 20px;
            font-size: 14px;
            color: #888888;
        }
        .alternative-link a {
            color: #00cc00;
            text-decoration: none;
            word-break: break-all;
        }
        .footer {
            padding: 30px;
            text-align: center;
            border-top: 1px solid rgba(0, 255, 0, 0.2);
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
        .success-box {
            background: rgba(0, 255, 0, 0.1);
            border-left: 4px solid #00cc00;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .logo {
            font-size: 48px;
            font-weight: bold;
            letter-spacing: 4px;
            text-shadow: 0 0 30px rgba(0, 255, 0, 1);
        }
        .mfa-info {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
        }
        .shield-icon {
            font-size: 64px;
            margin-bottom: 10px;
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
                        <div class="greeting">Olá, %DISPLAY_NAME%! 🛡️</div>
                        
                        <div class="success-box">
                            <div class="shield-icon">🛡️</div>
                            <p style="margin: 0; font-size: 22px; font-weight: bold; color: #00cc00;">Segurança Reforçada!</p>
                            <p style="margin: 10px 0 0 0; font-size: 14px; color: #aaaaaa;">Autenticação em Duas Etapas (2FA) Ativada</p>
                        </div>

                        <div class="message">
                            <p>Parabéns! Sua conta no <strong>%APP_NAME%</strong> está agora <strong>muito mais segura</strong>! 🎉</p>
                            <p>A <strong>Autenticação em Duas Etapas (2FA)</strong> foi ativada com sucesso para o e-mail:</p>
                        </div>

                        <div class="mfa-info">
                            <p style="margin: 0 0 15px 0; font-size: 14px; color: #888888;">📧 E-mail protegido:</p>
                            <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold;">%EMAIL%</p>
                            <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 20px 0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #888888;">🔑 Método de verificação:</p>
                            <p style="margin: 0; color: #00cc00; font-size: 20px; font-weight: bold;">%SECOND_FACTOR%</p>
                        </div>

                        <div style="background: rgba(0, 255, 0, 0.05); padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid rgba(0, 255, 0, 0.2);">
                            <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #00cc00;">✅ Como funciona a partir de agora:</p>
                            <ol style="text-align: left; margin: 0; padding-left: 20px; color: #cccccc; font-size: 14px; line-height: 1.8;">
                                <li style="margin-bottom: 10px;"><strong>Insira sua senha</strong> normalmente</li>
                                <li style="margin-bottom: 10px;"><strong>Receba um código de verificação</strong> via %SECOND_FACTOR%</li>
                                <li><strong>Digite o código</strong> para completar o login</li>
                            </ol>
                        </div>

                        <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; margem: 25px 0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #cccccc;"><strong>💡 Por que isso é importante?</strong></p>
                            <ul style="margin: 0; padding-left: 20px; color: #aaaaaa; font-size: 13px; line-height: 1.8;">
                                <li>Protege contra acesso não autorizado</li>
                                <li>Mesmo se alguém descobrir sua senha, não conseguirá acessar</li>
                                <li>Você será notificado de todas as tentativas de login</li>
                                <li>Mantém seus dados pessoais e conteúdo seguro</li>
                            </ul>
                        </div>

                        <div class="warning">
                            <p style="margin: 0 0 15px 0; font-size: 15px;"><strong>⚠️ VOCÊ NÃO ATIVOU ESTA VERIFICAÇÃO?</strong></p>
                            <p style="margin: 0; font-size: 14px;">
                                Se você <strong>não reconhece</strong> esta atividade, sua conta pode estar comprometida! 
                                <br><br>
                                <strong>Aja imediatamente:</strong> Clique no botão abaixo para desativar a 2FA não autorizada e depois altere sua senha.
                            </p>
                        </div>

                        <div class="button-container">
                            <a href="%LINK%" class="action-button">🚨 Desativar 2FA Não Autorizada</a>
                        </div>

                        <div class="alternative-link">
                            <p>Ou copie e cole este link no seu navegador:</p>
                            <a href="%LINK%">%LINK%</a>
                        </div>

                        <div class="message" style="margin-top: 30px;">
                            <p style="color: #00cc00;">✓ Se você ativou esta verificação, não é necessário fazer nada. Sua conta está protegida!</p>
                        </div>

                        <div class="success-box" style="margin-top: 30px;">
                            <p style="margin: 0; font-size: 14px;">
                                <strong>Dica de Segurança:</strong> Mantenha seu dispositivo de autenticação seguro e nunca compartilhe seus códigos de verificação com ninguém.
                            </p>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                        <p>Este é um e-mail automático, por favor não responda.</p>
                        <p>&copy; 2025 %APP_NAME%. Todos os direitos reservados.</p>
                        <p style="margin-top: 20px;">
                            <a href="https://italosantos.com" style="color: #00cc00; text-decoration: none;">italosantos.com</a>
                        </p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const PLACEHOLDERS = ['%APP_NAME%', '%DISPLAY_NAME%', '%EMAIL%', '%SECOND_FACTOR%', '%LINK%'] as const;

type MfaPlaceholder = typeof PLACEHOLDERS[number];

export const mfaEnabledTemplate = {
  id: 'mfa-enabled',
  description: 'Template para confirmação de MFA',
  placeholders: PLACEHOLDERS,
  raw: RAW_TEMPLATE,
  render(params: MfaEnabledParams): string {
    const replacements: Record<MfaPlaceholder, string> = {
      '%APP_NAME%': params.appName,
      '%DISPLAY_NAME%': params.displayName,
      '%EMAIL%': params.email,
      '%SECOND_FACTOR%': params.secondFactor,
      '%LINK%': params.link
    };

    return applyPlaceholders(RAW_TEMPLATE, replacements);
  }
};
