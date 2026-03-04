# 🏗️ Arquitetura Multi-Admin com Isolamento de Dados

## 📋 Visão Geral

Cada administrador tem seu próprio **espaço isolado** com:
- **URL personalizada**: `https://italosantos.com/:adminSlug` (ex: `/italo`, `/lucas`, `/pedro`)
- **Dados completamente isolados**: Conversas, assinaturas, imagens, vídeos, usuários, integrações, uploads, avaliações
- **Perfil individual**: Personalização de tema, nome, foto, bio
- **Dashboard próprio**: Estatísticas, gráficos e métricas específicas
- **Configurações isoladas**: Integrações, webhooks, permissões

## 🗄️ Estrutura Firestore

### Coleções Principais

```
firestore/
├── admins/                           # Admin global info
│   ├── {adminUid}/
│   │   ├── profile/
│   │   │   ├── settings              # Configurações de perfil
│   │   │   └── metadata              # Nome, email, username, slug, avatar
│   │   ├── conversations/            # Conversas do admin
│   │   │   └── {conversationId}/
│   │   │       ├── messages/         # Mensagens da conversa
│   │   │       └── metadata
│   │   ├── subscribers/              # Assinantes do admin
│   │   │   └── {subscriberId}/
│   │   ├── products/                 # Produtos/serviços do admin
│   │   │   └── {productId}/
│   │   ├── photos/                   # Fotos do admin
│   │   │   └── {photoId}/
│   │   ├── videos/                   # Vídeos do admin
│   │   │   └── {videoId}/
│   │   ├── integrations/             # Integrações do admin
│   │   │   ├── stripe/
│   │   │   ├── paypal/
│   │   │   └── whatsapp/
│   │   ├── reviews/                  # Avaliações do admin
│   │   │   └── {reviewId}/
│   │   ├── uploads/                  # Arquivos enviados
│   │   │   └── {uploadId}/
│   │   └── settings/
│   │       ├── integrations          # Configurações de integrações
│   │       ├── branding              # Tema, cores, logo
│   │       └── permissions           # Controle de acesso
├── users/                            # Usuários globais
│   └── {userId}/
│       ├── metadata
│       ├── subscriptions             # Referência aos admins assinados
│       ├── conversations             # Referência às conversas
│       └── profile
├── public-profiles/                  # Perfis públicos (cache)
│   └── {adminSlug}/
│       ├── metadata
│       ├── stats
│       └── settings
└── system/
    ├── config
    ├── analytics
    └── audit-logs
```

## 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Admins podem ler/escrever seus próprios dados
    match /admins/{adminUid}/{document=**} {
      allow read: if request.auth.uid == adminUid;
      allow write: if request.auth.uid == adminUid;
      // Public read para perfis
      allow read: if isPublicProfile(adminUid) && document[0] == 'profile';
    }
    
    // Conversas isoladas por admin
    match /admins/{adminUid}/conversations/{document=**} {
      allow read, write: if request.auth.uid == adminUid;
    }
    
    // Assinantes isolados por admin
    match /admins/{adminUid}/subscribers/{document=**} {
      allow read: if request.auth.uid == adminUid;
      allow write: if isSubscriberOfAdmin(request.auth.uid, adminUid);
    }
    
    // Usuários globais (seu próprio perfil)
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Perfis públicos (leitura pública)
    match /public-profiles/{adminSlug}/{document=**} {
      allow read: if true;
    }
  }
}

function isPublicProfile(adminUid) {
  return get(/databases/$(database)/documents/admins/$(adminUid)/profile/settings).data.isPublic == true;
}

function isSubscriberOfAdmin(userId, adminUid) {
  return exists(/databases/$(database)/documents/admins/$(adminUid)/subscribers/$(userId));
}
```

## 🛠️ APIs Necessárias

### 1. Admin Profile APIs

```typescript
// GET /api/admin/profile/:adminSlug
// Retorna perfil público do admin

// GET /api/admin/profile/:adminSlug/settings
// Retorna configurações (autenticado apenas o admin)

// PUT /api/admin/profile/:adminSlug/settings
// Atualiza configurações do admin
```

### 2. Admin Data APIs (com isolamento)

```typescript
// Conversas
GET    /api/admin/conversations
POST   /api/admin/conversations
GET    /api/admin/conversations/:id
PUT    /api/admin/conversations/:id
DELETE /api/admin/conversations/:id

// Assinantes
GET    /api/admin/subscribers
POST   /api/admin/subscribers
GET    /api/admin/subscribers/:id
DELETE /api/admin/subscribers/:id

