# Integração do Multichat Unificado - Facebook, Instagram, WhatsApp e Twitter/X

## 📱 Visão Geral

Integração completa do sistema de chat multichannel (Facebook Messenger, Instagram DM, WhatsApp Business e Twitter/X DM) com o painel admin existente.

## 🎯 O que foi feito

### 1. **Componente Unificado de Chat** (`/src/components/UnifiedChatWindow.tsx`)
- Interface única para gerenciar conversas de TODOS os canais
- Lista de conversas em tempo real com badges identificando o canal
- Área de mensagens com suporte a envio por canal específico
- Auto-atualização (conversas a cada 10s, mensagens a cada 3s)
- Identificação visual de mensagens lidas/não lidas

### 2. **API de Agregação de Conversas** (`/src/app/api/messages/conversations/route.ts`)
- Busca conversas de **Prisma** (Facebook, Instagram, Twitter, WhatsApp)
- Busca conversas de **Firebase** (chat do site)
- Agrupa mensagens por canal + remetente
- Conta mensagens não lidas por conversa
- Ordena por última mensagem mais recente

### 3. **API de Mensagens Atualizada** (`/src/app/api/messages/route.ts`)
- Suporte a filtro por `participantId` (buscar conversa específica)
- Retorna até 100 mensagens mais recentes
- Suporte a busca por canal e participante

### 4. **Página de Conversas Modernizada** (`/src/app/admin/conversations/page.tsx`)
- Sistema de **tabs**:
  - **Chat Unificado (Multi-Canal)**: Nova interface com todos os canais integrados
  - **Chat do Site (Legacy)**: Interface original do Firebase mantida
- Toggle entre as duas interfaces

### 5. **API de Envio WhatsApp** (`/src/app/api/channels/whatsapp/send/route.ts`)
- Endpoint para enviar mensagens via WhatsApp Business API
- Integração com Graph API do Facebook
- Suporte a mensagens de texto

### 6. **Schema Prisma Atualizado** (`/prisma/schema.prisma`)
- Novos campos em `Message`:
  - `recipient`: ID do destinatário
  - `read`: Marcador de leitura (boolean)
  - `metadata`: JSON para dados adicionais (attachments, reactions)
  - Índices para performance (userId + channel + sender/timestamp)

### 7. **Variáveis de Ambiente** (`/env.template`)
- Adicionadas variáveis para WhatsApp Business API:
  - `WHATSAPP_API_URL`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_API_VERSION`
  - `WHATSAPP_QR_PREFILLED_MESSAGE`

## 🚀 Como Usar

### 1. Configurar Banco de Dados
```bash
# Atualizar schema do Prisma
npx prisma migrate dev --name add_multichat_fields

