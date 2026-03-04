# 🆓 Sistema de Notificações GRATUITO com Firebase

Este guia explica como usar Firebase para enviar emails e SMS **completamente grátis**, substituindo SendGrid e Twilio.

## 📋 Visão Geral

### ✅ O que mudou:

| Serviço | ❌ Antes (Pago) | ✅ Agora (Grátis) |
|---------|----------------|-------------------|
| **Email** | SendGrid ($$$) | Firebase Extension "Trigger Email" (FREE) |
| **SMS** | Twilio ($$$) | Firestore + Cloud Functions / WhatsApp (FREE) |

### 💰 Economia Mensal:
- **SendGrid**: ~$15-50/mês → **$0**
- **Twilio SMS**: ~$20-100/mês → **$0**
- **Total**: ~$35-150/mês → **$0**

---

## 📧 PARTE 1: Configurar Email GRÁTIS

### 1.1. Instalar Extensão Firebase

1. **Acesse Firebase Console**:
   ```
   https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/extensions
   ```

2. **Clique em "Extensions" no menu lateral**

3. **Procure por "Trigger Email from Firestore"**

4. **Clique em "Install"**

5. **Configure a extensão**:
   ```yaml
   Nome da coleção: mail
   
   SMTP Connection URI:
   # Opção 1 - Gmail (Recomendado para testes)
   smtps://seu-email@gmail.com:SUA_APP_PASSWORD@smtp.gmail.com:465
   
   # Opção 2 - Gmail OAuth (Mais seguro)
   # Siga o guia: https://nodemailer.com/smtp/oauth2/
   
   # Opção 3 - Outlook/Hotmail
   smtps://seu-email@outlook.com:SUA_SENHA@smtp-mail.outlook.com:587
   
   # Opção 4 - Zoho Mail (Grátis)
   smtps://seu-email@zohomail.com:SUA_SENHA@smtp.zoho.com:465
   
   Email do remetente padrão:
   noreply@italosantos.com
   
   Nome do remetente:
   italosantos.com
   ```

### 1.2. Configurar Gmail App Password (Recomendado)

Se for usar Gmail:

1. **Ativar 2FA no Gmail**:
   - Acesse: https://myaccount.google.com/security
   - Vá em "Verificação em duas etapas"
   - Siga as instruções

2. **Criar App Password**:
   - Acesse: https://myaccount.google.com/apppasswords
   - Clique em "Selecionar app" → Outro
   - Nome: "Firebase Email Extension"
   - Copie a senha gerada (16 caracteres)

3. **Usar no SMTP URI**:
   ```
   smtps://seu-email@gmail.com:xxxx-xxxx-xxxx-xxxx@smtp.gmail.com:465
   ```

### 1.3. Testar Email

```bash
# Executar teste
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "italo16rj@gmail.com",
    "subject": "Teste Firebase",
    "code": "123456"
  }'
```

**Resposta esperada**:
```json
{
  "success": true,
  "message": "Email enviado com sucesso via Firebase!",
  "documentId": "abc123..."
}
```

### 1.4. Verificar Email no Firestore

1. Acesse: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore
2. Vá na coleção `mail`
3. Você verá documentos com campo `delivery.state`:
   - `SUCCESS` = Email entregue ✅
   - `ERROR` = Erro no envio ❌
   - `PROCESSING` = Sendo processado ⏳

---

## 📱 PARTE 2: Configurar SMS GRÁTIS

### Opção 1: Firebase Auth (Recomendado - Totalmente Grátis)

Firebase Auth oferece SMS de verificação **100% gratuitos**!

#### 2.1.1. Ativar Firebase Auth

1. **Acesse Firebase Console**:
   ```
   https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/authentication
   ```

2. **Clique em "Sign-in method"**

3. **Ative "Phone"**

4. **Configure reCAPTCHA**:
   - Acesse: https://www.google.com/recaptcha/admin
   - Crie um novo site
   - Tipo: reCAPTCHA v2 ou v3
   - Adicione domínio: `italosantos.com` e `localhost`
   - Copie as chaves Site Key e Secret Key

#### 2.1.2. Implementar no Frontend

