# Email Extension Setup and Troubleshooting Guide

## ✅ Status Atual (confirmado via CLI)

Para o projeto **`projeto-italo-bc5ef`**, o estado atual (confirmado em **2026-02-01**) é:

- **Firestore `(default)` location**: `us-central1` (Iowa)
- **Extension instance**: `firestore-send-email`
- **Extension state**: `ACTIVE`

Com isso, **não há “region mismatch”** para a extensão neste projeto.

### Comandos para verificar no seu ambiente

```bash
firebase firestore:databases:list --project projeto-italo-bc5ef
firebase ext:list --project projeto-italo-bc5ef
```

## ⚠️ Sobre “Cloud Functions location / Firestore location”

Alguns parâmetros de **localização** (por exemplo, a região do Firestore/Functions escolhida na instalação) podem **não ser editáveis após a instalação**, dependendo do fluxo/console.

Se você realmente precisar mudar a região e o Console não permitir, o caminho mais confiável é:

1. **Uninstall** a instância da extensão
2. **Install** novamente escolhendo a região correta

> Dica: antes de reinstalar, confirme o `locationId` do Firestore com `firebase firestore:databases:list`.

## 📧 Testing Email Extension

### Quick Test

Você pode validar rapidamente pelo próprio repo:

```bash
node scripts/validate-email-extension.cjs
```

O script cria um doc em `mail` e aguarda a extensão marcar `delivery.state` como **SUCCESS** ou **ERROR**.

Se quiser testar com outro destinatário:

```bash
EMAIL_EXTENSION_TEST_TO=seu-email@exemplo.com node scripts/validate-email-extension.cjs
```

Se você suspeitar de incompatibilidade do formato do campo `to`, dá para forçar array:

```bash
EMAIL_EXTENSION_TO_AS_ARRAY=true node scripts/validate-email-extension.cjs
```

```bash
# Simple automated test
node test-email-extension-simple.js

# Comprehensive test suite
./test-email-extension.sh
```

### Manual Firestore Test

1. **Go to Firestore Console**:
   ```
   https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/data/~2Fmail
   ```

2. **Add Document to `mail` Collection**:
   ```json
   {
     "to": "your-email@example.com",
     "message": {
       "subject": "Test Email",
       "text": "This is a test email from the fixed extension",
       "html": "<p>This is a <strong>test email</strong> from the fixed extension</p>"
     }
   }
   ```

## 🧯 Troubleshooting: extensão dispara, mas o envio falha

Se o documento em `mail` recebe `delivery.state = ERROR` com algo como:

- `TypeError: Cannot read properties of undefined (reading 'sendMail')`
- `Error: Missing credentials for "PLAIN"`

Isso geralmente indica que **a configuração SMTP/OAuth2 não está completa** (por exemplo, faltando `SMTP connection URI` e/ou credenciais como `SMTP user`/`SMTP password` nos parâmetros/secrets da extensão).

> Importante: configurar `SMTP_*` em `.env.local` **não configura** a instância hospedada da extensão. A configuração do provedor (iCloud/Gmail/SendGrid) precisa ser feita em **Firebase Console → Extensions → firestore-send-email → Configure**.

### Como corrigir

1. Abra o Console do Firebase → Extensions → `firestore-send-email` → Manage/Configure
2. Garanta que:
   - `Email documents collection` = `mail`
   - `Default FROM address` válido
   - **Se `Authentication Type = Username & Password`**: informe `SMTP connection URI` + `SMTP password`
   - **Se `Authentication Type = OAuth2`**: informe host/port/secure + clientId/clientSecret/refreshToken + SMTP user

> Dica: você também pode exportar os parâmetros (sem secrets) com `firebase ext:export --project projeto-italo-bc5ef`.

3. **Monitor Document Changes**:
   - Document should update with `delivered: true` or `error` field
   - Check email inbox for delivered message

## 🛠 SMTP Configuration Options

### SendGrid (Recommended)

```
SMTP_CONNECTION_URI: smtps://apikey:YOUR_API_KEY@smtp.sendgrid.net:465
```

**Features**:
- Categories for email organization
- Custom arguments for tracking
- Dynamic templates
- Comprehensive analytics

### Gmail with App Password

```
SMTP_CONNECTION_URI: smtps://your-email@gmail.com:APP_PASSWORD@smtp.gmail.com:465
```

**Setup**:
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password in SMTP URI

### Gmail with OAuth2

```
SMTP_CONNECTION_URI: smtps://smtp.gmail.com:465
```

**Additional OAuth2 Settings**:
- OAuth2 Client ID
- OAuth2 Client Secret  
- OAuth2 Refresh Token
- OAuth2 SMTP User

### iCloud Mail (smtp.mail.me.com) — porta 587 (STARTTLS)

Para iCloud Mail, o padrão é **porta 587 com STARTTLS**.

No Console do Firebase → Extensions → `firestore-send-email` → Configure, use:

- **Authentication Type**: Username & Password
- **SMTP connection URI**: `smtp://smtp.mail.me.com:587`
- **SMTP password**: sua **App-Specific Password** do iCloud (não use a senha normal)
- Se existir opção/flag de `secure`: **false** (porque é STARTTLS em 587)

Se você receber `Error: Missing credentials for "PLAIN"`, normalmente falta **usuário e/ou senha** no transport.

- Se o Console também pedir **SMTP user**, preencha com seu email iCloud (ex: `is@italosantos.com`).
- Se o Console **não** pedir SMTP user e só existir `SMTP connection URI`, inclua o usuário no URI.
  Como o usuário tem `@`, encode como `%40`:
  - Exemplo: `smtp://is%40italosantos.com@smtp.mail.me.com:587`

