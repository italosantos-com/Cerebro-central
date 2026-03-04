# 🔌 WEBHOOKS MULTICHAT - GUIA DE CONFIGURAÇÃO

## ✅ Webhooks Implementados

Todos os 4 webhooks foram criados e estão prontos para receber mensagens:

- ✅ **Facebook Messenger**: `/api/channels/facebook/webhook`
- ✅ **Instagram DM**: `/api/channels/instagram/webhook`
- ✅ **Twitter/X DM**: `/api/channels/twitter/webhook`
- ✅ **WhatsApp Business**: `/api/channels/whatsapp/webhook`

---

## 📋 PRÉ-REQUISITOS

### 1. Configurar variáveis de ambiente (`.env.local`):

```bash
# Tokens de verificação dos webhooks
FACEBOOK_VERIFY_TOKEN=meu_token_secreto_super_seguro_123
INSTAGRAM_VERIFY_TOKEN=meu_token_secreto_super_seguro_123
WHATSAPP_VERIFY_TOKEN=meu_token_secreto_super_seguro_123

# Twitter precisa do Consumer Secret para CRC
TWITTER_CONSUMER_SECRET=seu_consumer_secret_aqui
TWITTER_API_SECRET=seu_api_secret_aqui
```

### 2. Deploy da aplicação

Os webhooks precisam estar acessíveis publicamente. Opções:

**A) Produção (recomendado):**
```bash
# Deploy no Vercel/Firebase/Cloud Run
npm run deploy
```

**B) Desenvolvimento local com túnel:**
```bash
# Instalar ngrok ou cloudflared
npx ngrok http 3000

# Ou cloudflared
cloudflared tunnel --url http://localhost:3000
```

---

## 🔧 CONFIGURAÇÃO POR PLATAFORMA

### 📘 FACEBOOK MESSENGER

1. **Acesse:** https://developers.facebook.com/apps/
2. **Selecione seu app** (ou crie um novo)
3. **Adicione produto:** Messenger
4. **Configure Webhooks:**
   - Clique em "Configurar Webhooks"
   - **URL de Callback:** `https://seu-dominio.com/api/channels/facebook/webhook`
   - **Token de verificação:** Use o mesmo que está no `.env` (FACEBOOK_VERIFY_TOKEN)
   - **Campos de inscrição:** Marque `messages`, `messaging_postbacks`, `message_reads`
   - Clique em "Verificar e salvar"

5. **Inscrever Páginas:**
   - Em "Webhooks" > "Páginas"
   - Selecione as páginas que receberão mensagens
   - Clique em "Inscrever"

6. **Token de Acesso:**
   - Gere um token de acesso de página
   - Adicione no `.env`: `FACEBOOK_PAGE_ACCESS_TOKEN=seu_token`

---

### 📷 INSTAGRAM MESSAGING

1. **Acesse:** https://developers.facebook.com/apps/
2. **Selecione o mesmo app do Facebook**
3. **Adicione produto:** Instagram (ou Messenger, que inclui Instagram)
4. **Configure Webhooks:**
   - Clique em "Configurar Webhooks" na seção Instagram
   - **URL de Callback:** `https://seu-dominio.com/api/channels/instagram/webhook`
   - **Token de verificação:** Use o mesmo (INSTAGRAM_VERIFY_TOKEN)
   - **Campos de inscrição:** Marque `messages`, `messaging_postbacks`
   - Clique em "Verificar e salvar"

5. **Conectar conta Instagram:**
   - Em "Configurações básicas"
   - Adicione sua conta Instagram Business
   - Autorize as permissões necessárias

---

### 🐦 TWITTER/X DIRECT MESSAGES

1. **Acesse:** https://developer.twitter.com/en/portal/dashboard
2. **Crie um App** (ou use existente)
3. **Configure Account Activity API:**
   - Vá em "Products" > "Premium" > "Account Activity API"
   - Solicite acesso (pode demorar alguns dias para aprovação)

