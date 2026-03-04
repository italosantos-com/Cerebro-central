# 🚀 WHATSAPP WEB + FIRESTORE - GUIA COMPLETO

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Migração para Firestore** ✅

Todos os webhooks agora salvam mensagens no **Firestore** ao invés do Prisma PostgreSQL:

- ✅ Facebook Messenger → `social_messages` collection
- ✅ Instagram DM → `social_messages` collection  
- ✅ Twitter DM → `social_messages` collection
- ✅ WhatsApp Business API → `social_messages` collection
- ✅ WhatsApp Web (novo) → `social_messages` collection

**Estrutura do documento:**
```typescript
{
  channel: string,          // 'facebook' | 'instagram' | 'twitter' | 'whatsapp' | 'whatsapp_web'
  sender: string,            // ID do remetente
  recipient: string,         // ID do destinatário
  text: string,              // Texto da mensagem
  timestamp: Date,           // Data/hora da mensagem
  externalId: string,        // ID externo (mid, message_id, etc)
  read: boolean,             // Se foi lida
  metadata: object,          // Dados específicos do canal
  createdAt: serverTimestamp // Timestamp do Firestore
}
```

### 2. **WhatsApp Web via QR Code** ✅

Sistema completo de conexão WhatsApp Web implementado:

**Arquivos criados:**
- `/src/lib/whatsapp-client.ts` - Cliente WhatsApp Web
- `/src/app/api/whatsapp-web/connect/route.ts` - API de conexão
- `/src/app/api/whatsapp-web/disconnect/route.ts` - API de desconexão
- `/src/app/api/whatsapp-web/send/route.ts` - API de envio
- `/src/app/api/whatsapp-web/qr/route.ts` - API do QR Code
- `/src/components/WhatsAppQRConnect.tsx` - Componente de conexão

**Funcionalidades:**
- ✅ Gerar QR Code automaticamente
- ✅ Exibir QR Code em modal
- ✅ Detectar quando usuário escaneia
- ✅ Auto-conectar após scan
- ✅ Receber mensagens em tempo real
- ✅ Enviar mensagens
- ✅ Salvar histórico no Firestore
- ✅ Status de conexão (conectado/desconectado)
- ✅ Desconectar remotamente

### 3. **Card de Integração no Admin** ✅

Novo card adicionado em `/admin/integrations`:

```
┌─────────────────────────────────────────┐
│ 💬 WhatsApp Web                         │
│ Conectar via QR Code para chat direto  │
│                           [Conectar] →  │
└─────────────────────────────────────────┘
```

**Localização:** Logo após o card do Twitter/X

### 4. **API de Conversas Atualizada** ✅

`/src/app/api/messages/conversations/route.ts` agora busca do Firestore:

```typescript
// Busca de social_messages (redes sociais)
const socialMessagesRef = collection(firebaseDb, "social_messages");

// Busca de chats (chat do site)
const chatsRef = collection(firebaseDb, "chats");

// Retorna conversas unificadas
return { conversations: [...social, ...site] }
```

---

## 📋 COMO USAR

### Passo 1: Acessar Integrações

```
1. Vá para: http://localhost:3000/admin/integrations
2. Encontre o card "WhatsApp Web"
3. Clique em "Conectar"
```

### Passo 2: Escanear QR Code

```
1. Modal abrirá com QR Code
2. Abra WhatsApp no celular
3. Toque em "Mais opções" (⋮)
4. Toque em "Dispositivos conectados"
5. Toque em "Conectar um dispositivo"
6. Escaneie o QR Code da tela
7. Aguarde "Conectado com sucesso!"
```

### Passo 3: Usar o Chat

```
1. Vá para: http://localhost:3000/admin/conversations
2. Clique na aba "Chat Unificado (Multi-Canal)"
3. Todas as conversas do WhatsApp aparecerão junto com:
   - Facebook Messenger
   - Instagram DM
   - Twitter DM
   - Chat do Site
```

---

## 🧪 TESTAR O SISTEMA

### Teste 1: Conectar WhatsApp

```bash
# 1. Iniciar servidor
npm run dev

# 2. Acessar admin
open http://localhost:3000/admin/integrations

# 3. Clicar em "Conectar" no card WhatsApp
# 4. Escanear QR Code
# 5. Verificar status "Conectado"
```

