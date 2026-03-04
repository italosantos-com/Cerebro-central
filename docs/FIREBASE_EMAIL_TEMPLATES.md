# Templates de E-mail do Firebase Authentication

Este documento contém os templates de e-mail para configurar no Firebase Console.

Arquivos HTML prontos para colar no Firebase Console:
- [email-templates/verify-email.html](../email-templates/verify-email.html)
- [email-templates/reset-password.html](../email-templates/reset-password.html)
- [email-templates/email-changed.html](../email-templates/email-changed.html)
- [email-templates/mfa-enabled.html](../email-templates/mfa-enabled.html)

## Como Configurar

1. Acesse o Firebase Console: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Authentication** → **Templates**
4. Para cada tipo de e-mail abaixo, clique em **Editar** e cole o template correspondente

---

## 1. Verificação de Endereço de E-mail

Arquivo HTML: [email-templates/verify-email.html](../email-templates/verify-email.html)

**Assunto:** Verifique seu e-mail no %APP_NAME%

**Corpo do E-mail:**

```
Olá, %DISPLAY_NAME%

Obrigado por se cadastrar no %APP_NAME%!

Para completar seu cadastro, clique no link abaixo para verificar seu endereço de e-mail:

%LINK%

Se você não solicitou este cadastro, ignore este e-mail.

Obrigado,
Equipe do %APP_NAME%
```

**Link de Ação:**
```
https://italosantos.com/auth/action?mode=verifyEmail&oobCode=%OOBCODE%
```

---

## 2. Redefinição de Senha

Arquivo HTML: [email-templates/reset-password.html](../email-templates/reset-password.html)

**Assunto:** Redefinir senha - %APP_NAME%

**Corpo do E-mail:**

```
Olá,

Clique neste link para redefinir a senha de login no app %APP_NAME% com sua conta %EMAIL%.

%LINK%

Se você não solicitou a redefinição da sua senha, ignore este e-mail.

Obrigado,
Equipe do %APP_NAME%
```

**Link de Ação:**
```
https://italosantos.com/auth/action?mode=resetPassword&oobCode=%OOBCODE%
```

---

## 3. Alteração de Endereço de E-mail

Arquivo HTML: [email-templates/email-changed.html](../email-templates/email-changed.html)

**Assunto:** Seu e-mail foi alterado - %APP_NAME%

**Corpo do E-mail:**

```
Olá, %DISPLAY_NAME%

Seu e-mail para fazer login no app %APP_NAME% foi alterado para %NEW_EMAIL%.

Se você não solicitou a alteração do seu e-mail de login, clique neste link para redefini-lo:

%LINK%

Obrigado,
Equipe do %APP_NAME%
```

**Link de Ação:**
```
https://italosantos.com/auth/action?mode=recoverEmail&oobCode=%OOBCODE%
```

---

## 4. Notificação de Registro da Autenticação Multifator

Arquivo HTML: [email-templates/mfa-enabled.html](../email-templates/mfa-enabled.html)

**Assunto:** Autenticação em duas etapas ativada - %APP_NAME%

**Corpo do E-mail:**

```
Olá, %DISPLAY_NAME%

Sua conta no app %APP_NAME% foi atualizada com %SECOND_FACTOR% para a verificação em duas etapas.

Se você não adicionou essa verificação em duas etapas, clique no link abaixo para removê-la:

%LINK%

Obrigado,
Equipe do %APP_NAME%
```

**Link de Ação:**
```
https://italosantos.com/auth/action?mode=verifyAndChangeEmail&oobCode=%OOBCODE%
```

---

## Configuração da URL de Ação Personalizada

Para que todos os links apontem para `https://italosantos.com/auth/action`, você precisa:

1. No Firebase Console, vá em **Authentication** → **Settings** → **Authorized domains**
2. Adicione `italosantos.com` se ainda não estiver na lista
3. Em cada template de e-mail, use a **Action URL** customizada conforme indicado acima

### Variáveis Disponíveis