4. **Configurar Webhook:**
   - Em "Dev environments" > "Account Activity API"
   - **Webhook URL:** `https://seu-dominio.com/api/channels/twitter/webhook`
   - Twitter fará um CRC challenge automaticamente

5. **Subscrever eventos:**
   ```bash
   # Use a API do Twitter para inscrever sua conta
   curl -X POST "https://api.twitter.com/1.1/account_activity/all/YOUR_ENV/subscriptions.json" \
     -H "Authorization: Bearer YOUR_BEARER_TOKEN"
   ```

6. **Adicionar credenciais no `.env`:**
   ```bash
   TWITTER_API_KEY=sua_api_key
   TWITTER_API_SECRET=seu_api_secret
   TWITTER_ACCESS_TOKEN=seu_access_token
   TWITTER_ACCESS_TOKEN_SECRET=seu_access_token_secret
   TWITTER_CONSUMER_SECRET=seu_consumer_secret
   ```

---

### 💬 WHATSAPP BUSINESS API

1. **Acesse:** https://developers.facebook.com/apps/
2. **Adicione produto:** WhatsApp
3. **Configure Webhooks:**
   - Em "Configuração" > "Webhooks"
   - **URL de Callback:** `https://seu-dominio.com/api/channels/whatsapp/webhook`
   - **Token de verificação:** Use o mesmo (WHATSAPP_VERIFY_TOKEN)
   - **Campos de inscrição:** Marque `messages`
   - Clique em "Verificar e salvar"

4. **Número de telefone:**
   - Adicione e verifique seu número de negócio
   - Ou use o número de teste fornecido pela Meta

5. **Token de Acesso:**
   - Gere um token de acesso permanente
   - Adicione no `.env`: `WHATSAPP_ACCESS_TOKEN=seu_token`

---

### 🧩 WHATSAPP BUSINESS APP (CADASTRO INCORPORADO)

Use esta seção se você for **Parceiro de Soluções/Provedor de Tecnologia** e quiser permitir que clientes integrem a conta do **WhatsApp Business App** com a **API de Nuvem** (com sincronização de histórico).

**Requisitos principais:**
- Cliente com WhatsApp Business App versão **2.24.17+**
- País compatível (há países não suportados)
- Webhook precisa aceitar eventos adicionais
- Cadastro incorporado com **registro de sessão**

**Etapa 1 — Assinar webhooks adicionais:**
No painel Meta > WhatsApp > Configuração, assine também:
- `history`
- `smb_app_state_sync`
- `smb_message_echoes`

**Etapa 2 — Personalizar o Cadastro Incorporado:**
No client de cadastro incorporado, configure o `featureType`:

```json
{
   "config_id": "<CONFIGURATION_ID>",
   "response_type": "code",
   "override_default_response_type": true,
   "extras": {
      "setup": {},
      "featureType": "whatsapp_business_app_onboarding",
      "sessionInfoVersion": "3"
   }
}
```

**Etapa 3 — Integrar e sincronizar histórico:**
- Ao concluir o fluxo, a sessão retornará `event: FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` e o `waba_id`.
- **Não** faça o registro do número (ele já está registrado pelo app).
- Inicie a sincronização em até **24 horas** com:
   - `POST /<BUSINESS_PHONE_NUMBER_ID>/smb_app_data` com `sync_type: smb_app_state_sync`
   - Depois, `sync_type: history`

**Importante:**
- A taxa para números compartilhados (app + API) fica fixa em **20 mps**.
- Mensagens do app continuam gratuitas, mensagens via API seguem preço da Cloud API.
- Se histórico não for compartilhado, virá erro `2593109` no webhook `history`.

---

## 🧪 TESTAR WEBHOOKS

### Teste 1: Verificar se webhooks estão respondendo

```bash
# Testar verificação do Facebook
curl "http://localhost:3000/api/channels/facebook/webhook?hub.mode=subscribe&hub.verify_token=meu_token_secreto_super_seguro_123&hub.challenge=teste123"

# Deve retornar: teste123
```

### Teste 2: Enviar mensagem simulada