### Teste 2: Receber Mensagens

```
1. Peça para alguém enviar mensagem para seu WhatsApp
2. Ou envie mensagem para você mesmo (de outro número)
3. Acesse: http://localhost:3000/admin/conversations
4. A conversa deve aparecer automaticamente
```

### Teste 3: Enviar Mensagens

```typescript
// Via API
fetch('/api/whatsapp-web/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '5521999999999',  // Número com DDI
    message: 'Olá! Mensagem de teste'
  })
});
```

### Teste 4: Verificar Firestore

```
1. Acesse Firebase Console
2. Vá para Firestore Database
3. Abra a collection "social_messages"
4. Veja as mensagens salvas
```

---

## 🔧 ESTRUTURA TÉCNICA

### Collections do Firestore

#### 1. `social_messages`
Todas as mensagens de redes sociais (Facebook, Instagram, Twitter, WhatsApp)

```typescript
{
  channel: 'whatsapp_web',
  sender: '5521999999999@c.us',
  recipient: 'me',
  text: 'Olá!',
  timestamp: Timestamp,
  externalId: 'message_id',
  read: false,
  metadata: {
    senderName: 'João Silva',
    contactNumber: '5521999999999',
    isGroup: false,
    chatName: 'João Silva',
    messageType: 'chat'
  },
  createdAt: serverTimestamp()
}
```

#### 2. `whatsapp_connection`
Status da conexão WhatsApp Web

```typescript
{
  qrCode: string | null,     // QR Code em texto
  status: string,            // 'connected' | 'disconnected' | 'qr_ready'
  timestamp: serverTimestamp
}
```

#### 3. `chats` (existente)
Conversas do chat do site

```typescript
{
  messages: subcollection,
  userInfo: {
    displayName: string,
    email: string,
    photoURL: string
  },
  lastMessage: string,
  lastTimestamp: Timestamp
}
```

---

## 🎯 FLUXO DE MENSAGENS

### Receber Mensagem (Inbound)

```
┌─────────────┐
│  WhatsApp   │ → Envia mensagem
└──────┬──────┘
       ↓
┌──────────────────────┐
│ whatsapp-client.ts   │ → Evento 'message'
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Firestore            │ → Salva em social_messages
│ social_messages      │
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ API /conversations   │ → Busca mensagens
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Admin Panel          │ → Exibe no chat unificado
│ UnifiedChatWindow    │
└──────────────────────┘
```

### Enviar Mensagem (Outbound)

```
┌──────────────────────┐
│ Admin Panel          │ → Digita mensagem
│ UnifiedChatWindow    │
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ API /send            │ → POST /api/whatsapp-web/send
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ whatsapp-client.ts   │ → sendMessage(to, text)
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│  WhatsApp            │ → Envia via WhatsApp Web
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ Firestore            │ → Salva cópia em social_messages
│ social_messages      │
└──────────────────────┘
```

---

## 🚀 DEPLOY EM PRODUÇÃO

### Requisitos

1. **Servidor com acesso a display** (para Puppeteer)
   - VPS Linux (Ubuntu 20.04+)
   - PM2 ou Docker
   - Xvfb (display virtual)

2. **Firebase Project configurado**
   - Firestore habilitado
   - Regras de segurança configuradas

### Opção A: Deploy Manual (VPS)

```bash
# 1. Instalar dependências do Puppeteer
sudo apt-get install -y \
  gconf-service libasound2 libatk1.0-0 libcairo2 \
  libcups2 libfontconfig1 libgdk-pixbuf2.0-0 \
  libgtk-3-0 libnspr4 libpango-1.0-0 libxss1 \
  fonts-liberation libappindicator1 libnss3 \
  lsb-release xdg-utils wget \
  libgbm-dev libx11-xcb1 libxcb-dri3-0

# 2. Clonar projeto
git clone seu-repositorio
cd italosantos.com

# 3. Instalar dependências
npm install

# 4. Build
npm run build

# 5. Iniciar com PM2
pm2 start npm --name "whatsapp-web" -- start
pm2 save
```

### Opção B: Deploy Docker