```typescript
// src/lib/firebase-phone-auth.ts
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export async function sendVerificationCode(phoneNumber: string) {
    const auth = getAuth();
    
    // Configurar reCAPTCHA
    const recaptchaVerifier = new RecaptchaVerifier(
        'recaptcha-container',
        {
            size: 'invisible',
            callback: () => {
                console.log('reCAPTCHA resolvido');
            }
        },
        auth
    );

    // Enviar SMS (GRÁTIS via Firebase)
    const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
    );

    // Salvar confirmationResult para verificar código depois
    return confirmationResult;
}

export async function verifyCode(confirmationResult: any, code: string) {
    try {
        const result = await confirmationResult.confirm(code);
        return {
            success: true,
            user: result.user
        };
    } catch (error) {
        return {
            success: false,
            error: 'Código inválido'
        };
    }
}
```

#### 2.1.3. Usar no Componente

```tsx
// src/components/phone-verification.tsx
import { useState } from 'react';
import { sendVerificationCode, verifyCode } from '@/lib/firebase-phone-auth';

export function PhoneVerification() {
    const [phone, setPhone] = useState('+5521980246195');
    const [code, setCode] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);

    const handleSendCode = async () => {
        try {
            const result = await sendVerificationCode(phone);
            setConfirmationResult(result);
            alert('SMS enviado! Verifique seu celular.');
        } catch (error) {
            alert('Erro ao enviar SMS: ' + error.message);
        }
    };

    const handleVerifyCode = async () => {
        try {
            const result = await verifyCode(confirmationResult, code);
            if (result.success) {
                alert('Código verificado! ✅');
            } else {
                alert('Código inválido ❌');
            }
        } catch (error) {
            alert('Erro ao verificar: ' + error.message);
        }
    };

    return (
        <div>
            <div id="recaptcha-container"></div>
            
            <input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+5521980246195"
            />
            <button onClick={handleSendCode}>Enviar Código</button>

            {confirmationResult && (
                <>
                    <input 
                        value={code} 
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="123456"
                    />
                    <button onClick={handleVerifyCode}>Verificar</button>
                </>
            )}
        </div>
    );
}
```

### Opção 2: WhatsApp Business API (Grátis)

WhatsApp Business API permite enviar mensagens gratuitamente!

#### 2.2.1. Configurar via Twilio (Mais Fácil)

1. **Criar conta Twilio**: https://www.twilio.com/try-twilio
2. **Ativar WhatsApp Sandbox**:
   - Acesse: https://console.twilio.com/us1/develop/sms/whatsapp/sandbox
   - Envie "join [código]" para o número do sandbox
3. **Testar**:
   ```bash
   curl -X POST https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json \
     --data-urlencode "From=whatsapp:+14155238886" \
     --data-urlencode "To=whatsapp:+5521980246195" \
     --data-urlencode "Body=Seu código: 123456" \
     -u YOUR_SID:YOUR_AUTH_TOKEN
   ```

#### 2.2.2. Configurar via Zapier (Sem Código)

1. **Criar conta Zapier**: https://zapier.com/ (100 tarefas/mês grátis)
2. **Criar Zap**:
   - Trigger: Webhook (POST request)
   - Action: WhatsApp Business → Send Message
3. **Configurar Webhook**:
   - URL: `https://hooks.zapier.com/hooks/catch/XXXXX/YYYYY/`
   - Testar com:
     ```bash
     curl -X POST https://hooks.zapier.com/hooks/catch/XXXXX/YYYYY/ \
       -H "Content-Type: application/json" \
       -d '{"phone":"+5521980246195","message":"Código: 123456"}'
     ```

### Opção 3: Cloud Function com Webhook

Use a função que criamos em `functions/src/sms-processor.ts`:

```bash
# Deploy da função
cd functions
npm install
npm run build
firebase deploy --only functions:processSmsQueue
```

A função vai automaticamente processar SMS da coleção `sms_queue`.

---

## 🧪 TESTES

### Testar Email

```bash
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "italo16rj@gmail.com",
    "subject": "Teste Firebase Email",
    "code": "123456"
  }'
```

### Testar SMS (via Firestore)

```bash
curl -X POST http://localhost:3000/api/test/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5521980246195",
    "code": "123456"
  }'
```

O SMS será salvo no Firestore na coleção `sms_queue`. Configure uma das opções acima para envio automático.

---

## 📊 Monitoramento

### Verificar Status de Emails

```bash
# No Firebase Console
https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/data/~2Fmail
```

Cada documento terá:
- `delivery.state`: SUCCESS, ERROR, PROCESSING
- `delivery.error`: Mensagem de erro (se houver)
- `delivery.info.messageId`: ID da mensagem enviada

