# 🧪 Teste de Notificações - Sistema 2FA

Este documento explica como testar o sistema de notificações (email + SMS) usado no fluxo de autenticação 2FA do sistema de administração.

## 📋 Visão Geral

O sistema usa dois serviços de notificação:
- **📧 SendGrid**: Envio de emails com códigos de verificação
- **📱 Twilio**: Envio de SMS com códigos de verificação

## 🔧 Pré-requisitos

### 1. Verificar Variáveis de Ambiente

Certifique-se de que todas as credenciais estão configuradas no `.env.local`:

```bash
# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+19292099786
```

### 2. Verificar Servidor Rodando

```bash
npm run dev
# Servidor deve estar em http://localhost:3000
```

## 🚀 Opção 1: Teste Automatizado (Recomendado)

### Executar Script de Teste

```bash
cd /Users/italosanta/Downloads/italosantos.com\ original
chmod +x scripts/test-notifications.sh
./scripts/test-notifications.sh
```

O script vai:
1. ✅ Verificar se o servidor está rodando
2. 📧 Enviar email de teste para `italo16rj@gmail.com`
3. 📱 Enviar SMS de teste para `+5521980246195`
4. 📊 Mostrar resumo dos resultados

### Output Esperado

```
╔════════════════════════════════════════════════════════════╗
║  🧪 TESTE DE NOTIFICAÇÕES - Sistema 2FA                   ║
╚════════════════════════════════════════════════════════════╝

🔍 Verificando se o servidor está rodando...
✅ Servidor rodando!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 TESTE 1: Envio de Email via SendGrid
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Email enviado com sucesso!
📬 Verifique sua caixa de entrada: italo16rj@gmail.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 TESTE 2: Envio de SMS via Twilio
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ SMS enviado com sucesso!
📱 Verifique seu celular: +5521980246195

🎉 TODOS OS TESTES PASSARAM!
```

## 🧰 Opção 2: Teste Manual com cURL

### Teste de Email (SendGrid)