```bash
# Testar recebimento de mensagem do Facebook
curl -X POST http://localhost:3000/api/channels/facebook/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "page-123",
      "time": 1234567890,
      "messaging": [{
        "sender": { "id": "user-456" },
        "recipient": { "id": "page-123" },
        "timestamp": 1234567890000,
        "message": {
          "mid": "msg-789",
          "text": "Olá! Mensagem de teste"
        }
      }]
    }]
  }'
```

### Teste 3: Verificar se salvou no banco

```bash
# Acessar API de conversas
curl http://localhost:3000/api/messages/conversations

# Deve mostrar a mensagem de teste
```

---

## 📊 MONITORAMENTO

### Ver logs em tempo real:

```bash
# Logs do servidor
npm run dev

# Ou logs de produção (Vercel)
vercel logs

# Ou logs (Firebase)
firebase functions:log
```

### Verificar mensagens no banco:

```bash
# Via Prisma Studio
npx prisma studio

# Navegue até a tabela "Message"
```

---

## 🔐 SEGURANÇA

### Validação adicional (opcional mas recomendado):

Para Facebook/Instagram/WhatsApp, adicione validação de assinatura:

```typescript
import crypto from "crypto";

function validateSignature(signature: string, body: string, secret: string): boolean {
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
    
    return signature === `sha256=${expectedSignature}`;
}

// No webhook:
const signature = request.headers.get("x-hub-signature-256");
const rawBody = await request.text();

if (!validateSignature(signature, rawBody, FACEBOOK_APP_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
}
```

---

## 🎯 PRÓXIMOS PASSOS

### 1. ✅ Webhooks implementados (FEITO)
   - Facebook ✅
   - Instagram ✅
   - Twitter ✅
   - WhatsApp ✅

### 2. 🔄 Configurar nas plataformas (FAZER AGORA)
   - Seguir guias acima para cada plataforma
   - Adicionar tokens no `.env.local`
   - Verificar webhooks

### 3. 🧪 Testar (FAZER DEPOIS)
   - Enviar mensagens de teste
   - Verificar se aparecem no banco
   - Verificar se aparecem no painel admin

### 4. 🚀 Deploy produção (FINAL)
   - Deploy com domínio HTTPS
   - Atualizar URLs dos webhooks nas plataformas
   - Testar em produção

---

## ❓ TROUBLESHOOTING

### Problema: "Webhook verification failed"
**Solução:** Verificar se o `VERIFY_TOKEN` no `.env` é exatamente o mesmo configurado na plataforma.

### Problema: "404 Not Found"
**Solução:** Verificar se a rota está correta e se o servidor está rodando.

### Problema: "Mensagens não aparecem no painel"
**Solução:** 
1. Verificar logs do servidor
2. Verificar se mensagens foram salvas no banco (Prisma Studio)
3. Verificar API `/api/messages/conversations`

### Problema: "Twitter CRC challenge failed"
**Solução:** Verificar se `TWITTER_CONSUMER_SECRET` está correto no `.env`.

### Problema: "WhatsApp signature validation failed"
**Solução:** Implementar validação de assinatura (ver seção Segurança).

---

## 📚 DOCUMENTAÇÃO OFICIAL

- **Facebook Messenger:** https://developers.facebook.com/docs/messenger-platform/webhooks
- **Instagram:** https://developers.facebook.com/docs/messenger-platform/instagram
- **Twitter:** https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api
- **WhatsApp:** https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Criar rotas de webhook (4/4)
- [ ] Adicionar tokens no `.env.local`
- [ ] Deploy da aplicação (produção ou túnel)
- [ ] Configurar webhook no Facebook
- [ ] Configurar webhook no Instagram
- [ ] Configurar webhook no Twitter
- [ ] Configurar webhook no WhatsApp
- [ ] Testar recebimento de mensagens
- [ ] Verificar mensagens no banco de dados
- [ ] Verificar mensagens no painel admin

---

**🎉 PRÓXIMO PASSO:** Configure as variáveis de ambiente e faça o deploy!