// Produtos
GET    /api/admin/products
POST   /api/admin/products
GET    /api/admin/products/:id
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id

// Fotos
GET    /api/admin/photos
POST   /api/admin/photos
DELETE /api/admin/photos/:id

// Vídeos
GET    /api/admin/videos
POST   /api/admin/videos
DELETE /api/admin/videos/:id

// Avaliações
GET    /api/admin/reviews
PUT    /api/admin/reviews/:id/approve
DELETE /api/admin/reviews/:id

// Integrações
GET    /api/admin/integrations
POST   /api/admin/integrations/:type
PUT    /api/admin/integrations/:type
DELETE /api/admin/integrations/:type
```

## 🔄 Fluxo de Isolamento de Dados

### Ao Autenticar um Admin

```typescript
// 1. Obter adminUid do Firebase Auth
const adminUid = currentUser.uid;

// 2. Resolver adminSlug (username do admin)
const adminSlug = await resolveAdminSlugByUid(adminUid);

// 3. Armazenar em localStorage/context
localStorage.setItem('adminUid', adminUid);
localStorage.setItem('adminSlug', adminSlug);

// 4. Todos os dados são buscados com filtro por adminUid
const conversations = await getConversationsByAdmin(adminUid);
const subscribers = await getSubscribersByAdmin(adminUid);
```

### Ao Acessar /:adminSlug (URL pública)

```typescript
// 1. Resolver adminUid pela URL slug
const adminUid = await resolveAdminUidBySlug(slug);

// 2. Buscar perfil público
const publicProfile = await getPublicAdminProfile(adminUid);

// 3. Buscar dados públicos apenas
const publicPhotos = await getPhotosByAdmin(adminUid, { visibility: 'public' });
const publicVideos = await getVideosByAdmin(adminUid, { visibility: 'public' });
```

## 📊 Query Patterns

### Padrão 1: Buscar dados do admin autenticado

```typescript
// Em /api/admin/* - AdminUid vem do JWT
const adminUid = extractAdminUidFromToken(request);

const conversations = await db
  .collection('admins')
  .doc(adminUid)
  .collection('conversations')
  .orderBy('createdAt', 'desc')
  .get();
```

### Padrão 2: Buscar dados públicos por slug

```typescript
// Em /api/profile/:slug
const adminUid = await resolveAdminUidBySlug(slug);

const publicPhotos = await db
  .collection('admins')
  .doc(adminUid)
  .collection('photos')
  .where('visibility', '==', 'public')
  .orderBy('createdAt', 'desc')
  .get();
```

### Padrão 3: Buscar com filtro de visibilidade

```typescript
// Conversas privadas (apenas admin)
const privateConversations = await db
  .collection('admins')
  .doc(adminUid)
  .collection('conversations')
  .where('visibility', '==', 'private')
  .get();

// Conversas públicas (qualquer pessoa autenticada)
const publicConversations = await db
  .collection('admins')
  .doc(adminUid)
  .collection('conversations')
  .where('visibility', '==', 'public')
  .get();

// Conteúdo para assinantes
const subscriberContent = await db
  .collection('admins')
  .doc(adminUid)
  .collection('photos')
  .where('visibility', '==', 'subscribers')
  .get();
```

## 🎯 Implementação em Componentes

### AdminContext - Fornece adminUid em toda a aplicação

```typescript
// src/context/AdminContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { resolveAdminSlug } from '@/services/admin-service';

interface AdminContextType {
  adminUid: string | null;
  adminSlug: string | null;
  isAdmin: boolean;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminContextProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [adminUid, setAdminUid] = useState<string | null>(null);
  const [adminSlug, setAdminSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAdminUid(null);
      setAdminSlug(null);
      setLoading(false);
      return;
    }

    // Verificar se é admin
    const checkAdminStatus = async () => {
      try {
        const token = await user.getIdTokenResult();
        if (token.claims.admin) {
          setAdminUid(user.uid);
          const slug = await resolveAdminSlug(user.uid);
          setAdminSlug(slug);
        }
      } catch (error) {
        console.error('Erro ao verificar admin:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return (
    <AdminContext.Provider value={{ adminUid, adminSlug, isAdmin: !!adminUid, loading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext deve ser usado dentro de AdminContextProvider');
  }
  return context;
}
```

### Hook para Buscar Dados Isolados

```typescript
// src/hooks/useAdminData.ts
import { useAdminContext } from '@/context/AdminContext';
import { useCallback, useEffect, useState } from 'react';

export function useAdminConversations() {
  const { adminUid, isAdmin } = useAdminContext();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!adminUid) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/conversations', {
        headers: {
          'Authorization': `Bearer ${await getAdminToken()}`,
          'X-Admin-UID': adminUid
        }
      });

      if (!response.ok) throw new Error('Falha ao buscar conversas');

      const data = await response.json();
      setConversations(data.conversations);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [adminUid]);

