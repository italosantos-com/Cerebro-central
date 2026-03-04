# Sistema Multi-Perfil para Administradores

## 📋 Visão Geral

O sistema agora suporta múltiplos administradores, cada um com seu próprio perfil personalizado e URL única.

## ✨ Funcionalidades Implementadas

### 1. **Campo Username** ✅
- Cada administrador possui um username único
- Username é lowercase e aceita: letras, números, hífen e underscore
- Comprimento: 3-20 caracteres
- Validação em tempo real durante o registro

### 2. **Rotas Dinâmicas por Username** ✅
- Cada admin tem sua própria URL: `italosantos.com/{username}`
- Exemplos:
  - `italosantos.com/severepics`
  - `italosantos.com/lucas`
  - `italosantos.com/maria`

### 3. **ProfileSettings Individual** ✅
- Cada admin tem suas próprias configurações de perfil
- Armazenadas em: `admins/{uid}/profile/settings`
- Configurações completamente independentes entre admins

### 4. **Main Admin** ✅
- Primeiro admin criado automaticamente marcado como `isMainAdmin: true`
- URL raiz (`italosantos.com/`) mostra o perfil do main admin
- Apenas um main admin por sistema

### 5. **Registro com Username** ✅
- Campo de username na página de registro
- Validação em tempo real:
  - ✅ Verde: Username disponível
  - ❌ Vermelho: Username indisponível ou inválido
- Preview da URL: `italosantos.com/{username}`

### 6. **Dashboard Individual** ✅
- `/admin/settings` agora edita apenas o perfil do admin logado
- Indicador visual mostrando: "Editando perfil de: {nome} (@{username})"
- Cada admin gerencia apenas suas próprias configurações

## 🗂️ Estrutura de Dados

### Coleção `admins`
```typescript
{
  uid: string;              // ID único do Firebase Auth
  name: string;             // Nome completo do admin
  email: string;            // Email do admin
  phone: string;            // Telefone (opcional)
  username: string;         // Username único (lowercase)
  isMainAdmin: boolean;     // true apenas para o primeiro admin
  status: 'active';         // Status da conta
  createdAt: timestamp;     // Data de criação
}
```

### Subcoleção `admins/{uid}/profile/settings`
```typescript
{
  name: string;
  description?: string;
  profilePictureUrl: string;
  coverPhotoUrl: string;
  galleryPhotos: { url: string }[];
  socialMedia?: {
    instagram: string;
    twitter: string;
    youtube: string;
    whatsapp: string;
    telegram: string;
  };
  paymentSettings?: {...};
  reviewSettings?: {...};
  footerSettings?: {...};
  // ... mais configurações
}
```

## 🔧 Serviços Atualizados

### `admin-auth-service.ts`
```typescript
// Criar admin com username
await ensureAdminDoc(user, name, phone, username);

// Validar username
const validation = await validateUsername("severepics");
// { valid: true, message: "Username disponível" }

// Buscar admin por username
const admin = await getAdminByUsername("severepics");
```

### `profile-config-service.ts`
```typescript
// Buscar configurações de um admin específico
const settings = await ProfileConfigService.getProfileSettings(adminUid);

// Atualizar configurações de um admin
await ProfileConfigService.updateProfileSettings(settings, adminUid);
```

### Server Actions `actions.ts`
```typescript
// Buscar configurações (server-side)
const settings = await getProfileSettings(adminUid);

// Salvar configurações (server-side)
await saveProfileSettings(settings, adminUid);
```

## 🚀 Migração de Dados

### Script de Migração
Execute o script para migrar dados existentes:

```bash
npx ts-node scripts/migrate-profile-settings.ts
```

O script:
1. ✅ Busca o ProfileSettings global (`admin/profileSettings`)
2. ✅ Lista todos os admins na coleção `admins`
3. ✅ Cria configurações individuais para cada admin
4. ✅ Mantém o global para retrocompatibilidade
5. ✅ Pula admins que já possuem configurações

### Saída Esperada
```
🚀 Starting Profile Settings Migration...
📦 Fetching global ProfileSettings...
✅ Global ProfileSettings loaded successfully
   Name: Italo Santos
   Email: pix@italosantos.com

👥 Fetching all admin users...
✅ Found 3 admin(s)

📝 Processing admin: Italo Santos
   UID: abc123...
   Email: italo@example.com
   Username: severepics
   ✅ Profile settings migrated successfully

📊 Migration Summary:
============================================================
✅ Successfully migrated: 3
⏭️  Skipped (already exists): 0
❌ Errors: 0
📦 Total admins processed: 3
============================================================
```

## 🛣️ Rotas do Sistema

### Páginas Públicas
- `/` - Homepage do main admin
- `/{username}` - Página de perfil do admin com username específico

### Páginas de Admin
- `/admin/register` - Registro de novo admin (com campo username)
- `/admin/settings` - Edição do perfil do admin logado
- `/admin/dashboard` - Dashboard do admin

### API Routes
- `GET /api/admin/profile-settings?adminUid={uid}` - Buscar configurações
- `POST /api/admin/profile-settings` - Salvar configurações
  ```json
  {
    "settings": {...},
    "adminUid": "abc123..."
  }
  ```

## 📝 Nomes Reservados

Os seguintes usernames não podem ser usados:
```typescript
const RESERVED_USERNAMES = [
  'admin', 'api', 'auth', 'dashboard', 'login', 'register', 
  'logout', 'perfil', 'assinante', 'galeria', 'galeria-aberta',
  'configuracoes', 'settings', 'profile', 'user', 'conta',
  'payments', 'pagamentos', 'checkout'
];
```

