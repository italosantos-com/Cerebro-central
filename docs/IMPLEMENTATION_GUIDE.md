# 🛠️ Guia de Implementação: Sistema Multi-Admin

## Fase 1: Preparação da Estrutura de Dados

### 1.1 Atualizar Firestore Security Rules

Acessar [Firebase Console](https://console.firebase.google.com) > Firestore > Aba Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // === ADMINS: Dados isolados por UID ===
    match /admins/{adminUid}/{document=**} {
      // Admin pode ler/escrever seus próprios dados
      allow read, write: if request.auth.uid == adminUid;
      
      // Perfil público é legível publicamente
      allow read: if document == "profile" && 
                     resource.data.get("isPublic", false) == true;
    }
    
    // === CONVERSAS (Subcoleção de Admin) ===
    match /admins/{adminUid}/conversations/{conversationId}/{document=**} {
      allow read, write: if request.auth.uid == adminUid;
      allow read: if resource.data.get("visibility") == "public";
      allow read: if request.auth.uid in resource.data.get("participants", []);
    }
    
    // === ASSINANTES (Subcoleção de Admin) ===
    match /admins/{adminUid}/subscribers/{subscriberId}/{document=**} {
      allow read: if request.auth.uid == adminUid;
      allow write: if request.auth.uid == subscriberId;
    }
    
    // === FOTOS (Subcoleção de Admin) ===
    match /admins/{adminUid}/photos/{photoId}/{document=**} {
      allow read, write: if request.auth.uid == adminUid;
      allow read: if resource.data.get("visibility") == "public";
      allow read: if resource.data.get("visibility") == "subscribers" && 
                     exists(/databases/$(database)/documents/admins/$(adminUid)/subscribers/$(request.auth.uid));
    }
    
    // === VÍDEOS (Subcoleção de Admin) ===
    match /admins/{adminUid}/videos/{videoId}/{document=**} {
      allow read, write: if request.auth.uid == adminUid;
      allow read: if resource.data.get("visibility") == "public";
      allow read: if resource.data.get("visibility") == "subscribers" && 
                     exists(/databases/$(database)/documents/admins/$(adminUid)/subscribers/$(request.auth.uid));
    }
    
    // === PRODUTOS (Subcoleção de Admin) ===
    match /admins/{adminUid}/products/{productId}/{document=**} {
      allow read, write: if request.auth.uid == adminUid;
      allow read: if resource.data.get("isPublic", true) == true;
    }
    
    // === AVALIAÇÕES (Subcoleção de Admin) ===
    match /admins/{adminUid}/reviews/{reviewId}/{document=**} {
      allow read: if request.auth.uid == adminUid;
      allow read: if resource.data.get("status") == "approved";
      allow write: if request.auth.uid != adminUid; // Clientes criam avaliações
    }
    
    // === USUÁRIOS GLOBAIS ===
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // === PÚBLICOS (Qualquer pessoa) ===
    match /public-profiles/{adminSlug}/{document=**} {
      allow read: if true;
    }
  }
}
```

### 1.2 Criar Índices Firestore

Firebase criará índices automaticamente quando você executar queries complexas, mas você pode pré-criar:

Em **Firestore > Aba Indexes**, criar:

```
Collection: admins/{adminUid}/conversations
Fields: updatedAt DESC
Status: Enabled

Collection: admins/{adminUid}/photos
Fields: visibility ASC, createdAt DESC
Status: Enabled

Collection: admins/{adminUid}/videos
Fields: visibility ASC, createdAt DESC
Status: Enabled

Collection: admins/{adminUid}/subscribers
Fields: status ASC, createdAt DESC
Status: Enabled
```

## Fase 2: Implementação do Frontend

### 2.1 Envolver a Aplicação com AdminContextProvider

Em `src/app/layout.tsx`:

```typescript
import { AdminContextProvider } from '@/context/AdminContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <AdminContextProvider>
          {children}
        </AdminContextProvider>
      </body>
    </html>
  );
}
```

### 2.2 Usar Hooks em Componentes

Exemplo: Listar conversas do admin

```typescript
// src/app/admin/conversations/page.tsx
'use client';