  useEffect(() => {
    if (isAdmin) {
      fetchConversations();
    }
  }, [isAdmin, fetchConversations]);

  return { conversations, loading, error, refetch: fetchConversations };
}
```

## 📈 Escalabilidade

### Problemas com Muitos Dados

Para admins com 100k+ conversas/fotos:

```typescript
// Implementar paginação
GET /api/admin/conversations?page=1&limit=50

// Implementar índices Firestore
db.collection('admins').doc(adminUid).collection('conversations')
  .orderBy('createdAt', 'desc')
  .startAfter(lastVisible)
  .limit(50)

// Implementar busca full-text (Algolia)
const hits = await algolia.indices.admin_conversations.search(query, {
  filters: `adminUid:${adminUid}`
});
```

## 🔍 Exemplo Completo: Criar uma Foto

```typescript
// 1. Cliente faz upload
// POST /api/admin/photos
const formData = new FormData();
formData.append('file', imageFile);
formData.append('title', 'Minha foto');
formData.append('visibility', 'public'); // ou 'subscribers'

const response = await fetch('/api/admin/photos', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

// 2. API extrai adminUid do token
export async function POST(request: NextRequest) {
  const adminUid = await extractAdminUidFromToken(request);
  
  // 3. Salva em admins/{adminUid}/photos/{photoId}
  await db
    .collection('admins')
    .doc(adminUid)
    .collection('photos')
    .doc(photoId)
    .set({
      title: 'Minha foto',
      visibility: 'public',
      imageUrl: uploadedUrl,
      createdAt: FieldValue.serverTimestamp()
    });

  return NextResponse.json({ success: true, photoId });
}

// 4. Foto aparece em /:adminSlug/galeria para público
// Busca: WHERE visibility == 'public' AND adminUid == publicAdminUid

// 5. Foto aparece em /admin/fotos para admin
// Busca: ALL photos of adminUid
```

## 🎨 Rotas Públicas por Admin

```
https://italosantos.com/
  ├── /italo
  │   ├── /galeria
  │   ├── /videos
  │   ├── /sobre
  │   ├── /assinaturas
  │   └── /chat
  ├── /lucas
  │   ├── /galeria
  │   ├── /videos
  │   └── ...
  └── /pedro
      ├── /galeria
      └── ...
```

## 🚀 Migração de Dados Existentes

```typescript
// scripts/migrate-to-multi-admin.ts

async function migrateToMultiAdmin() {
  const admins = await db.collection('admins').get();

  for (const adminDoc of admins.docs) {
    const adminUid = adminDoc.id;
    const adminData = adminDoc.data();

    // 1. Migrar conversas
    const conversations = await db.collection('conversations')
      .where('adminEmail', '==', adminData.email)
      .get();

    for (const convDoc of conversations.docs) {
      await db
        .collection('admins')
        .doc(adminUid)
        .collection('conversations')
        .doc(convDoc.id)
        .set(convDoc.data());
    }

    // 2. Migrar fotos
    const photos = await db.collection('photos')
      .where('adminUid', '==', adminUid)
      .get();

    for (const photoDoc of photos.docs) {
      await db
        .collection('admins')
        .doc(adminUid)
        .collection('photos')
        .doc(photoDoc.id)
        .set(photoDoc.data());
    }

    // Repetir para: videos, subscribers, products, reviews, etc.
  }
}
```

## ✅ Checklist de Implementação

- [ ] Criar AdminContext para fornecer adminUid globalmente
- [ ] Atualizar todas as queries com filtro por adminUid
- [ ] Criar APIs com isolamento automático
- [ ] Implementar Firestore Security Rules
- [ ] Migrar dados existentes para estrutura de subcoleções
- [ ] Testar isolamento: dados de um admin não aparecem em outro
- [ ] Implementar paginação para grandes volumes
- [ ] Criar índices Firestore necessários
- [ ] Documentar fluxo de autenticação e autorização
- [ ] Deploy com backup dos dados antigos