## 🔒 Validação de Username

### Formato Aceito
- Regex: `/^[a-z0-9-_]{3,20}$/`
- Apenas letras minúsculas, números, hífen e underscore
- Mínimo: 3 caracteres
- Máximo: 20 caracteres

### Validação em Tempo Real
```typescript
const handleUsernameChange = async (value: string) => {
  setIsValidatingUsername(true);
  const validation = await validateUsername(value);
  setUsernameValidation(validation);
  setIsValidatingUsername(false);
};
```

### Mensagens de Validação
- ✅ "Username disponível"
- ❌ "Username muito curto (mínimo 3 caracteres)"
- ❌ "Username muito longo (máximo 20 caracteres)"
- ❌ "Username pode conter apenas letras, números, hífen e underscore"
- ❌ "Username já está em uso"
- ❌ "Username reservado pelo sistema"

## 🎯 Fluxo de Criação de Admin

1. **Registro** (`/admin/register`)
   - ✅ Verificação dupla (Email + SMS)
   - ✅ Face ID registration
   - ✅ Input de username com validação
   - ✅ Preview da URL: `italosantos.com/{username}`
   
2. **Criação do Documento**
   ```typescript
   await ensureAdminDoc(user, name, phone, username);
   ```
   - Cria documento em `admins/{uid}`
   - Define `isMainAdmin: true` se for o primeiro admin
   - Username armazenado em lowercase

3. **Criação das Configurações**
   - Configurações padrão criadas automaticamente
   - Ou migradas do global se existir

4. **Acesso ao Dashboard**
   - Admin pode editar suas próprias configurações
   - Cada admin vê apenas seu próprio perfil

## 🌐 Páginas de Perfil

### Estrutura
```tsx
// src/app/[username]/page.tsx
export default function UsernamePage() {
  const { username } = useParams();
  
  // 1. Buscar admin por username
  const admin = await getAdminByUsername(username);
  
  // 2. Buscar configurações do perfil
  const profileRef = doc(db, 'admins', admin.uid, 'profile', 'settings');
  const profileSnap = await getDoc(profileRef);
  
  // 3. Renderizar página com dados do admin
  return <ProfilePage profile={profileData} />;
}
```

### Componentes Incluídos
- Header com foto de capa
- Botões de Login e Sign Up
- PayPal Hosted Button
- Feature Marquee
- Reviews Section
- About Section
- Contact Section
- Footer

## 📊 Exemplo de Uso

### Criar Novo Admin
```typescript
// No registro
const username = "severepics";
const validation = await validateUsername(username);

if (validation.valid) {
  await ensureAdminDoc(user, name, phone, username);
  // Admin criado com URL: italosantos.com/severepics
}
```

### Editar Configurações do Admin
```typescript
// No dashboard (/admin/settings)
const { user } = useAuth();

// Carregar configurações do admin atual
const settings = await getProfileSettings(user.uid);

// Editar e salvar
settings.name = "Novo Nome";
await saveProfileSettings(settings, user.uid);
```

### Acessar Perfil Público
```
https://italosantos.com/severepics
https://italosantos.com/lucas
https://italosantos.com/maria
```

## 🔄 Retrocompatibilidade

O sistema mantém compatibilidade com a estrutura anterior:
- ✅ Se `adminUid` não for fornecido, usa o global (`admin/profileSettings`)
- ✅ Código antigo continua funcionando
- ✅ Migração é opcional mas recomendada

## ⚠️ Observações Importantes

1. **Primeiro Admin**
   - É automaticamente marcado como `isMainAdmin: true`
   - Seu perfil aparece na URL raiz (`/`)

2. **Username Único**
   - Cada username deve ser único no sistema
   - Validação no banco de dados antes de criar

3. **Lowercase Obrigatório**
   - Username sempre armazenado em lowercase
   - URLs são case-insensitive

4. **Configurações Independentes**
   - Cada admin tem suas próprias fotos, galerias, redes sociais
   - Não há compartilhamento de dados entre admins

## 📚 Arquivos Modificados

### Serviços
- `src/services/admin-auth-service.ts` - Username validation e queries
- `src/services/profile-config-service.ts` - Cache per-admin

### Server Actions
- `src/app/admin/settings/actions.ts` - getProfileSettings(adminUid), saveProfileSettings(settings, adminUid)

### API Routes
- `src/app/api/admin/profile-settings/route.ts` - Support adminUid query param

### Páginas
- `src/app/admin/register/page.tsx` - Username input com validation
- `src/app/admin/settings/page.tsx` - Edit current admin only
- `src/app/[username]/page.tsx` - Dynamic profile page (NEW)

### Scripts
- `scripts/migrate-profile-settings.ts` - Migration script (NEW)

## ✅ Checklist de Implementação

- [x] Username field na collection admins
- [x] Validação de username (formato, reservado, unicidade)
- [x] getAdminByUsername query
- [x] Rota dinâmica [username]/page.tsx
- [x] ProfileSettings por admin individual
- [x] API route com suporte a adminUid
- [x] ProfileConfigService com cache per-admin
- [x] Admin settings page editando apenas o admin atual
- [x] Indicador visual do admin sendo editado
- [x] Script de migração de dados
- [x] isMainAdmin flag para primeiro admin
- [x] Username input no registro com preview da URL

## 🎉 Sistema Pronto!

O sistema multi-perfil está completamente funcional. Cada administrador agora tem:
- ✅ Username único
- ✅ URL personalizada
- ✅ Configurações de perfil individuais
- ✅ Dashboard próprio
- ✅ Página pública de perfil

Acesse: `italosantos.com/{username}` para ver o perfil de qualquer admin!