```bash
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "italo16rj@gmail.com",
    "subject": "🧪 Teste SendGrid - Código de Verificação",
    "code": "123456"
  }'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Email enviado com sucesso!",
  "details": {
    "to": "italo16rj@gmail.com",
    "from": "noreply@italosantos.com",
    "subject": "🧪 Teste SendGrid - Código de Verificação",
    "code": "123456",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Teste de SMS (Twilio)

```bash
curl -X POST http://localhost:3000/api/test/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+5521980246195",
    "code": "123456"
  }'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "SMS enviado com sucesso!",
  "details": {
    "sid": "SM1234567890abcdef",
    "status": "queued",
    "to": "+5521980246195",
    "from": "+19292099786",
    "code": "123456",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🐛 Troubleshooting

### ❌ Email Não Está Enviando

#### Erro: "Credenciais SendGrid não configuradas"
```json
{
  "error": "SendGrid não configurado",
  "missing": { "apiKey": true }
}
```

**Solução:**
1. Verifique se `SENDGRID_API_KEY` está no `.env.local`
2. Confirme que a chave começa com `SG.`
3. Reinicie o servidor: `npm run dev`

#### Erro: "Unauthorized sender"
```json
{
  "error": "Sender Identity not verified"
}
```

**Solução:**
1. Acesse [SendGrid Dashboard](https://app.sendgrid.com/)
2. Vá em **Settings** → **Sender Authentication**
3. Verifique o domínio `italosantos.com` ou o email `noreply@italosantos.com`
4. Se for usar Single Sender Verification:
   - Clique em **Verify a Single Sender**
   - Use um email que você tenha acesso
   - Confirme o email de verificação
   - Atualize o `from` no código para usar esse email

#### Email Não Chegou na Caixa de Entrada

**Verificar:**
1. 📬 **Pasta de SPAM** - emails de teste costumam cair aqui
2. 📊 **SendGrid Activity Feed**:
   - Acesse [Activity Feed](https://app.sendgrid.com/email_activity)
   - Procure pelo email `italo16rj@gmail.com`
   - Verifique status: `delivered`, `bounced`, `dropped`
3. ⏱️ **Aguarde 1-2 minutos** - pode haver delay

### ❌ SMS Não Está Enviando

#### Erro: "Credenciais Twilio não configuradas"
```json
{
  "error": "Twilio não configurado",
  "missing": {
    "accountSid": false,
    "authToken": true,
    "phoneNumber": false
  }
}
```

**Solução:**
1. Verifique `.env.local` tem:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
2. Reinicie o servidor: `npm run dev`

#### Erro 20003: "Authentication Error"
```json
{
  "error": "Falha de autenticação Twilio",
  "code": 20003
}
```

**Solução:**
1. Acesse [Twilio Console](https://console.twilio.com/)
2. Verifique **Account SID** e **Auth Token** em Account Info
3. Copie novamente para `.env.local`
4. Certifique-se de não ter espaços extras

#### Erro 21610: "Número não verificado (conta trial)"
```json
{
  "error": "Número de telefone não verificado (conta trial)",
  "code": 21610
}
```

**Solução (Conta Trial):**
1. Acesse [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Clique em **Add a new Caller ID**
3. Digite `+5521980246195`
4. Twilio vai ligar ou enviar SMS para verificar
5. Digite o código de verificação
6. Tente enviar novamente

**Solução (Conta Paga):**
1. Faça upgrade da conta:
   - Acesse [Billing](https://console.twilio.com/us1/billing)
   - Adicione método de pagamento
   - Upgrade para Pay-as-you-go
2. Após upgrade, não precisa verificar números

#### Erro 21408: "País não permitido"
```json
{
  "error": "Permissão negada para enviar SMS para este país",
  "code": 21408
}
```

**Solução:**
1. Acesse [Geo Permissions](https://console.twilio.com/us1/develop/sms/settings/geo-permissions)
2. Verifique se **Brazil (+55)** está habilitado
3. Se não estiver, habilite e salve
4. Aguarde alguns minutos para propagar

#### SMS Não Chegou no Celular

**Verificar:**
1. 📱 **Aguarde 1-2 minutos** - SMS pode ter delay
2. 📊 **Twilio Logs**:
   - Acesse [Messaging Logs](https://console.twilio.com/us1/monitor/logs/sms)
   - Procure por `+5521980246195`
   - Verifique status: `delivered`, `failed`, `undelivered`
3. 📞 **Número Correto**:
   - Formato deve ser `+5521980246195` (com + e código do país)
   - Sem espaços ou parênteses
4. 💰 **Saldo da Conta**:
   - Verifique em [Billing](https://console.twilio.com/us1/billing)
   - Conta trial tem créditos limitados ($15)

## 📊 Verificação no Dashboard

### SendGrid Dashboard
1. Acesse: https://app.sendgrid.com/
2. Menu lateral → **Activity Feed**
3. Procure por `italo16rj@gmail.com`
4. Verifique status do email

### Twilio Console
1. Acesse: https://console.twilio.com/
2. Menu lateral → **Monitor** → **Logs** → **Messaging**
3. Procure por `+5521980246195`
4. Verifique Message SID e status

## ✅ Próximos Passos

Após confirmar que **ambos** os testes passaram:

1. **Teste o Fluxo Completo de Registro:**
   ```
   1. Acesse: http://localhost:3000/admin/register
   2. Capture foto facial
   3. Preencha formulário
   4. Verifique código de email
   5. Verifique código de SMS
   6. Confirme admin criado no Firestore
   ```

2. **Verifique Firestore:**
   ```
   - Coleção: admins/{id}
   - Documento: admin/profileSettings
   - Ambos devem ter os mesmos dados (sincronizados)
   - faceData deve estar presente e não vazio
   ```

3. **Teste Login com Face ID:**
   ```
   1. Acesse: http://localhost:3000/admin/login
   2. Tente fazer login com reconhecimento facial
   3. Verifique se a autenticação funciona
   ```

## 📝 Logs de Debug

Os endpoints de teste incluem logs detalhados no terminal:

```bash
# Email Test
[Email Test] 📧 Enviando email de teste...
[Email Test] 📧 Para: italo16rj@gmail.com
[Email Test] 📧 Código: 123456
[Email Test] ✅ Email enviado com sucesso!

# SMS Test
[SMS Test] 📱 Enviando SMS de teste...
[SMS Test] 📱 Para: +5521980246195
[SMS Test] 📱 Código: 123456
[SMS Test] 📱 Message SID: SM1234567890abcdef
[SMS Test] ✅ SMS enviado com sucesso!
```

## 🔐 Segurança

⚠️ **IMPORTANTE:**
- Os endpoints de teste NÃO devem estar em produção
- Adicione autenticação antes de deploy
- Remova ou desabilite em `NEXT_PUBLIC_ENV=production`
- Rate limiting é recomendado (ex: 5 testes por hora)

## 📞 Suporte

Se os problemas persistirem:

1. **SendGrid Support**: https://support.sendgrid.com/
2. **Twilio Support**: https://support.twilio.com/
3. **Logs do Terminal**: Verifique output detalhado do `npm run dev`
4. **Firestore Rules**: Confirme que as regras estão implantadas

---

**Última atualização:** Documento criado junto com APIs de teste  
**Autor:** Sistema de Administração - italosantos.com