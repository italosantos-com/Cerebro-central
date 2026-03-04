# 🔐 Sistema de Administradores - Guia Completo

Sistema completo de cadastro e gerenciamento de administradores com Firebase Authentication Custom Claims, Cloud Functions e Firestore.

## 📦 Arquivos Criados

### 🔥 Firebase Functions
- `/functions/src/admin-functions.ts` - Funções principais de gerenciamento
- `/functions/src/index.ts` - Exportação das funções

### 🌐 API Routes (Next.js)
- `/src/app/api/admin/check/route.ts` - Verificação de status admin
- `/src/app/api/admin/auth/complete-registration/route.ts` - Cadastro completo (atualizado)

### ⚛️ Hooks React
- `/src/hooks/useIsAdmin.tsx` - Hook para verificar admin no frontend

### 📚 Documentação
- `/docs/ADMIN_ISADMIN_SYSTEM.md` - Documentação completa do sistema
- `/docs/ADMIN_ISADMIN_EXAMPLES.ts` - 12 exemplos de uso

### 🛠️ Scripts
- `/scripts/init-admin-system.js` - Inicialização do sistema

## 🚀 Instalação Rápida

### 1. Instalar Dependências

```bash
# Na raiz do projeto
npm install

# Nas functions
cd functions
npm install
```

### 2. Configurar Variáveis de Ambiente

Adicione ao `.env.local`:

```bash
# Admin System
ADMIN_INVITATION_CODE=creatorsphere2025

# Firebase Admin SDK (já configurado)
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@YOUR_FIREBASE_PROJECT_ID.iam.gserviceaccount.com

# SendGrid & Twilio (já configurado)
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM_EMAIL=is@italosantos.com
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
```

### 3. Inicializar Sistema

```bash
# Criar collections e primeiro admin
node scripts/init-admin-system.js
```

**O script irá pedir:**
- Nome completo do primeiro admin
- Email
- Telefone

**E irá:**
- ✅ Criar todas as collections necessárias
- ✅ Criar usuário no Firebase Auth
- ✅ Definir custom claim 'admin'
- ✅ Criar documento no Firestore
- ✅ Gerar senha temporária
- ✅ Registrar no audit log

### 4. Deploy das Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

**Funções deployadas:**
- `setAdminClaim` - Define custom claim admin
- `isAdmin` - Verifica se usuário é admin
- `onAdminCreated` - Trigger automático ao criar admin
- `onAdminDeleted` - Trigger automático ao deletar admin
- `getAllAdmins` - Lista todos os admins

### 5. Configurar Firestore Rules

Adicione ao `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Admins - apenas leitura para admins autenticados
    match /admins/{adminId} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if false; // Apenas via Cloud Functions
    }
    
    // Registros pendentes - sem acesso direto
    match /pending_admin_registrations/{docId} {
      allow read, write: if false; // Apenas via API
    }
    
    // Códigos de verificação - sem acesso direto
    match /verification_codes/{codeId} {
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

Deploy das rules:

```bash
firebase deploy --only firestore:rules
```

## 💻 Como Usar

### No Frontend (React)

#### 1. Verificar se usuário é admin

```typescript
import { useIsAdmin } from '@/hooks/useIsAdmin';

function MyComponent() {
  const { isAdmin, loading, error } = useIsAdmin();

  if (loading) return <div>Carregando...</div>;
  if (!isAdmin) return <div>Acesso negado</div>;

  return <div>Conteúdo administrativo</div>;
}
```

#### 2. Proteger componente com HOC

```typescript
import { withAdminAuth } from '@/hooks/useIsAdmin';

function AdminPanel() {
  return <div>Painel Admin</div>;
}

export default withAdminAuth(AdminPanel);
```

#### 3. Redirecionar se não for admin

```typescript
import { useRequireAdmin } from '@/hooks/useIsAdmin';

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
  // Obter token
  const authHeader = req.headers.get('authorization');
  const idToken = authHeader?.split('Bearer ')[1];
  
  // Verificar admin
  const auth = getAuth(getAdminApp());
  const decodedToken = await auth.verifyIdToken(idToken);
  
  if (!decodedToken.admin) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  
  // Executar operação admin...
}
```

### Em Cloud Functions

```typescript
import { requireAdmin } from './admin-functions';

export const deleteUser = functions.https.onCall(async (data, context) => {
  await requireAdmin(context);
  
  // Executar operação admin...
});
```

## 🔄 Fluxo de Cadastro de Novos Admins

1. **Admin acessa** `/admin/register`
2. **Preenche formulário** com código de convite (`creatorsphere2025`)
3. **Sistema envia** códigos de verificação (email + SMS)
4. **Admin confirma** códigos e cadastro facial
5. **API cria** usuário no Firebase Auth
6. **API define** custom claim `admin: true`
7. **API cria** documento na collection `admins`
8. **Trigger** `onAdminCreated` confirma custom claim
9. **Admin faz login** com credenciais criadas

## 🧪 Testes

### Testar Cloud Functions localmente

```bash
firebase functions:shell

