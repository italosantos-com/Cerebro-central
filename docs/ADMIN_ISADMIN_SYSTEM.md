# 🔐 Sistema de Administradores - isAdmin

Sistema completo de gerenciamento de administradores com Firebase Authentication Custom Claims e Cloud Functions.

## 📁 Arquivos Criados

### Backend (Firebase Functions)

#### `/functions/src/admin-functions.ts`
Funções do Firebase para gerenciar administradores:

- **`setAdminClaim(uid)`** - Define custom claim 'admin' para um usuário
- **`isAdmin()`** - Verifica se usuário autenticado é admin
- **`onAdminCreated`** - Trigger automático quando admin é criado no Firestore
- **`onAdminDeleted`** - Trigger automático quando admin é removido
- **`getAllAdmins()`** - Lista todos os administradores (requer permissão admin)
- **`checkIsAdmin(uid)`** - Helper function para verificar admin
- **`requireAdmin(context)`** - Middleware para proteger funções

#### `/functions/src/index.ts`
Exporta todas as Cloud Functions do projeto

### API Routes (Next.js)

#### `/src/app/api/admin/check/route.ts`
Endpoint REST para verificar status de admin:

- **GET** `/api/admin/check` - Verifica se usuário é admin
- **POST** `/api/admin/check` - Seta custom claim manualmente (requer ser admin)

#### `/src/app/api/admin/auth/complete-registration/route.ts` (atualizado)
Agora cria usuário no Firebase Auth e define custom claim automaticamente

### Frontend (React Hooks)

#### `/src/hooks/useIsAdmin.ts`
Hooks React para verificar status de admin:

- **`useIsAdmin()`** - Hook principal para verificar admin
- **`useRequireAdmin(redirectTo)`** - Hook com redirecionamento automático
- **`withAdminAuth(Component)`** - HOC para proteger componentes

## 🔥 Firebase Firestore Collections

### Collection: `admins`
```typescript
{
  id: string;
  uid: string; // UID do Firebase Auth
  name: string;
  email: string;
  phone: string;
  faceIdToken: string;
  role: 'admin';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string | null;
  twoFactorEnabled: boolean;
  adminClaimSet: boolean;
  adminClaimSetAt: string;
  authUserCreated: boolean;
}
```

### Collection: `pending_admin_registrations`
```typescript
{
  name: string;
  email: string;
  phone: string;
  status: 'pending_verification';
  createdAt: string;
  expiresAt: string;
}
```

### Collection: `admin_audit_log`
```typescript
{
  action: 'admin_registered' | 'admin_deleted' | 'claim_set' | 'claim_removed';
  adminId: string;
  email: string;
  timestamp: string;
  metadata: object;
}
```

## 🚀 Como Funciona

### 1. Registro de Novo Admin

```mermaid
sequenceDiagram
    User->>API: POST /api/admin/auth/start-registration
    API->>Firestore: Verifica código de convite
    API->>Firestore: Cria pending_admin_registrations
    API-->>User: registrationId

    User->>API: POST /api/admin/auth/complete-registration
    API->>Firebase Auth: Cria usuário
    API->>Firebase Auth: Define custom claim 'admin: true'
    API->>Firestore: Cria documento em 'admins'
    Firestore->>Cloud Function: Trigger onAdminCreated
    Cloud Function->>Firebase Auth: Confirma custom claim
    API-->>User: adminId
```

### 2. Verificação de Admin

```mermaid
sequenceDiagram
    User->>Frontend: useIsAdmin()
    Frontend->>API: GET /api/admin/check (Bearer token)
    API->>Firebase Auth: verifyIdToken()
    API->>Firebase Auth: getUser() - verifica custom claims
    API->>Firestore: Busca em collection 'admins'
    
    alt Tem claim
        API-->>Frontend: { isAdmin: true, hasCustomClaim: true }
    else Só na collection
        API->>Firebase Auth: setCustomUserClaims()
        API-->>Frontend: { isAdmin: true, claimSetNow: true }
    else Não é admin
        API-->>Frontend: { isAdmin: false }
    end
```

## 💻 Uso no Código

### No Frontend (React)

```typescript
import { useIsAdmin, useRequireAdmin, withAdminAuth } from '@/hooks/useIsAdmin';

// Verificar se é admin
function MyComponent() {
  const { isAdmin, loading, error, checkAdmin } = useIsAdmin();

  if (loading) return <div>Carregando...</div>;
  if (!isAdmin) return <div>Acesso negado</div>;

  return <div>Bem-vindo, Admin!</div>;
}

// Proteger componente com HOC
const AdminPanel = withAdminAuth(function AdminPanel() {
  return <div>Painel Admin</div>;
});

// Hook com redirecionamento
function ProtectedPage() {
  const { isAdmin, loading } = useRequireAdmin('/login');
  
  if (loading) return <div>Verificando...</div>;
  
  return <div>Página protegida</div>;
}
```

