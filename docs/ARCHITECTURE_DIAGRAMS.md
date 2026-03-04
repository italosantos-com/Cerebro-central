# 📊 Visualização da Arquitetura Multi-Admin

## 1. Estrutura de URLs

```
https://italosantos.com/
│
├── /                           # Home principal
│   └── Página pública com lista de admins
│
├── /admin                       # Admin autenticado (qualquer admin)
│   ├── /dashboard              # Estatísticas isoladas
│   ├── /conversations          # Conversas do admin
│   ├── /photos                 # Fotos do admin
│   ├── /videos                 # Vídeos do admin
│   ├── /products               # Produtos do admin
│   ├── /subscribers            # Assinantes do admin
│   ├── /reviews                # Avaliações do admin
│   ├── /integrations           # Integrações do admin
│   └── /settings               # Configurações do admin
│
├── /italo                       # Perfil público do Italo
│   ├── /                        # Página de perfil com fotos/videos públicos
│   ├── /galeria                # Galeria de fotos públicas
│   ├── /videos                 # Vídeos públicos
│   ├── /chat                   # Chat com Italo (assinantes)
│   ├── /assinaturas            # Planos de assinatura
│   └── /sobre                  # Bio e informações
│
├── /lucas                       # Perfil público do Lucas
│   └── (mesma estrutura que /italo)
│
└── /pedro                       # Perfil público do Pedro
    └── (mesma estrutura que /italo)
```

## 2. Fluxo de Dados - Architeto Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE BROWSER                          │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─── Autenticação Firebase ──┐
             │                            │
             ▼                            │
   ┌──────────────────┐                   │
   │  AdminContext    │                   │
   │ ├ adminUid       │◄──────────────────┘
   │ ├ adminSlug      │
   │ └ isAdmin        │
   └────────┬─────────┘
            │
            ├─── useAdminConversations()
            ├─── useAdminPhotos()
            ├─── useAdminVideos()
            └─── useAdminData()
                 │
                 ▼
   ┌──────────────────────────────┐
   │    FIRESTORE (Web SDK)       │
   │                              │
   │  admins/{uid}/conversations  │
   │  admins/{uid}/photos         │
   │  admins/{uid}/videos         │
   │  admins/{uid}/products       │
   │  ...                         │
   │                              │
   │  Security Rules validam      │
   │  request.auth.uid == uid     │
   └──────────────────────────────┘
```

## 3. Fluxo de Requisição com Isolamento

```
Admin A quer criar uma foto:

1. Admin A (uid=aaa) clica em "Enviar Foto"
   │
   ├─► POST /api/admin/photos
   │   └─ Headers: Authorization: Bearer {token_aaa}
   │
   ▼
2. Middleware: extractAdminUidFromRequest()
   │
   ├─► Valida token
   ├─► Extrai uid = "aaa"
   └─► Valida claim admin === true
   │
   ▼
