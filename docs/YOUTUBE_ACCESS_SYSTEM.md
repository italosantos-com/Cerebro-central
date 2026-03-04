# Sistema de Acesso Automático a Vídeos Privados +18 do YouTube

## 🎯 Visão Geral

Sistema que gerencia automaticamente o acesso a vídeos privados +18 do YouTube baseado no status de assinatura dos usuários.

## ✅ Componentes Implementados

### 1. **Schema Prisma** (`prisma/schema.prisma`)
- ✅ Modelo `Subscription`: Gerencia assinaturas Stripe
- ✅ Modelo `YouTubePrivateVideoAccess`: Lista de emails autorizados

### 2. **Cloud Functions** (`functions/src/subscriptions/syncYouTubeAccess.ts`)
- ✅ Sincronização automática via Firestore triggers
- ✅ Função HTTP para sincronização manual (admins)
- ✅ Scheduled function (diariamente às 3h)

### 3. **Serviço** (`src/services/youtubeAccessService.ts`)
- ✅ `checkAccess(email)`: Verifica se email tem acesso
- ✅ `getAuthorizedEmails()`: Lista todos os emails autorizados
- ✅ `grantAccess()`: Concede acesso manualmente
- ✅ `revokeAccess()`: Revoga acesso manualmente
- ✅ `syncWithActiveSubscriptions()`: Sincroniza com assinaturas ativas
- ✅ `exportAuthorizedEmailsList()`: Exporta lista em texto

### 4. **Webhook Stripe** (`src/app/api/webhooks/stripe/route.ts`)
- ✅ Escuta eventos do Stripe
- ✅ Atualiza acesso automaticamente quando:
  - Assinatura é criada/atualizada
  - Assinatura é cancelada
  - Pagamento é bem-sucedido
  - Pagamento falha

### 5. **APIs REST**

#### `/api/youtube/check-access`
```bash
# GET - Verifica acesso de um email
curl "https://seu-dominio.com/api/youtube/check-access?email=user@example.com"

# POST - Lista todos os autorizados (admin)
curl -X POST https://seu-dominio.com/api/youtube/check-access \
  -H "Content-Type: application/json" \
  -d '{"adminToken": "seu-token-secreto"}'
```

#### `/api/youtube/sync`
```bash
# POST - Sincroniza manualmente (admin)
curl -X POST https://seu-dominio.com/api/youtube/sync \
  -H "Content-Type: application/json" \
  -d '{"adminToken": "seu-token-secreto"}'
```

## 🚀 Setup

### 1. Configurar variáveis de ambiente (.env)
```env
# Banco de dados
POSTGRES_URL="postgresql://..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Admin
ADMIN_SECRET_TOKEN="seu-token-super-secreto"
```

### 2. Aplicar mudanças no Prisma
```bash
npx prisma generate
npx prisma migrate dev --name add_youtube_access
```

### 3. Configurar Webhook no Stripe

1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique em "Add endpoint"
3. URL: `https://seu-dominio.com/api/webhooks/stripe`
4. Selecione eventos:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copie o "Signing secret" para `STRIPE_WEBHOOK_SECRET`

### 4. Deploy das Cloud Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

## 📊 Fluxo Automático

```
1. Usuário assina → Webhook Stripe → Cria Subscription → Concede acesso
2. Pagamento confirmado → Webhook Stripe → Mantém acesso
3. Pagamento falha → Webhook Stripe → Revoga acesso
4. Assinatura cancela → Webhook Stripe → Revoga acesso
5. Sincronização diária (3h) → Verifica todos e atualiza
```

## 🔍 Como Verificar

### Verificar se um email tem acesso:
```typescript
import { YouTubeAccessService } from '@/services/youtubeAccessService';

const hasAccess = await YouTubeAccessService.checkAccess('user@example.com');
console.log(hasAccess ? '✅ Tem acesso' : '🚫 Sem acesso');
```

### Obter lista completa:
```typescript
const emails = await YouTubeAccessService.getAuthorizedEmails();
console.log('Emails autorizados:', emails);
```

### Exportar como texto:
```typescript
const list = await YouTubeAccessService.exportAuthorizedEmailsList();
// Retorna:
// user1@example.com
// user2@example.com
// user3@example.com
```

## 🎮 Uso no Front-end

### Componente React de verificação:
```typescript
'use client';

import { useState } from 'react';

export function YouTubeAccessChecker() {
  const [email, setEmail] = useState('');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/youtube/check-access?email=${email}`);
      const data = await res.json();
      setHasAccess(data.hasAccess);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Digite seu email"
        className="border p-2 rounded"
      />
      <button
        onClick={checkAccess}
        disabled={loading}
        className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
      >
        {loading ? 'Verificando...' : 'Verificar Acesso'}
      </button>

      {hasAccess !== null && (
        <div className={`mt-4 p-4 rounded ${hasAccess ? 'bg-green-100' : 'bg-red-100'}`}>
          {hasAccess ? (
            <div>
              <span className="text-2xl">✅</span>
              <p>Você tem acesso aos vídeos privados +18!</p>
            </div>
          ) : (
            <div>
              <span className="text-2xl">🚫</span>
              <p>Você precisa de uma assinatura ativa para acessar.</p>
              <a href="/subscribe" className="text-blue-500 underline">
                Assinar agora
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 🔐 Segurança

- ✅ Webhook do Stripe verificado com signature
- ✅ API admin protegida com token secreto
- ✅ Prisma Client com conexão segura
- ✅ Cloud Functions requerem autenticação

## 📝 Status das Assinaturas

O sistema reconhece os seguintes status:
- `active` → ✅ Acesso concedido
- `trialing` → ✅ Acesso concedido
- `canceled` → 🚫 Acesso revogado
- `past_due` → 🚫 Acesso revogado
- `unpaid` → 🚫 Acesso revogado
- `incomplete` → 🚫 Sem acesso

## 🛠️ Manutenção

### Sincronização manual:
```bash
curl -X POST https://seu-dominio.com/api/youtube/sync \
  -H "Content-Type: application/json" \
  -d '{"adminToken": "seu-token-secreto"}'
```

### Ver logs:
```bash
# Cloud Functions
firebase functions:log

# API Routes (Vercel/Next.js)
vercel logs
```

## 🎉 Pronto!

Agora o sistema adiciona **automaticamente** usuários com assinatura ativa à lista de autorizados para assistir vídeos privados +18 do YouTube! 🚀