### No Backend (API Routes)

```typescript
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.split('Bearer ')[1];
  
  const auth = getAuth(getAdminApp());
  const decodedToken = await auth.verifyIdToken(idToken);
  
  // Verificar custom claim
  if (!decodedToken.admin) {
    return NextResponse.json(
      { error: 'Acesso negado' },
      { status: 403 }
    );
  }
  
  // Continuar com operação admin...
}
```

### Em Firebase Functions

```typescript
import { requireAdmin, checkIsAdmin } from './admin-functions';

export const deleteUser = functions.https.onCall(async (data, context) => {
  // Verificar se é admin
  await requireAdmin(context);
  
  // Ou verificar manualmente
  const isAdmin = await checkIsAdmin(context.auth!.uid);
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Não é admin');
  }
  
  // Continuar com operação admin...
});
```

## 🔧 Configuração

### 1. Deploy das Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 2. Variáveis de Ambiente

Adicione ao `.env.local`:

```bash
# Admin Registration
ADMIN_INVITATION_CODE=creatorsphere2025

# Firebase Admin SDK
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
```

### 3. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Collection admins - apenas leitura para admins autenticados
    match /admins/{adminId} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Apenas via Cloud Functions
    }
    
    // Registros pendentes - sem acesso direto
    match /pending_admin_registrations/{docId} {
      allow read, write: if false; // Apenas via API
    }
    
    // Audit log - apenas leitura para admins
    match /admin_audit_log/{logId} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Apenas via Cloud Functions
    }
  }
}
```

## 🧪 Testes

### Testar via Firebase Functions Shell

```bash
firebase functions:shell

# Testar verificação de admin
> isAdmin()

# Testar definir claim
> setAdminClaim({ uid: 'algum-uid' })

# Listar todos os admins
> getAllAdmins()
```

### Testar via API

```bash
# Obter token do usuário
TOKEN="seu-firebase-id-token"

# Verificar se é admin
curl -X GET http://localhost:3000/api/admin/check \
  -H "Authorization: Bearer $TOKEN"

# Setar claim manualmente
curl -X POST http://localhost:3000/api/admin/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUid": "uid-do-usuario"}'
```

## 📊 Fluxo Completo

1. **Novo admin preenche formulário** com código de convite
2. **API valida código** e cria registro pendente
3. **Códigos de verificação** enviados por email e SMS
4. **Admin confirma códigos** e cadastro facial
5. **API cria usuário** no Firebase Auth
6. **API define custom claim** `admin: true`
7. **API cria documento** na collection `admins`
8. **Trigger `onAdminCreated`** confirma custom claim
9. **Admin pode fazer login** com poderes administrativos
10. **Frontend verifica status** via `useIsAdmin()`

## 🔒 Segurança

- ✅ Custom Claims do Firebase Auth (não podem ser manipulados pelo cliente)
- ✅ Dupla verificação (claim + collection)
- ✅ Triggers automáticos para sincronização
- ✅ Audit log de todas as ações
- ✅ Rate limiting nas APIs
- ✅ Verificação de token em todas as requisições
- ✅ Código de convite secreto
- ✅ 2FA (email + SMS + Face ID)

## 📝 Logs

Todos os logs são prefixados para fácil identificação:

- `[Admin Claim]` - Operações de custom claims
- `[isAdmin]` - Verificações de admin
- `[Admin Trigger]` - Triggers do Firestore
- `[Admin Check]` - API route /admin/check
- `[Admin Registration]` - Processo de registro
- `[useIsAdmin]` - Hook React

## 🚨 Troubleshooting

### Usuário não é reconhecido como admin

1. Verificar se existe na collection `admins`
2. Verificar custom claims: `auth.currentUser.getIdTokenResult()`
3. Forçar refresh do token: `user.getIdToken(true)`
4. Chamar manualmente: `POST /api/admin/check`

### Custom claim não foi setado

1. Verificar logs das Cloud Functions
2. Verificar campo `adminClaimSet` no documento
3. Executar manualmente: `setAdminClaim({ uid })`

### Erro de permissão

1. Verificar Firestore Rules
2. Verificar que Firebase Functions foram deployadas
3. Verificar variáveis de ambiente
4. Verificar que token não está expirado

## 🎯 Próximos Passos

- [ ] Implementar remoção de admin via UI
- [ ] Adicionar níveis de permissão (super-admin, admin, moderador)
- [ ] Dashboard de auditoria
- [ ] Notificações de novas ações admin
- [ ] Backup automático da collection admins
- [ ] Rate limiting mais robusto (Redis)
- [ ] Testes automatizados

## 📚 Recursos

- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Cloud Functions Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [React Hooks](https://react.dev/reference/react)
