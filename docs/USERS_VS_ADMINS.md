## 📊 Divisão Correta: Users (Assinantes/Clientes) vs Admins (Criadores/Vendedores)

### 🎯 Visão Geral

O sistema deve ter **duas categorias distintas** de usuários:

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUÁRIOS DO SISTEMA                           │
├─────────────────────┬───────────────────────────────────────────┤
│                     │                                             │
│   CUSTOMERS/         │           ADMINS/                          │
│   SUBSCRIBERS        │           CONTENT CREATORS                 │
│   (Assinantes)       │           (Vendedores)                     │
│                     │                                             │
│ • Pagam por acesso  │ • Criam conteúdo                           │
│ • Consomem conteúdo │ • Vendem assinaturas                       │
│ • Podem ter perfil  │ • Recebem pagamentos                       │
│ • Coleção: users/   │ • Têm dashboards                           │
│                     │ • Coleção: admins/{uid}/                   │
└─────────────────────┴───────────────────────────────────────────┘
```

---

### 🗄️ Estrutura do Firestore

#### **1. Coleção `users/` - Para Assinantes/Clientes**

```javascript
firestore
├── users/ {uid}
│   ├── email: "cliente@example.com"
│   ├── name: "João Cliente"
│   ├── isSubscriber: true          // ← Flag se é assinante
│   ├── subscriptionStatus: "active"
│   ├── subscriptionEndDate: "2026-02-02"
│   ├── adminUid: "admin-italo"     // ← QUAL ADMIN CRIOU ESSE USUÁRIO
│   └── createdAt: timestamp
```

**Regra**: Um `user` é um cliente que pode estar assinado a um ou mais admins.

#### **2. Coleção `admins/` - Para Criadores/Vendedores**

```javascript
firestore
├── admins/ {adminUid}
│   ├── profile
│   │   ├── username: "italo"
│   │   ├── email: "italo@example.com"
│   │   ├── name: "Italo Santa"
│   │   ├── publicProfile: true
│   │   └── createdAt: timestamp
│   │
│   ├── conversations/ {id}
│   │   ├── title: "Como usar..."
│   │   ├── visibility: "public"
│   │   ├── createdAt: timestamp
│   │   └── adminUid: "admin-italo"  // ← REDUNDA PARA SEGURANÇA
│   │
│   ├── photos/ {id}
│   │   ├── url: "..."
│   │   ├── visibility: "subscribers"
│   │   └── adminUid: "admin-italo"
│   │
│   ├── videos/ {id}
│   ├── products/ {id}
│   ├── subscribers/ {id}           // ← ASSINANTES DESTE ADMIN
│   ├── reviews/ {id}
│   ├── uploads/ {id}
│   ├── integrations/ {id}
│   └── settings/ {id}
```

#### **3. Coleção `subscribers/` - Histórico de Assinaturas**

```javascript
firestore
├── subscribers/ {subscriptionId}
│   ├── email: "cliente@example.com"
│   ├── userId: "user-uid"
│   ├── adminUid: "admin-italo"     // ← QUAL ADMIN VENDEU
│   ├── status: "active"
│   ├── paymentMethod: "pix"
│   ├── amount: 99.00
│   ├── startDate: "2026-01-02"
│   ├── endDate: "2026-02-02"
│   ├── planDuration: 30
│   └── createdAt: timestamp
```

---

### 👤 Exemplo Prático

**Cenário**: João Cliente quer assistir conteúdo de 2 admins diferentes (Italo e Lucas)

```
┌──────────────────────────────────────────────────────────┐
│                    João Cliente                           │
│                (users/joao-uid-123)                       │
├──────────────────────────────────────────────────────────┤
│ ✅ Assinado com ITALO                                    │
│    - subscribers/sub-001                                 │
│    - adminUid: "italo-uid"                              │
│    - acesso a: conversas, fotos, vídeos de ITALO        │
│                                                          │
│ ✅ Assinado com LUCAS                                   │
│    - subscribers/sub-002                                │
│    - adminUid: "lucas-uid"                              │
│    - acesso a: conversas, fotos, vídeos de LUCAS        │
└──────────────────────────────────────────────────────────┘
```

**Estrutura no Firestore**:

```javascript
// 1. Usuário João
users/joao-uid-123 = {
  email: "joao@example.com",
  name: "João",
  isSubscriber: true,  // Tem pelo menos 1 assinatura ativa
  subscriptionStatus: "active",
  createdAt: ...
}