import { useAdminConversations } from '@/hooks/useAdminData';
import { useAdminContext } from '@/context/AdminContext';

export default function ConversationsPage() {
  const { adminUid, isAdmin } = useAdminContext();
  const { data: conversations, loading, error, refetch } = useAdminConversations(20);

  if (!isAdmin) {
    return <div>Você não tem permissão para acessar esta página</div>;
  }

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      <h1>Minhas Conversas</h1>
      <button onClick={refetch}>Atualizar</button>

      <ul>
        {conversations.map(conv => (
          <li key={conv.id}>
            <h3>{conv.title}</h3>
            <p>{conv.description}</p>
            <small>{conv.visibility} | {conv.messageCount} mensagens</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 2.3 Usar Hooks para Fotos com Filtro de Visibilidade

```typescript
// src/app/admin/photos/page.tsx
'use client';

import { useAdminPhotos } from '@/hooks/useAdminData';
import { useState } from 'react';

export default function PhotosPage() {
  const [filter, setFilter] = useState<'public' | 'subscribers' | 'private'>('public');
  const { data: photos, loading, error } = useAdminPhotos(filter);

  return (
    <div>
      <h1>Fotos ({photos.length})</h1>

      <div>
        <button onClick={() => setFilter('public')}>Públicas</button>
        <button onClick={() => setFilter('subscribers')}>Assinantes</button>
        <button onClick={() => setFilter('private')}>Privadas</button>
      </div>

      {loading ? <p>Carregando...</p> : null}

      <div className="grid">
        {photos.map(photo => (
          <div key={photo.id} className="photo-card">
            <img src={photo.imageUrl} alt={photo.title} />
            <h3>{photo.title}</h3>
            <small>{filter}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Fase 3: Implementação do Backend

### 3.1 Atualizar Rotas de API

Converter rotas existentes para usar o novo middleware:

```typescript
// src/app/api/admin/photos/route.ts
import { withAdminAuth } from '@/lib/admin-api-middleware';
import { getAdminDb } from '@/lib/firebase-admin';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export const GET = withAdminAuth(async (request, { adminUid }) => {
  const db = getAdminDb();
  
  // Query automaticamente scoped para este admin
  const photosRef = collection(db, 'admins', adminUid, 'photos');
  const q = query(photosRef, orderBy('createdAt', 'desc'));
  
  const snapshot = await getDocs(q);
  const photos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return NextResponse.json({ success: true, photos });
});

export const POST = withAdminAuth(async (request, { adminUid }) => {
  const db = getAdminDb();
  const body = await request.json();

  // Salvar sempre com adminUid
  const photosRef = collection(db, 'admins', adminUid, 'photos');
  const docRef = await addDoc(photosRef, {
    ...body,
    adminUid,
    createdAt: new Date(),
    createdBy: adminUid
  });

  return NextResponse.json({ 
    success: true, 
    photoId: docRef.id 
  }, { status: 201 });
});
```

### 3.2 Atualizar Ações do Servidor

Em `src/app/admin/actions.ts`:

```typescript
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

/**
 * Obter conversas do admin autenticado
 */
export async function getAdminConversations(adminUid: string) {
  if (!adminUid) throw new Error('adminUid é obrigatório');

  const db = getAdminDb();
  if (!db) throw new Error('Firebase não inicializado');

  const conversationsRef = collection(
    db,
    'admins',
    adminUid,
    'conversations'
  );

  const q = query(
    conversationsRef,
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Obter fotos públicas de um admin (para perfil público)
 */
export async function getAdminPublicPhotos(adminUid: string) {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase não inicializado');

  const photosRef = collection(db, 'admins', adminUid, 'photos');
  const q = query(
    photosRef,
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

## Fase 4: Migração de Dados Existentes

### 4.1 Script de Migração

```bash
npm run migrate:multi-admin
```

```typescript
// scripts/migrate-to-multi-admin.ts
import * as admin from 'firebase-admin';

async function migrateConversations() {
  const db = admin.firestore();
  const admins = await db.collection('admins').get();

  let count = 0;
  for (const adminDoc of admins.docs) {
    const adminUid = adminDoc.id;
    
    // Buscar conversas antigas (em coleção global)
    const oldConversations = await db
      .collection('conversations')
      .where('adminUid', '==', adminUid)
      .get();

    console.log(`Migrando ${oldConversations.size} conversas do admin ${adminUid}`);

    for (const convDoc of oldConversations.docs) {
      const convData = convDoc.data();
      
      // Copiar para nova localização
      await db
        .collection('admins')
        .doc(adminUid)
        .collection('conversations')
        .doc(convDoc.id)
        .set(convData);

      count++;
    }
  }

  console.log(`✅ Migradas ${count} conversas`);
}

// Repetir para: fotos, vídeos, produtos, etc.
```

### 4.2 Validar Migração

```typescript
// scripts/validate-migration.ts
async function validateMigration() {
  const db = admin.firestore();
  const admins = await db.collection('admins').get();

  for (const adminDoc of admins.docs) {
    const adminUid = adminDoc.id;

    // Verificar conversas
    const newConvs = await db
      .collection('admins')
      .doc(adminUid)
      .collection('conversations')
      .count()
      .get();

    const oldConvs = await db
      .collection('conversations')
      .where('adminUid', '==', adminUid)
      .count()
      .get();

    console.log(`Admin ${adminUid}: ${newConvs.data().count} novas vs ${oldConvs.data().count} antigas`);
  }
}
```

## Fase 5: Testes

### 5.1 Teste de Isolamento

```typescript
// __tests__/admin-isolation.test.ts
describe('Admin Data Isolation', () => {
  it('Admin A não deve ver dados do Admin B', async () => {
    const adminAPhotos = await db
      .collection('admins')
      .doc('admin-a-uid')
      .collection('photos')
      .get();

    const adminBPhotos = await db
      .collection('admins')
      .doc('admin-b-uid')
      .collection('photos')
      .get();

    // Verificar que são coleções diferentes
    expect(adminAPhotos.docs).not.toEqual(adminBPhotos.docs);
  });

  it('Query de um admin não retorna dados de outro', async () => {
    const query = db
      .collection('admins')
      .doc('admin-a-uid')
      .collection('conversations')
      .where('adminUid', '==', 'admin-a-uid');

    const snapshot = await query.get();
    
    snapshot.docs.forEach(doc => {
      expect(doc.data().adminUid).toBe('admin-a-uid');
    });
  });
});
```

### 5.2 Teste de Permissões

```typescript
// __tests__/admin-permissions.test.ts
describe('Admin Permissions', () => {
  it('Admin não autenticado não pode ler conversas', async () => {
    const response = await fetch('/api/admin/conversations', {
      headers: {} // Sem token
    });

    expect(response.status).toBe(401);
  });

  it('Admin pode ler suas próprias conversas', async () => {
    const response = await fetch('/api/admin/conversations', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    expect(response.status).toBe(200);
  });

  it('Admin não pode deletar conversa de outro admin', async () => {
    const response = await fetch('/api/admin/conversations/conv-id', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${wrongAdminToken}`
      }
    });

    expect(response.status).toBe(403);
  });
});
```

## Checklist Final

- [ ] Firestore Security Rules atualizadas
- [ ] Índices Firestore criados
- [ ] AdminContext implementado
- [ ] Hooks (useAdminData, etc) criados
- [ ] API middleware (withAdminAuth) implementado
- [ ] APIs atualizadas com isolamento
- [ ] Componentes usam AdminContext
- [ ] Dados migrados de forma segura
- [ ] Testes de isolamento passando
- [ ] Testes de permissões passando
- [ ] Documentação atualizada
- [ ] Validação de dados em produção

## Suporte

Para dúvidas sobre isolamento de dados:

1. Verificar Firestore Security Rules em Firebase Console
2. Verificar logs em Firebase Console > Firestore > Logs
3. Testar com Firestore Emulator em desenvolvimento
4. Usar `console.log()` em middlewares para debug