Gerar App-Specific Password (requisito do iCloud): https://appleid.apple.com/account/manage

Se você preferir usar 465 (SSL direto), a alternativa é `smtps://smtp.mail.me.com:465` com `secure=true`.

## 🧪 Advanced Testing Features

### SendGrid Categories Test

```json
{
  "to": "test@example.com",
  "categories": ["newsletter", "marketing", "test"],
  "message": {
    "subject": "SendGrid Categories Test",
    "text": "Testing SendGrid category functionality"
  },
  "customArgs": {
    "campaign": "email-test",
    "user_id": "12345"
  }
}
```

### Multi-Recipient Test

```json
{
  "to": ["recipient1@example.com", "recipient2@example.com"],
  "bcc": ["bcc@example.com"],
  "message": {
    "subject": "Multi-Recipient Test",
    "text": "This email goes to multiple recipients"
  }
}
```

### Custom Headers Test

```json
{
  "to": "test@example.com",
  "message": {
    "subject": "Custom Headers Test",
    "text": "Testing custom email headers"
  },
  "headers": {
    "X-Custom-Header": "TestValue",
    "List-Unsubscribe": "<mailto:unsubscribe@example.com>"
  }
}
```

## 📊 Monitoring and Debugging

### Real-time Log Monitoring

```bash
firebase functions:log --project=YOUR_FIREBASE_PROJECT_ID --follow
```

### Extension Status Check

```bash
firebase ext:list --project=YOUR_FIREBASE_PROJECT_ID
```

### Function Status Check

```bash
firebase functions:list --project=YOUR_FIREBASE_PROJECT_ID
```

## 🔍 Common Issues and Solutions

### 1. Extensão está ACTIVE, mas `delivery.state` fica `ERROR`

**Causa mais comum**: parâmetros/secrets SMTP/OAuth2 incompletos ou inválidos.

**Checklist rápido (Console Firebase → Extensions → firestore-send-email → Configure):**
- `Email documents collection` = `mail`
- `Default FROM` existe e é aceito pelo provedor SMTP
- Se `AUTH_TYPE=UsernamePassword` (como em [extensions/firestore-send-email.env](../extensions/firestore-send-email.env)):
  - `SMTP connection URI` preenchido
  - `SMTP password` preenchido
- Se `AUTH_TYPE=OAuth2`:
  - `OAuth2 clientId/clientSecret/refreshToken` preenchidos
  - `OAuth2 SMTP user` preenchido

> Observação: o export em [extensions/firestore-send-email.env](../extensions/firestore-send-email.env) não inclui secrets.

### 2. Emails Not Sending

**Check**:
1. Extension status is `ACTIVE`
2. SMTP credentials are correct
3. Mail collection document structure is valid
4. Check Functions logs for errors

### 3. SendGrid Features Not Working

**Verify**:
1. SMTP URI includes `sendgrid.net`
2. API key has Mail Send permissions
3. Categories and custom args are properly formatted

### 4. Gmail Authentication Issues

**Check**:
1. App Password is correctly generated
2. 2FA is enabled on Gmail account
3. No special characters in password need escaping

## 📱 Testing Dashboard Component

The `EmailExtensionTesting` component provides:

- **Interactive Testing**: Send different email types
- **Real-time Monitoring**: Watch email status changes
- **Email History**: View all sent emails
- **Activity Logs**: Live operation logging
- **Troubleshooting Guide**: Built-in help

### Usage

```tsx
import EmailExtensionTesting from '@/components/EmailExtensionTesting';

export default function TestPage() {
  return <EmailExtensionTesting />;
}
```

## 🚀 Production Checklist

### Before Going Live

1. **✅ Extension Status**: ACTIVE
2. **✅ SMTP Configuration**: Verified and tested
3. **✅ Email Templates**: Created and tested
4. **✅ Monitoring**: Logs and alerts configured
5. **✅ Rate Limits**: SMTP provider limits understood
6. **✅ Unsubscribe**: Headers configured if needed

### Security Considerations

1. **SMTP Credentials**: Store securely, never in code
2. **Email Validation**: Validate recipient addresses
3. **Rate Limiting**: Implement sending limits
4. **Spam Compliance**: Follow CAN-SPAM guidelines

## 📚 Additional Resources

### Firebase Console Links

- **Extensions**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/extensions
- **Firestore**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/data
- **Functions**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/functions/logs

### Documentation

- **Extension Documentation**: [Firebase Email Extension](https://firebase.google.com/products/extensions/firebase-firestore-send-email)
- **SendGrid API**: [SendGrid Documentation](https://docs.sendgrid.com/)
- **Gmail API**: [Gmail API Documentation](https://developers.google.com/gmail/api)

### Testing Scripts

- **Simple Test**: `node test-email-extension-simple.js`
- **Comprehensive Test**: `./test-email-extension.sh`
- **Repo Validator (recomendado)**: `node scripts/validate-email-extension.cjs`

## 🎯 Próximos passos

1. Ajustar SMTP/OAuth2 na extensão (Console Firebase)
2. Rodar `node scripts/validate-email-extension.cjs` até `delivery.state = SUCCESS`
3. Depois, configurar provedor definitivo (SendGrid recomendado) e validar taxa/limites

---

**Last Updated**: 2026-02-01  
**Status**: extensão `firestore-send-email` ACTIVE; falta validar SMTP/OAuth2 para envio