// 2. Assinatura com Italo
subscribers/sub-001 = {
  email: "joao@example.com",
  userId: "joao-uid-123",
  adminUid: "italo-uid",    // ← João ASSINOU COM ITALO
  status: "active",
  endDate: "2026-02-02"
}

// 3. Assinatura com Lucas
subscribers/sub-002 = {
  email: "joao@example.com",
  userId: "joao-uid-123",
  adminUid: "lucas-uid",    // ← João ASSINOU COM LUCAS
  status: "active",
  endDate: "2026-02-15"
}

// 4. Conteúdo de Italo (isolado)
admins/italo-uid/conversations/conv-001 = {
  title: "Aula de Python",
  visibility: "subscribers",  // Apenas assinantes veem
  adminUid: "italo-uid"
}

// 5. Conteúdo de Lucas (isolado)
admins/lucas-uid/conversations/conv-001 = {
  title: "Aula de JavaScript",
  visibility: "public",  // Todos veem
  adminUid: "lucas-uid"
}
```

---

### 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ====== USERS (Assinantes/Clientes) ======
    match /users/{userId} {
      // Ler seu próprio perfil
      allow read: if request.auth.uid == userId;
      
      // Escrever seu próprio perfil
      allow write: if request.auth.uid == userId;
      
      // Admin pode ler usuários que se inscreveram nele
      allow read: if request.auth.token.admin == true;
    }

    // ====== ADMINS (Vendedores/Criadores) ======
    match /admins/{adminUid} {
      // Admin pode ler/escrever seu próprio perfil
      allow read, write: if request.auth.uid == adminUid && 
                            request.auth.token.admin == true;
      
      // Cliente pode ler perfil público de admin
      allow read: if resource.data.publicProfile == true;
      
      // ====== CONTEÚDO DO ADMIN (Conversas, Fotos, etc) ======
      match /{document=**} {
        // Admin acessa seu próprio conteúdo
        allow read, write: if request.auth.uid == adminUid && 
                              request.auth.token.admin == true;
        
        // Cliente lê conteúdo público
        allow read: if resource.data.visibility == "public";
        
        // Cliente lê conteúdo de assinante se está assinado
        allow read: if resource.data.visibility == "subscribers" &&
                       exists(/databases/$(database)/documents/subscribers/$(request.auth.uid)) &&
                       get(/databases/$(database)/documents/subscribers/$(request.auth.uid)).data.adminUid == adminUid &&
                       get(/databases/$(database)/documents/subscribers/$(request.auth.uid)).data.status == "active";
      }
    }

    // ====== ASSINATURAS (Histórico de Pagamentos) ======
    match /subscribers/{subscriptionId} {
      // Admin pode ler assinatura que ele criou
      allow read: if request.auth.uid == resource.data.adminUid && 
                     request.auth.token.admin == true;
      
      // Cliente pode ler suas próprias assinaturas
      allow read: if request.auth.uid == resource.data.userId;
      
      // Criar assinatura (via API)
      allow create: if request.auth.token.admin == true;
    }
  }
}
```

---

### 🛠️ API Backend - Separação Correta

#### **1. Criar User (Não diferencia admin)**

```typescript
// POST /api/users
// Qualquer pessoa pode criar conta
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  
  // Criar em Firebase Auth
  const userRecord = await admin.auth().createUser({ email, password });
  
  // Salvar em users/ (SEM adminUid - é um usuário, não de um admin específico)
  await adminDb.collection('users').doc(userRecord.uid).set({
    email,
    uid: userRecord.uid,
    isSubscriber: false,  // Começa sem assinatura
    createdAt: new Date()
  });
  
  return NextResponse.json({ success: true, userId: userRecord.uid });
}
```

#### **2. Criar Admin (Requer verificação especial)**

```typescript
// POST /api/admin/register
// Apenas admins verificados podem criar conta admin
export async function POST(request: NextRequest) {
  const { email, password, username } = await request.json();
  
  // 1. Criar em Firebase Auth
  const userRecord = await admin.auth().createUser({ email, password });
  
  // 2. Setar custom claim admin=true
  await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
  
  // 3. Salvar em admins/{uid}/profile
  await adminDb.collection('admins')
    .doc(userRecord.uid)
    .collection('profile')
    .doc('settings')
    .set({
      email,
      username,
      uid: userRecord.uid,
      publicProfile: true,
      createdAt: new Date()
    });
  
  return NextResponse.json({ success: true, adminUid: userRecord.uid });
}
```

#### **3. Criar Assinatura (Link Cliente → Admin)**

