# 🔴 DIAGNÓSTICO: Erro EMAIL_NOT_VERIFIED e Serviços de OTP/SMS Não Funcionam

**Data**: 02/01/2026  
**Erro**: `[Error] [Admin Login] Erro ao autenticar: Error: EMAIL_NOT_VERIFIED`

---

## 📋 RESUMO DO PROBLEMA

O login do admin está falhando porque:
1. ✅ **SMTP está configurado** (Apple Mail) mas pode ter problemas de entrega
2. ❌ **SMS/OTP não está configurado** - sem variáveis de ambiente
3. ❌ **Fluxo de verificação de email pode estar quebrado** no registro
4. ❌ **O Firebase não está enviando emails de verificação** automaticamente

---

## 🔍 ANÁLISE DETALHADA

### 1️⃣ Status do SMTP (Email)

**Configuração Atual:**
```
✅ SMTP_HOST=smtp.mail.me.com (Apple Mail)
✅ SMTP_USER=is@italosantos.com
✅ SMTP_PORT=587 (STARTTLS)
✅ SMTP_REQUIRE_TLS=true
✅ SMTP_SECURE=false
✅ SMTP_DEBUG=true
```

**Diagnóstico:**
- ✅ Variáveis configuradas
- ⚠️ Apple Mail tem restrições de envio (limite de 250 emails/dia)
- ⚠️ A senha é "app password" do Apple (xvfi-zkrd-ztcp-fgaq)
- ⚠️ Emails podem estar sendo bloqueados como SPAM

**Possíveis Problemas:**
```
❌ SMTP pode estar rejeitando conexões por IP/domínio
❌ Credenciais podem estar expiradas
❌ Firewall/ISP bloqueando porta 587
❌ Limites de taxa do Apple Mail excedidos
```

---

### 2️⃣ Status do SMS/OTP

**Configuração Atual:**
```
❌ SMS_ENDPOINT não definido
❌ SMS_API_KEY não definido
❌ TWILIO_ACCOUNT_SID não definido
❌ TWILIO_AUTH_TOKEN não definido
❌ TWILIO_FROM não definido
```

**Diagnóstico:**
- ❌ **SMS está completamente desconfigurado**
- ❌ O backend SMS em Cloud Run não está sendo usado
- ❌ O AdminRegisterModal tenta enviar OTP mas falha silenciosamente

---

### 3️⃣ Fluxo de Registro de Admin

**Sequência Esperada:**
```
1. Usuário preenche: nome, username, telefone, email, senha
2. Envia OTP para TELEFONE (Firebase Phone Auth)
   ├─ reCAPTCHA valida
   └─ Firebase envia SMS ✅
3. Usuário confirma código SMS
4. Vincula credencial de telefone
5. Cria conta com email/senha
6. Envia verificação de EMAIL
   ├─ Firebase chama sendEmailVerification() ✅
   ├─ SMTP envia email ⚠️
   └─ Usuário clica no link de confirmação
7. Login do admin
   ├─ Verifica user.emailVerified
   └─ Se FALSE → Rejeita com ERROR_EMAIL_NOT_VERIFIED ❌
```

**Problema Identificado:**
- ❌ Firebase Phone Auth SMS funciona (nativo)
- ❌ Email verification pode estar falhando
- ❌ O email pode não estar sendo enviado pelo SMTP
- ❌ Mesmo que seja enviado, o usuário pode não receber

---

### 4️⃣ Fluxo de Login

```typescript
const credential = await signInWithEmailAndPassword(auth, email, password);
const user = credential.user;

if (!user.emailVerified) {  // ← FALHA AQUI
  await signOut(auth);
  throw new Error('EMAIL_NOT_VERIFIED');
}
```

**Problema:**
- ✅ Credenciais estão corretas
- ❌ `user.emailVerified` é FALSE
- ❌ Por quê? Email de verificação nunca foi recebido ou nunca foi clicado

---

## 🚀 SOLUÇÕES RECOMENDADAS

### Solução Rápida #1: Usar Firebase nativo para verificação de email

**Vantagem:** Funciona 100% com Firebase Auth  
**Desvantagem:** Templates email padrão do Firebase

```typescript
// Em AdminRegisterModal.tsx
await sendEmailVerification(userCredential.user);

// Isso envia um email padrão do Firebase com:
// - Link customizável no Firebase Console
// - Autenticação automática ao clicar
```

**Ação:** Configurar Action URL no Firebase Console para:
```
https://italosantos.com/auth/action
```

---

### Solução Rápida #2: Remover a validação de email para admin

**Risco:** ⚠️ SEGURANÇA - permite admin com email não verificado

```typescript
// Em login-form.tsx - COMENTAR VALIDAÇÃO
// if (!user.emailVerified) {
//   await signOut(auth);
//   throw new Error('EMAIL_NOT_VERIFIED');
// }
```

**Recomendação:** Usar apenas como TESTE, não em produção.

---

### Solução Completa #3: Configurar SMS/OTP com Twilio

1. **Criar conta Twilio**: https://www.twilio.com
2. **Obter credenciais:**
   ```
   TWILIO_ACCOUNT_SID=ACxxx...
   TWILIO_AUTH_TOKEN=xxx...
   TWILIO_FROM=+1234567890 (seu número)
   ```