### Verificar Status de SMS

```bash
# No Firebase Console
https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/data/~2Fsms_queue
```

Cada documento terá:
- `status`: pending, sent, failed, expired
- `attempts`: Número de tentativas
- `sentAt`: Data/hora do envio

---

## 🔧 Troubleshooting

### Email não está enviando

**1. Verificar extensão instalada**:
```bash
firebase ext:list --project=YOUR_FIREBASE_PROJECT_ID
```

**2. Verificar logs da extensão**:
```bash
firebase functions:log --only ext-firestore-send-email
```

**3. Problemas comuns**:

❌ **Erro: "Sender not verified"**
- Gmail: Use App Password
- Outros: Verifique domínio no provedor

❌ **Erro: "Authentication failed"**
- Verifique SMTP URI está correto
- Teste credenciais manualmente

❌ **Email vai para SPAM**
- Configure SPF, DKIM, DMARC no seu domínio
- Use domínio verificado no remetente

### SMS não está enviando

**Firebase Auth**:
- ✅ Verifique reCAPTCHA configurado
- ✅ Verifique console.firebase.google.com/usage (quotas)
- ✅ Teste com outro número de telefone

**WhatsApp**:
- ✅ Verifique WhatsApp Business API ativado
- ✅ Teste no Sandbox primeiro
- ✅ Verifique número está no formato +5521980246195

---

## 💡 Dicas Importantes

### 1. Limites do Firebase (Plano Grátis)

| Recurso | Limite Grátis | Como Escalar |
|---------|---------------|--------------|
| Firestore Reads | 50k/dia | Upgrade para Blaze (pay-as-you-go) |
| Firestore Writes | 20k/dia | Cache no cliente |
| Cloud Functions | 125k/dia | Otimizar funções |
| SMS (Auth) | **ILIMITADO** | ✅ Grátis sempre! |
| Email Extension | Depende do SMTP | Use Gmail (500/dia grátis) |

### 2. Gmail Limits

- **Grátis**: 500 emails/dia
- **Google Workspace**: 2.000 emails/dia

Se precisar de mais, use:
- Mailgun (5.000/mês grátis)
- Mailjet (6.000/mês grátis)
- Sendinblue (300/dia grátis)

### 3. Segurança

⚠️ **IMPORTANTE**: Nunca exponha credenciais no frontend!

✅ **Correto**:
```typescript
// Backend: /api/notifications/send-email/route.ts
await adminDb.collection('mail').add({ ... });
```

❌ **ERRADO**:
```typescript
// Frontend: Nunca faça isso!
await db.collection('mail').add({ ... }); // INSEGURO!
```

### 4. Rate Limiting

Adicione rate limiting para evitar abuso:

```typescript
// src/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function checkRateLimit(identifier: string) {
    const { success } = await ratelimit.limit(identifier);
    return success;
}
```

---

## 📚 Próximos Passos

1. ✅ **Configurar Email Extension** (15 minutos)
2. ✅ **Testar envio de emails** (5 minutos)
3. ✅ **Escolher método de SMS** (Firebase Auth, WhatsApp, ou Webhook)
4. ✅ **Implementar SMS no frontend** (30 minutos)
5. ✅ **Testar fluxo completo** (10 minutos)
6. ✅ **Fazer deploy** (20 minutos)

**Total**: ~1h 30min para migrar completamente de serviços pagos para Firebase GRÁTIS!

---

## 🆘 Suporte

Se tiver problemas:

1. **Logs do Firebase**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/functions/logs
2. **Logs da Extensão**: `firebase functions:log --only ext-firestore-send-email`
3. **Status do Firestore**: https://status.firebase.google.com/

---

## 📝 Checklist de Migração

- [ ] Instalar Firebase Extension "Trigger Email"
- [ ] Configurar SMTP (Gmail App Password)
- [ ] Testar envio de email
- [ ] Escolher método de SMS (Firebase Auth / WhatsApp / Webhook)
- [ ] Implementar SMS no código
- [ ] Testar SMS
- [ ] Remover dependências do SendGrid (`@sendgrid/mail`)
- [ ] Remover dependências do Twilio (`twilio`)
- [ ] Atualizar variáveis de ambiente
- [ ] Fazer deploy das mudanças
- [ ] Testar em produção

**Resultado**: $0/mês em vez de $35-150/mês! 🎉