```typescript
// POST /api/admin/subscriptions
// Apenas admin autenticado pode criar assinatura para seus clientes
export const POST = withAdminAuth(async (request, { adminUid }) => {
  const { email, paymentId, planDuration } = await request.json();
  
  // 1. Encontrar ou criar usuário cliente
  let userId = await findUserByEmail(email);
  if (!userId) {
    userId = await createUserFromEmail(email);
  }
  
  // 2. Criar assinatura (SEMPRE com adminUid do criador)
  const subscription = {
    email,
    userId,
    adminUid,  // ← SEMPRE o admin autenticado
    status: 'active',
    paymentMethod: 'pix',
    amount: 99.00,
    planDuration,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + planDuration * 24 * 60 * 60 * 1000).toISOString()
  };
  
  const docRef = await adminDb.collection('subscribers').add(subscription);
  
  // 3. Marcar usuário como assinante
  await adminDb.collection('users').doc(userId).update({
    isSubscriber: true,
    subscriptionStatus: 'active'
  });
  
  return NextResponse.json({ success: true, subscriptionId: docRef.id });
});
```

#### **4. Buscar Conteúdo (Filtrado por Admin)**

```typescript
// GET /api/admin/conversations
export const GET = withAdminAuth(async (request, { adminUid }) => {
  // Automaticamente filtra apenas conversas deste admin
  const conversationsRef = collection(
    db,
    'admins',
    adminUid,
    'conversations'
  );
  
  const snapshot = await getDocs(conversationsRef);
  return NextResponse.json({
    conversations: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  });
});
```

---

### ✅ Checklist de Validação

**Ao criar um novo endpoint, verifique:**

- [ ] **É de user (cliente)?** → Salvar em `users/{userId}`
- [ ] **É de admin (criador)?** → Salvar em `admins/{adminUid}/...`
- [ ] **É assinatura?** → Salvar em `subscribers/`, com `adminUid` + `userId`
- [ ] **O endpoint valida propriedade?** → Usar `withAdminAuth()` + `validateOwnership()`
- [ ] **A query filtra por adminUid?** → Usar subcollection `admins/{uid}/...`
- [ ] **As Security Rules estão corretas?** → Validar `adminUid` e `visibility`

---

### 📝 Resumo das Coleções

| Coleção | Objetivo | Dono | Isolação |
|---------|----------|------|----------|
| `users/` | Usuários clientes/assinantes | Sistema | Nenhuma (compartilhada) |
| `subscribers/` | Histórico de assinaturas | Sistema | Por `adminUid` |
| `admins/{uid}/profile/` | Perfil do admin | Admin individual | Por `adminUid` |
| `admins/{uid}/conversations/` | Conversas criadas | Admin individual | Por `adminUid` |
| `admins/{uid}/photos/` | Fotos do admin | Admin individual | Por `adminUid` |
| `admins/{uid}/videos/` | Vídeos do admin | Admin individual | Por `adminUid` |
| `admins/{uid}/products/` | Produtos do admin | Admin individual | Por `adminUid` |
| `admins/{uid}/subscribers/` | Lista de assinantes | Admin individual | Por `adminUid` |
| `admins/{uid}/integrations/` | Integrações | Admin individual | Por `adminUid` |

---

### 🎯 Fluxo Completo: Um Cliente Assinando

```
1. João se registra (user account)
   POST /api/register
   → Cria users/joao-uid-123
   
2. João encontra ITALO (admin)
   GET /admins/italo-uid/profile (público)
   → Vê conteúdo público de ITALO
   
3. João paga para se inscrever em ITALO
   POST /api/payment
   → Cria subscribers/sub-001 (adminUid=italo-uid)
   
4. João acessa conteúdo exclusivo
   GET /api/admin/italo/conversations
   → Valida subscribers/?email=joao@example.com&adminUid=italo-uid
   → Retorna apenas de ITALO (admins/italo-uid/conversations/)
   
5. João se inscreve também em LUCAS
   POST /api/payment
   → Cria subscribers/sub-002 (adminUid=lucas-uid)
   
6. João vê conteúdo de AMBOS
   GET /api/admin/italo/conversations ← Conversas de ITALO
   GET /api/admin/lucas/conversations ← Conversas de LUCAS
```

---

### 🚀 Próximos Passos

1. ✅ **Validar Firestore Rules** - Certifique-se de que estão corretas
2. ✅ **Atualizar APIs** - Use `withAdminAuth()` em todos os endpoints admin
3. ✅ **Migrar dados existentes** - Adicione `adminUid` a todos os documentos
4. ✅ **Testar isolamento** - Verifique que Admin A não vê dados de Admin B
5. ✅ **Documentar fluxo** - Treine a equipe nessa divisão

---