3. Handler: withAdminAuth(async (request, { adminUid }) => {
   │
   ├─► adminUid = "aaa" ✓
   ├─► const photosRef = collection(db, 'admins', adminUid, 'photos')
   │   └─ Resultado: admins/aaa/photos
   │
   ├─► await addDoc(photosRef, { ...data, adminUid: 'aaa' })
   │
   ▼
4. Firestore salva em: admins/aaa/photos/photo-1
   │
   ├─► Valida Security Rule:
   │   match /admins/{adminUid}/photos/{photoId} {
   │     allow write: if request.auth.uid == adminUid
   │   }
   │   ✓ request.auth.uid (aaa) == adminUid (aaa) → PERMITIDO
   │
   ▼
5. Admin A agora enxerga a foto em:
   ├─ useAdminPhotos() retorna fotos de admins/aaa/photos
   ├─ GET /admin/photos mostra admins/aaa/photos
   └─ /:username/galeria mostra admins/aaa/photos com visibility='public'

─────────────────────────────────────────────────────────────

Admin B (uid=bbb) NÃO consegue acessar:

1. Admin B tenta: GET /api/admin/photos?adminUid=aaa
   │
   ├─► Middleware extrai uid = "bbb"
   │
   ▼
2. Query: db.collection('admins').doc('aaa').collection('photos')
   │
   ├─► Valida: request.auth.uid (bbb) == adminUid (aaa)
   │   ✗ bbb ≠ aaa → NEGADO
   │
   ▼
3. Firestore retorna: PERMISSION_DENIED

Resultado: Admin B nunca consegue ver dados de Admin A ✓
```

## 4. Estrutura Firestore

```
firestore/
│
├── 📁 admins/
│   ├── 📁 uid_aaa (Italo)
│   │   ├── 📄 metadata
│   │   │   └── name, email, username, avatar, bio
│   │   │
│   │   ├── 📁 profile/
│   │   │   └── 📄 settings
│   │   │       └── theme, colors, logo, bio, links
│   │   │
│   │   ├── 📁 conversations/
│   │   │   ├── 📄 conv-1
│   │   │   │   └── title, visibility, createdAt
│   │   │   │
│   │   │   ├── 📁 conv-1/messages/
│   │   │   │   ├── 📄 msg-1
│   │   │   │   ├── 📄 msg-2
│   │   │   │   └── 📄 msg-3
│   │   │   │
│   │   │   └── 📄 conv-2
│   │   │
│   │   ├── 📁 photos/
│   │   │   ├── 📄 photo-1 (visibility: public)
│   │   │   ├── 📄 photo-2 (visibility: subscribers)
│   │   │   └── 📄 photo-3 (visibility: private)
│   │   │
│   │   ├── 📁 videos/
│   │   │   ├── 📄 video-1 (visibility: public)
│   │   │   └── 📄 video-2 (visibility: subscribers)
│   │   │
│   │   ├── 📁 products/
│   │   │   ├── 📄 prod-1
│   │   │   └── 📄 prod-2
│   │   │
│   │   ├── 📁 subscribers/
│   │   │   ├── 📄 user-123
│   │   │   │   └── planId, status, expiresAt
│   │   │   │
│   │   │   └── 📄 user-456
│   │   │
│   │   ├── 📁 reviews/
│   │   │   ├── 📄 review-1 (status: pending)
│   │   │   └── 📄 review-2 (status: approved)
│   │   │
│   │   ├── 📁 uploads/
│   │   │   ├── 📄 file-1
│   │   │   └── 📄 file-2
│   │   │
│   │   └── 📁 integrations/
│   │       ├── 📄 stripe
│   │       ├── 📄 paypal
│   │       └── 📄 whatsapp
│   │
│   ├── 📁 uid_bbb (Lucas)
│   │   └── (mesma estrutura)
│   │
│   └── 📁 uid_ccc (Pedro)
│       └── (mesma estrutura)
│
├── 📁 users/
│   ├── 📁 user-123
│   │   ├── 📄 profile
│   │   └── 📄 subscriptions
│   │       └── { uid_aaa: { planId, status }, uid_bbb: {...} }
│   │
│   └── 📁 user-456
│       └── ...
│
└── 📁 public-profiles/
    ├── 📁 italo/
    │   ├── 📄 metadata
    │   └── 📄 stats
    │
    ├── 📁 lucas/
    │   └── ...
    │
    └── 📁 pedro/
        └── ...
```

## 5. Exemplo de Query por Admin

### Query 1: Listar conversas do Italo (Admin autenticado)

```typescript
// Cliente (useAdminConversations hook)
const { adminUid } = useAdminContext(); // "uid_aaa"
const conversationsRef = collection(db, 'admins', adminUid, 'conversations');
// Path: admins/uid_aaa/conversations
const q = query(conversationsRef, orderBy('createdAt', 'desc'));
const snapshot = await getDocs(q);

// Resultado: 5 conversas (todas do Italo)
```

### Query 2: Listar fotos públicas do Lucas (Visitante)

```typescript
// Cliente (página pública /lucas)
const adminUid = await resolveAdminUidBySlug('lucas'); // "uid_bbb"
const photosRef = collection(db, 'admins', adminUid, 'photos');
// Path: admins/uid_bbb/photos
const q = query(
  photosRef,
  where('visibility', '==', 'public'),
  orderBy('createdAt', 'desc')
);
const snapshot = await getDocs(q);

// Resultado: 8 fotos públicas (apenas do Lucas, filtradas)
```

### Query 3: Listar vídeos para assinantes do Pedro

```typescript
// Cliente (página /pedro com usuário autenticado como assinante)
const adminUid = await resolveAdminUidBySlug('pedro'); // "uid_ccc"
const photosRef = collection(db, 'admins', adminUid, 'videos');

// Verificar se é assinante
const isSubscriber = await checkSubscription(currentUser.uid, adminUid);

const q = query(
  photosRef,
  where('visibility', 'in', isSubscriber ? ['public', 'subscribers'] : ['public']),
  orderBy('createdAt', 'desc')
);
const snapshot = await getDocs(q);

// Resultado:
// - Visitante: 3 vídeos públicos
// - Assinante: 3 públicos + 5 para assinantes = 8 vídeos
```

## 6. Tabela de Permissões

| Ação | Admin A | Admin B | Visitante | Assinante de A |
|------|---------|---------|-----------|---|
| Ver dashboard próprio | ✅ | ❌ | ❌ | ❌ |
| Ver dados privados | ✅ | ❌ | ❌ | ❌ |
| Ver fotos públicas | ❌ | ❌ | ✅ | ✅ |
| Ver fotos subscribers | ❌ | ❌ | ❌ | ✅ |
| Editar perfil próprio | ✅ | ❌ | ❌ | ❌ |
| Deletar foto própria | ✅ | ❌ | ❌ | ❌ |
| Criar assinante | ✅ | ❌ | ❌ | ❌ |
| Ver conversas públicas | ✅ | ✅ | ✅ | ✅ |
| Participar de conversa | Dono | ❌ | ✅* | ✅* |

\* Se conversa tem visibility='public' ou é assinante e visibility='subscribers'

## 7. Exemplo de Componente Isolado

```typescript
// src/app/admin/fotos/page.tsx
'use client';

import { useAdminPhotos } from '@/hooks/useAdminData';
import { useAdminContext } from '@/context/AdminContext';

export default function AdminPhotosPage() {
  const { adminUid, isAdmin } = useAdminContext();
  const { data: photos, loading, error, hasMore, nextPage } = useAdminPhotos('public');

  if (!isAdmin) {
    return <div>Acesso negado</div>;
  }

  return (
    <div>
      <h1>Minhas Fotos Públicas</h1>
      <p>Admin UID: {adminUid}</p>

      {loading && <p>Carregando...</p>}
      {error && <p>Erro: {error.message}</p>}

      <div className="grid">
        {photos.map(photo => (
          <div key={photo.id} className="card">
            <img src={photo.imageUrl} alt={photo.title} />
            <h3>{photo.title}</h3>
            <p>{photo.visibility}</p>
          </div>
        ))}
      </div>

      {hasMore && <button onClick={nextPage}>Carregar mais</button>}
    </div>
  );
}

// Resultado:
// ✅ Mostra APENAS fotos públicas do admin autenticado
// ✅ Isolamento automático via useAdminPhotos(adminUid)
// ✅ Sem acesso a fotos de outros admins
```

## 8. Diagrama de Fluxo de Autenticação

```
┌──────────────────────────────────────────────┐
│ Visitante acessa /italo                      │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Resolver adminUid    │
        │ por slug "italo"     │
        └──────┬───────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ Buscar perfil público│
        │ admins/aaa/profile   │
        └──────┬───────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ Verificar isPublic   │
        │ ou request autenticado
        └──────┬───────────────┘
               │
               ├─ SIM → Mostrar perfil
               │
               └─ NÃO → Esconder dados privados
                       (mostrar apenas públicos)

────────────────────────────────────

┌──────────────────────────────────────────────┐
│ Admin "Italo" (uid=aaa) faz login            │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Firebase Auth        │
        │ signInWithEmail()    │
        └──────┬───────────────┘
               │
               ▼
        ┌──────────────────────┐
        │ getIdTokenResult()   │
        │ Verifica claim admin │
        └──────┬───────────────┘
               │
               ├─ admin === true → Ir para /admin
               │
               └─ admin === false → Ir para /
```

## 9. Exemplo de Erro de Isolamento (Evitar isso!)

```typescript
// ❌ ERRADO: Não filtra por adminUid
const allPhotos = await db.collection('photos').get();
// Problema: Retorna TODAS as fotos, não só do admin autenticado

// ✅ CORRETO: Filtra por adminUid
const adminPhotos = await db
  .collection('admins')
  .doc(adminUid)
  .collection('photos')
  .get();
// Resultado: Apenas fotos do admin autenticado

// Ou alternativa correta com where:
const adminPhotos2 = await db
  .collection('photos')
  .where('adminUid', '==', adminUid)
  .get();
// Resultado: Mesmo que acima
```

## 10. Performance e Índices Recomendados

```
Collection: admins/{adminUid}/conversations
Index 1:
- updatedAt DESC
- Status: Enabled

Collection: admins/{adminUid}/photos
Index 2:
- visibility ASC
- createdAt DESC
- Status: Enabled

Collection: admins/{adminUid}/videos
Index 3:
- visibility ASC
- createdAt DESC
- Status: Enabled

Collection: admins/{adminUid}/subscribers
Index 4:
- status ASC
- createdAt DESC
- Status: Enabled
```

**Tempo estimado de query com índices**: <500ms
**Tempo estimado sem índices**: >2000ms

---

**Próximo**: Veja `ROADMAP_MULTI_ADMIN.md` para saber por onde começar! 🚀