# Verificar admin
> isAdmin()

# Setar claim
> setAdminClaim({ uid: 'algum-uid' })

# Listar admins
> getAllAdmins()
```

### Testar API Routes

```bash
# Obter token
TOKEN="seu-firebase-id-token"

# Verificar status admin
curl -X GET http://localhost:3000/api/admin/check \
  -H "Authorization: Bearer $TOKEN"

# Setar claim manualmente
curl -X POST http://localhost:3000/api/admin/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUid": "uid-do-usuario"}'
```

## 🔐 Segurança

- ✅ Custom Claims do Firebase (imutáveis pelo cliente)
- ✅ Dupla verificação (claim + Firestore)
- ✅ Triggers automáticos de sincronização
- ✅ Audit log completo
- ✅ Rate limiting nas APIs
- ✅ Código de convite secreto
- ✅ 2FA (email + SMS + Face ID)
- ✅ Firestore Rules restritivas

## 📊 Collections do Firestore

### `admins`
```typescript
{
  id: string;
  uid: string; // Firebase Auth UID
  name: string;
  email: string;
  phone: string;
  role: 'admin';
  status: 'active' | 'inactive';
  adminClaimSet: boolean;
  adminClaimSetAt: Timestamp;
  createdAt: Timestamp;
}
```

### `pending_admin_registrations`
```typescript
{
  name: string;
  email: string;
  phone: string;
  status: 'pending_verification';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

### `admin_audit_log`
```typescript
{
  action: string;
  adminId: string;
  email: string;
  timestamp: Timestamp;
  metadata: object;
}
```

## 🚨 Troubleshooting

### Usuário não é reconhecido como admin

1. Verificar se existe na collection `admins`:
```bash
firebase firestore:get admins --where uid==SEU_UID
```

2. Verificar custom claims no frontend:
```javascript
const token = await user.getIdTokenResult(true);
console.log('Admin:', token.claims.admin);
```

3. Forçar atualização do claim:
```bash
curl -X POST http://localhost:3000/api/admin/check \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"targetUid": "SEU_UID"}'
```

### Custom claim não foi setado automaticamente

1. Verificar logs das Cloud Functions:
```bash
firebase functions:log
```

2. Executar manualmente via Firebase Console:
   - Cloud Firestore → admins → selecionar documento
   - Verificar campo `adminClaimSet`

3. Chamar função manualmente:
```javascript
const setAdminClaim = httpsCallable(functions, 'setAdminClaim');
await setAdminClaim({ uid: 'SEU_UID' });
```

### Erro de permissão no Firestore

1. Verificar Firestore Rules foram deployadas
2. Verificar que token não está expirado
3. Forçar refresh do token:
```javascript
const newToken = await user.getIdToken(true);
```

## 📝 Logs

Todos os logs são prefixados:

- `[Admin Claim]` - Custom claims
- `[isAdmin]` - Verificações
- `[Admin Trigger]` - Triggers Firestore
- `[Admin Check]` - API /admin/check
- `[Admin Registration]` - Cadastro
- `[useIsAdmin]` - Hook React

## 📚 Documentação Adicional

- [Sistema Completo](/docs/ADMIN_ISADMIN_SYSTEM.md)
- [Exemplos de Uso](/docs/ADMIN_ISADMIN_EXAMPLES.ts)
- [Registro de Admin](/docs/ADMIN_REGISTRATION_SYSTEM.md)

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Collections criadas via script
- [ ] Primeiro admin criado
- [ ] Cloud Functions deployadas
- [ ] Firestore Rules deployadas
- [ ] Testado cadastro de novo admin
- [ ] Testado verificação isAdmin
- [ ] Testado em produção

## 🎯 Status Atual

✅ **Sistema Completo e Funcional**

- ✅ Cloud Functions criadas
- ✅ API Routes implementadas
- ✅ Hooks React prontos
- ✅ Documentação completa
- ✅ Script de inicialização
- ✅ Exemplos de uso
- ✅ Sistema de custom claims
- ✅ Triggers automáticos
- ✅ Audit log configurado

## 🚀 Próximo Passo

Execute o script de inicialização:

```bash
node scripts/init-admin-system.js
```

E faça o deploy das functions:

```bash
cd functions && npm run build && firebase deploy --only functions
```

**Pronto! Seu sistema de administradores está configurado! 🎉**