3. **Adicionar ao .env.local:**
   ```bash
   NEXT_PUBLIC_SMS_ENDPOINT=https://seu-sms-backend.run.app
   NEXT_PUBLIC_SMS_API_KEY=sua-chave-secreta
   SMS_ENDPOINT=https://seu-sms-backend.run.app
   SMS_API_KEY=sua-chave-secreta
   ```

4. **Deploy do SMS Backend:**
   ```bash
   gcloud builds submit \
     --config=sms-backend/cloudbuild.sms.yaml \
     --substitutions=_SERVICE=sms-otp-service,_REGION=us-central1
   ```

---

### Solução Completa #4: Substituir Apple Mail por Gmail/SendGrid

**Por que?** Apple Mail tem limites rigorosos.

**Opção A: Gmail com app-specific password**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_USER=seu-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx (app password)
SMTP_PORT=587
SMTP_SECURE=false
```

**Opção B: SendGrid**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxx
SMTP_PORT=587
SMTP_SECURE=false
```

---

## 🔧 PASSOS DE CORREÇÃO IMEDIATA

### ✅ Passo 1: Testar SMTP

```bash
# Terminal
npm run test-email

# Ou manualmente
curl -X POST http://localhost:3000/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "verify-email",
    "email": "seu-email@teste.com",
    "displayName": "Admin Teste",
    "appName": "Italo Santos"
  }'
```

**Verificar:**
- Verifique logs do servidor
- Procure por `[Email] send_error` ou `[Email] sent`
- Verifique SPAM da caixa de entrada

---

### ✅ Passo 2: Habilitar Verificação de Email do Firebase

1. Acesse: https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/emails
2. Clique em **"Email verification"** (ícone de lápis)
3. Em **"Action URL"**, defina:
   ```
   https://italosantos.com/auth/action
   ```
4. Salve
5. Teste enviando email de verificação novamente

---

### ✅ Passo 3: Verificar Registro de Admin Manualmente

**Option A: Marcar como verificado no Firebase Console**
1. Acesse: https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/users
2. Procure pelo admin
3. Clique nos 3 pontinhos → Editar
4. **Marque "Email verified"** ✅
5. Salve

**Option B: Usar a API do Firebase Admin para marcar como verificado**
```bash
# Script para marcar email como verificado
node -e "
const admin = require('firebase-admin');
const serviceAccount = require('./service_account.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

admin.auth().updateUser('UID_DO_ADMIN', { emailVerified: true })
  .then(() => console.log('✅ Email marcado como verificado'))
  .catch(err => console.error('❌ Erro:', err));
"
```

---

### ✅ Passo 4: Atualizar AdminRegisterModal

**Problema Atual:**
```typescript
await sendEmailVerification(userCredential.user);
// Não aguarda confirmação do usuário antes de login
```

**Solução:**
```typescript
// 1. Enviar email de verificação
await sendEmailVerification(userCredential.user);

// 2. Avisar ao usuário
toast({ 
  title: "E-mail de verificação enviado!", 
  description: "Clique no link do email para confirmar sua conta."
});

// 3. Registrar como admin
await ensureAdminDoc(userCredential.user, name, phone, username);

// 4. Logout automático (forçar verificação antes de login)
await signOut(auth);

// 5. Redirecionar para login
setStep("done");
```

---

## 📊 CHECKLIST DE CORREÇÃO

- [ ] **Email SMTP**
  - [ ] Testar conexão SMTP com `test-email` script
  - [ ] Verificar if emails estão sendo entregues
  - [ ] Se não: trocar para Gmail/SendGrid

- [ ] **Firebase Email Verification**
  - [ ] Configurar Action URL no Firebase Console
  - [ ] Testar sendEmailVerification()
  - [ ] Verificar se email chega na caixa de entrada

- [ ] **Admin Registration Flow**
  - [ ] Marcar email como verificado manualmente (temporário)
  - [ ] OU aguardar usuário clicar no link de verificação
  - [ ] OU remover validação para teste

- [ ] **SMS/OTP (Futuro)**
  - [ ] Criar conta Twilio
  - [ ] Configurar variáveis de ambiente
  - [ ] Deploy SMS Backend em Cloud Run
  - [ ] Testar fluxo completo

---

## 🆘 PRÓXIMOS PASSOS

1. **Imediato**: Implementar Passo 2 e 3 acima
2. **Curto Prazo**: Substituir Apple Mail por Gmail (mais confiável)
3. **Médio Prazo**: Configurar SMS com Twilio
4. **Longo Prazo**: Migrar para SendGrid + Twilio para produção

---

## 📚 Referências

- [Firebase Email Verification](https://firebase.google.com/docs/auth/web/manage-users#send_a_password_reset_email)
- [Firebase Auth Templates](https://firebase.google.com/docs/auth/custom-email-handler)
- [Twilio SMS](https://www.twilio.com/en-us/messaging/channels/sms)
- [SendGrid SMTP](https://docs.sendgrid.com/for-developers/sending-email/smtp-service)