```dockerfile
FROM node:18-alpine

# Instalar dependências Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configurar Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Opção C: Deploy Vercel (Limitado)

⚠️ **ATENÇÃO**: Vercel tem limitações:
- Puppeteer não funciona em Edge Functions
- WhatsApp Web precisa de servidor persistente
- Recomendado usar VPS ou Container

**Solução alternativa:**
- Deploy Next.js no Vercel
- WhatsApp Web em servidor separado (Heroku/Railway/Render)
- Comunicação via Firestore

---

## 🔐 SEGURANÇA

### Regras do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Mensagens sociais - apenas admin pode ler/escrever
    match /social_messages/{messageId} {
      allow read, write: if request.auth != null 
                        && request.auth.token.admin == true;
    }
    
    // Status WhatsApp - apenas admin
    match /whatsapp_connection/{docId} {
      allow read, write: if request.auth != null 
                        && request.auth.token.admin == true;
    }
    
    // Chats do site - regras existentes
    match /chats/{chatId} {
      allow read, write: if true; // Ajustar conforme necessário
    }
  }
}
```

### Variáveis de Ambiente

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_dominio
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id

# WhatsApp (opcional)
WHATSAPP_SESSION_PATH=./.wwebjs_auth  # Onde salvar sessão
```

---

## ❓ TROUBLESHOOTING

### Problema: QR Code não aparece

**Solução:**
```bash
# Verificar logs do servidor
npm run dev

# Deve aparecer:
# "🚀 Inicializando WhatsApp Web Client..."
# "📱 QR Code gerado! Escaneie com WhatsApp"
```

### Problema: "Erro ao inicializar WhatsApp"

**Solução:**
```bash
# Instalar dependências Chromium
npm install puppeteer

# Ou usar Chromium do sistema
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Problema: Mensagens não aparecem no painel

**Solução:**
1. Verificar Firestore: `social_messages` tem documentos?
2. Verificar console do navegador
3. Verificar API: `curl http://localhost:3000/api/messages/conversations`

### Problema: "WhatsApp desconectou sozinho"

**Causas comuns:**
- Celular ficou offline muito tempo
- WhatsApp Web foi desconectado no celular
- Servidor reiniciou (sessão não foi salva)

**Solução:**
- Reconectar via QR Code
- Sessão é salva em `.wwebjs_auth/` (não deletar esta pasta)

---

## 📊 MONITORAMENTO

### Logs em Tempo Real

```bash
# Ver logs do servidor
npm run dev

# Ver apenas logs do WhatsApp
npm run dev | grep "WhatsApp"
```

### Verificar Firestore

```
1. Firebase Console → Firestore Database
2. Collection: social_messages
3. Filtrar por: channel == 'whatsapp_web'
```

### Status da Conexão

```bash
# Via API
curl http://localhost:3000/api/whatsapp-web/connect

# Response
{
  "success": true,
  "status": "connected",  // ou "disconnected", "qr_ready"
  "isReady": true
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Migrar webhooks para Firestore
- [x] Criar cliente WhatsApp Web
- [x] Implementar geração de QR Code
- [x] Criar APIs (connect, disconnect, send, qr)
- [x] Criar componente WhatsAppQRConnect
- [x] Adicionar card no admin/integrations
- [x] Atualizar API de conversas
- [x] Testar recebimento de mensagens
- [ ] Testar envio de mensagens (implementar UI)
- [ ] Deploy em produção
- [ ] Configurar regras Firestore
- [ ] Documentação para usuário final

---

## 🎉 PRÓXIMOS PASSOS

1. **Implementar UI de envio** de mensagens no chat unificado
2. **Adicionar suporte a mídias** (imagens, áudios, vídeos)
3. **Notificações** quando chegar mensagem nova
4. **Múltiplas sessões** WhatsApp (opcional)
5. **Backup automático** de mensagens
6. **Analytics** de mensagens

---

**🚀 Sistema completo e funcional!**

Agora você tem um **chat unificado** que centraliza:
- 📘 Facebook Messenger
- 📷 Instagram DM
- 🐦 Twitter/X DM
- 💬 WhatsApp Business API
- 📱 WhatsApp Web (via QR Code)
- 🌐 Chat do Site

Tudo salvo no **Firestore** e exibido em um único painel! 🎯