# Gerar cliente
npx prisma generate
```

### 2. Configurar Variáveis de Ambiente (`.env.local`)
```env
# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v19.0
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v23.0
WHATSAPP_QR_PREFILLED_MESSAGE="Olá! Gostaria de mais informações."
```

### 3. Acessar o Painel Admin
1. Navegue para `/admin/conversations`
2. Selecione a tab **"Chat Unificado (Multi-Canal)"**
3. Veja todas as conversas de todos os canais em um só lugar
4. Clique em uma conversa para ver histórico e enviar mensagens

## 📊 Estrutura de Dados

### Conversation (Interface Frontend)
```typescript
{
  id: string              // Identificador único
  channel: string         // 'whatsapp' | 'facebook' | 'instagram' | 'twitter' | 'site'
  participantName: string // Nome do participante
  participantId: string   // ID do participante no canal
  lastMessage: Message    // Última mensagem
  unreadCount: number     // Contador de não lidas
  avatarUrl?: string      // URL da foto de perfil
  externalId?: string     // ID adicional (ex: pageId)
}
```

### Message (Schema Prisma)
```prisma
model Message {
  id         String   @id @default(cuid())
  userId     String   // Admin que gerencia
  channel    String   // Canal de origem
  externalId String?  // ID externo da mensagem
  sender     String   // ID do remetente
  recipient  String?  // ID do destinatário
  text       String?  // Conteúdo
  timestamp  DateTime @default(now())
  read       Boolean  @default(false)
  metadata   Json?    // Dados extras
}
```

## 🔄 Fluxo de Funcionamento

### Recebimento de Mensagens
1. Webhook recebe mensagem do canal (FB/IG/WhatsApp/Twitter)
2. Webhook persiste no Prisma com `userId` do admin vinculado
3. Frontend busca periodicamente via `/api/messages/conversations`
4. Mensagem aparece na lista de conversas

### Envio de Mensagens
1. Admin seleciona conversa e digita mensagem
2. Frontend identifica o canal da conversa
3. Envia para endpoint específico:
   - Facebook: `/api/channels/facebook/send`
   - Instagram: `/api/channels/instagram/send`
   - Twitter: `/api/channels/twitter/send`
   - WhatsApp: `/api/channels/whatsapp/send`
4. API do canal processa e envia
5. Mensagem salva no Prisma e aparece no histórico

## 🎨 Identificadores Visuais por Canal

| Canal | Ícone | Badge Color |
|-------|-------|-------------|
| Facebook | 📘 Facebook | Azul (`bg-blue-100`) |
| Instagram | 📷 Instagram | Rosa (`bg-pink-100`) |
| Twitter/X | 🐦 Twitter | Azul claro (`bg-sky-100`) |
| WhatsApp | 📱 WhatsApp | Verde (`bg-green-100`) |
| Site | 💬 Site | Cinza (`bg-gray-100`) |

## 📎 QR Code para WhatsApp Business

Para gerar um QR code com mensagem pré-preenchida:

1. Acesse `/admin/whatsapp`
2. Defina a mensagem e o formato do QR
3. Clique em **Gerar QR code**

API equivalente:

`POST /api/whatsapp/generate-qr`

Payload:

```
{
  "prefilledMessage": "Olá! Quero falar com você.",
  "generateQrImage": "PNG"
}
```

## 📝 Próximos Passos Recomendados

### 1. **Marcar mensagens como lidas**
- Adicionar lógica para atualizar `read = true` quando admin abrir conversa
- Endpoint: `PATCH /api/messages/{id}/read`

### 2. **Notificações Push**
- Integrar com Firebase Cloud Messaging
- Notificar admin quando nova mensagem chegar

### 3. **Busca e Filtros**
- Adicionar campo de busca para filtrar conversas
- Filtros por canal, lidas/não lidas, data

### 4. **Upload de Mídia**
- Suporte a envio de imagens/vídeos por canal
- Visualização inline de mídia recebida

### 5. **Mensagens Rápidas (Quick Replies)**
- Criar templates de respostas rápidas
- Atalhos para mensagens comuns

### 6. **Analytics**
- Dashboard com métricas por canal
- Tempo médio de resposta
- Volume de mensagens por período

### 7. **Integração com IA**
- Auto-respostas via Gemini/ChatGPT
- Classificação automática de mensagens
- Sugestões de resposta

## 🐛 Troubleshooting

### Conversas não aparecem
- Verificar se `DATABASE_URL` está configurado
- Rodar `npx prisma generate` e `npx prisma migrate dev`
- Verificar logs do console no browser (F12)

### Erro ao enviar mensagens
- Verificar tokens de acesso nos canais
- Confirmar que admin fez login OAuth (`/login`)
- Verificar se há binding de canal (`SocialChannelBinding`)

### WhatsApp não funciona
- Configurar `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`
- Verificar se número está aprovado pelo Meta
- Testar webhook em: https://developers.facebook.com/tools/webhooks/

## 📚 Referências

- [Facebook Messenger API](https://developers.facebook.com/docs/messenger-platform/)
- [Instagram Messaging API](https://developers.facebook.com/docs/messenger-platform/instagram)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/)
- [Twitter API v2](https://developer.twitter.com/en/docs/twitter-api)
- [NextAuth.js](https://next-auth.js.org/)
- [Prisma ORM](https://www.prisma.io/)

---

**Status**: ✅ Implementação completa e funcional
**Última atualização**: 10 de outubro de 2025