- `%DISPLAY_NAME%` - Nome de exibição do usuário
- `%EMAIL%` - E-mail do usuário
- `%NEW_EMAIL%` - Novo e-mail (apenas para alteração de e-mail)
- `%APP_NAME%` - Nome do aplicativo
- `%LINK%` - Link de ação completo
- `%OOBCODE%` - Código de ação único
- `%SECOND_FACTOR%` - Segundo fator de autenticação (SMS, app autenticador, etc.)

---

## Testando os Templates

Após configurar os templates, teste cada funcionalidade:

1. **Verificação de E-mail**: Cadastre um novo usuário
2. **Redefinição de Senha**: Use a opção "Esqueci minha senha"
3. **Alteração de E-mail**: Vá em Perfil e altere o e-mail
4. **MFA**: Ative a autenticação de dois fatores

Cada ação enviará um e-mail com o link para `https://italosantos.com/auth/action` que será processado pelos modais flutuantes da página criada.

---

## Página de Ação Criada

**Rota:** `/auth/action`

**Parâmetros da URL:**
- `mode`: Tipo de ação (`verifyEmail`, `resetPassword`, `recoverEmail`, `verifyAndChangeEmail`)
- `oobCode`: Código de ação único do Firebase

**Funcionalidades:**
- ✅ 4 Modais flutuantes responsivos
- ✅ Verificação automática do código
- ✅ Mensagens de erro para links inválidos/expirados
- ✅ Feedback visual de sucesso
- ✅ Redirecionamento automático após conclusão
- ✅ Design consistente com o tema do app

---

## Versão Dinâmica em TypeScript (Nova)

Agora os templates HTML também estão disponíveis como funções TypeScript reutilizáveis dentro do código:

**Arquivos Criados:**
- `src/lib/emails/templates.tsx` – Renderização dos 4 templates usando React + `renderToStaticMarkup`
- `src/lib/emails/sendEmail.ts` – Função `sendTemplateEmail` que gera links de ação (quando suportado) e envia ou simula envio
- `src/app/api/emails/send/route.ts` – Endpoint para acionar o envio de e-mails via POST

### Como Usar via API

`POST /api/emails/send`

Body (exemplos):
```json
{ "type": "verify-email", "email": "user@example.com", "displayName": "Italo" }
```
```json
{ "type": "reset-password", "email": "user@example.com" }
```
```json
{ "type": "email-changed", "email": "old@example.com", "newEmail": "new@example.com" }
```
```json
{ "type": "mfa-enabled", "email": "user@example.com", "secondFactor": "SMS" }
```

Retorno:
```json
{
	"success": true,
	"simulated": false,
	"messageId": "<id>",
	"link": "https://...",
	"html": "<markup>"
}
```

Se SMTP não estiver configurado, o envio é SIMULADO (log no console) para facilitar testes sem custo.

### Geração Automática de Links
Suportada para:
- `verify-email` (usa `adminAuth.generateEmailVerificationLink`)
- `reset-password` (usa `adminAuth.generatePasswordResetLink`)

Tipos sem helper direto ( `email-changed`, `mfa-enabled` ) exigem link passado pelo cliente ou usam fallback genérico.

### Variáveis de Ambiente para SMTP (opcional)
Configure para envio real:
```
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM="Nome <no-reply@dominio.com>"
EMAIL_ACTION_BASE_URL=https://italosantos.com/auth/action
```

Sem estas variáveis o sistema entra em modo de simulação.

### Uso Programático Interno
```ts
import { sendTemplateEmail } from '@/src/lib/emails/sendEmail';

await sendTemplateEmail({ type: 'verify-email', email: 'user@example.com', displayName: 'Italo' });
```

### Benefícios da Conversão
- Evolução de layout centralizada em código
- Possibilidade de testes automatizados de conteúdo
- Customização dinâmica (nome, fator MFA, novos campos)
- Unificação com rotas Next.js e Admin SDK

### Próximos Passos Sugeridos
1. Adicionar validação com Zod no endpoint `/api/emails/send`
2. Implementar fila (ex: Firestore ou Cloud Tasks) para envios em massa
3. Adicionar testes de snapshot dos templates
4. Guardar histórico de e-mails enviados (coleção `email_logs`)

---
