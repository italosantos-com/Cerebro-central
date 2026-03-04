# ⭐ SuperAdmin Configuration System

## 📋 Visão Geral

O **SuperAdmin** é o primeiro administrador criado no sistema (marcado com `isMainAdmin: true`). Suas configurações utilizam os **dados existentes e atuais** do Cloud Firestore da estrutura global.

### Estrutura de Dados

Existem **duas camadas** de armazenamento sincronizadas:

```
1. GLOBAL (Legado - Fonte da Verdade)
   └─ admin/profileSettings  ← Dados atuais de italosantos.com

2. INDIVIDUAL (Nova estrutura)
   └─ admins/{superAdminUid}/profile/settings  ← Sincronizado automaticamente
```

**Princípio**: O SuperAdmin **SEMPRE** usa dados da estrutura GLOBAL como fonte de verdade, com fallback para individual.

## 🔄 Sincronização

### Fluxo de Sincronização

```
┌─────────────────────────────────────────────┐
│     admin/profileSettings (GLOBAL)          │ ← Fonte da Verdade
│     - name: "Italo Santos"                  │
│     - email: "italo@italosantos.com"        │
│     - profilePictureUrl: "..."              │
│     - socialMedia: {...}                    │
└─────────────────────────────────────────────┘
                      ↓ Sincroniza
┌─────────────────────────────────────────────┐
│   admins/{uid}/profile/settings (INDIVIDUAL)│
│   - isMainAdmin: true                       │
│   - ... (cópia dos dados acima)             │
│   - lastSync: "2024-01-02T10:00:00Z"        │
└─────────────────────────────────────────────┘
```

### Como Funciona

1. **Leitura**: Sempre carrega do GLOBAL primeiro
2. **Atualização**: Sempre salva no GLOBAL primeiro
3. **Sincronização**: Copia dados do GLOBAL para INDIVIDUAL automaticamente
4. **Fallback**: Se GLOBAL não existir, usa INDIVIDUAL

## 🚀 Como Usar

### 1. Hook `useSuperAdminConfig` (Frontend)

```typescript
'use client';

import { useSuperAdminConfig } from '@/hooks/useSuperAdminConfig';

export function AdminSettingsPage() {
  const {
    config,
    isLoading,
    error,
    isMainAdmin,
    updateConfig,
    refreshConfig,
    checkSync,
    forceSync,
  } = useSuperAdminConfig();

  if (isLoading) return <p>Carregando...</p>;
  if (error) return <p>Erro: {error}</p>;
  if (!config) return <p>Nenhuma config encontrada</p>;

  const handleUpdateName = async (newName: string) => {
    try {
      await updateConfig({ name: newName });
      alert('Nome atualizado!');
    } catch (err) {
      alert('Erro ao atualizar nome');
    }
  };

  const handleCheckSync = async () => {
    const status = await checkSync();
    console.log('Sync status:', status);
  };

  return (
    <div>
      <h1>Configurações do Admin</h1>
      {isMainAdmin && <span>⭐ Este é o SuperAdmin</span>}

      <div>
        <label>Nome:</label>
        <input
          value={config.name}
          onChange={(e) => handleUpdateName(e.target.value)}
        />
      </div>

      <div>
        <label>Email:</label>
        <input value={config.email} disabled />
      </div>

      <div>
        <label>Bio:</label>
        <textarea
          value={config.description || ''}
          onChange={(e) =>
            updateConfig({ description: e.target.value })
          }
        />
      </div>

      <button onClick={handleCheckSync}>Verificar Sincronização</button>
      <button onClick={forceSync}>Forçar Sincronização</button>
    </div>
  );
}
```

### 2. Serviço Backend (Server-side)

```typescript
import { getSuperAdminConfig, updateSuperAdminGlobalConfig } from '@/lib/superadmin-config-service';

// Obter config do SuperAdmin
async function getSuperAdminSettings() {
  const config = await getSuperAdminConfig();
  return {
    name: config?.name,
    profilePictureUrl: config?.profilePictureUrl,
    socialMedia: config?.socialMedia,
  };
}

// Atualizar config do SuperAdmin
async function updateSuperAdminSettings(updates: any) {
  await updateSuperAdminGlobalConfig(updates);
  console.log('✅ Config atualizada');
}

export async function GET(request: NextRequest) {
  const config = await getSuperAdminConfig();
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  const updates = await request.json();
  await updateSuperAdminGlobalConfig(updates);
  return NextResponse.json({ success: true });
}
```

### 3. Migração de Dados Existentes

```typescript
import { migrateSuperAdminData, checkMigrationStatus } from '@/lib/superadmin-migration';

// Executar migração (uma vez)
async function runMigration() {
  const report = await migrateSuperAdminData();

  console.log('📊 Relatório da Migração:');
  console.log('  Status:', report.status);
  console.log('  Admins encontrados:', report.adminsFound);
  console.log('  Sincronizações completadas:', report.syncsCompleted);
  console.log('  Erros:', report.errors.length);

  return report;
}

// Verificar status
async function checkStatus() {
  const status = await checkMigrationStatus();

  console.log('✅ Migração Completa:', status.isMigrated);
  console.log('  Global Config:', status.globalConfigExists);
  console.log('  SuperAdmin:', status.superAdminExists, `(${status.superAdminUid})`);
  console.log('  Admins:', status.adminsCount);
  console.log('  Sincronizações:', status.syncsCount);

  return status;
}
```

## 📊 Exemplos Práticos

### Exemplo 1: Carregar Dados do SuperAdmin em Página Pública

```typescript
// src/app/[username]/page.tsx
import { getSuperAdminConfig } from '@/lib/superadmin-config-service';

export default async function PublicProfilePage() {
  const config = await getSuperAdminConfig();

  if (!config) {
    return <p>Perfil não encontrado</p>;
  }

  return (
    <div>
      <h1>{config.name}</h1>
      {config.profilePictureUrl && (
        <img src={config.profilePictureUrl} alt={config.name} />
      )}
      <p>{config.description}</p>

      {/* Redes Sociais */}
      {config.socialMedia && (
        <div>
          {config.socialMedia.instagram && (
            <a href={`https://instagram.com/${config.socialMedia.instagram}`}>
              Instagram
            </a>
          )}
          {config.socialMedia.twitter && (
            <a href={`https://twitter.com/${config.socialMedia.twitter}`}>
              Twitter
            </a>
          )}
        </div>
      )}

      {/* Footer */}
      {config.footerSettings && (
        <footer>
          {config.footerSettings.aboutText && <p>{config.footerSettings.aboutText}</p>}
        </footer>
      )}
    </div>
  );
}
```

### Exemplo 2: Verificar Inconsistência de Sincronização

```typescript
'use client';

import { useSuperAdminConfig } from '@/hooks/useSuperAdminConfig';

export function SyncStatusComponent() {
  const { checkSync, forceSync } = useSuperAdminConfig();
  const [syncStatus, setSyncStatus] = useState<any>(null);

  const handleCheckSync = async () => {
    try {
      const status = await checkSync();
      setSyncStatus(status);

      if (!status.isSynced) {
        alert(`⚠️ Dessincronizado! Campos diferentes: ${status.missingFields.join(', ')}`);
      } else {
        alert('✅ Tudo sincronizado!');
      }
    } catch (error) {
      alert('Erro ao verificar sincronização');
    }
  };

  const handleForceSync = async () => {
    try {
      await forceSync();
      alert('✅ Sincronização forçada com sucesso!');
      await handleCheckSync(); // Verificar novamente
    } catch (error) {
      alert('❌ Erro ao forçar sincronização');
    }
  };

  return (
    <div>
      <button onClick={handleCheckSync}>Verificar Sincronização</button>
      <button onClick={handleForceSync}>Forçar Sincronização</button>

      {syncStatus && (
        <div>
          <p>Status: {syncStatus.isSynced ? '✅ Sincronizado' : '⚠️ Dessincronizado'}</p>
          {syncStatus.missingFields.length > 0 && (
            <p>Campos diferentes: {syncStatus.missingFields.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

### Exemplo 3: Hook Read-Only para Páginas Públicas

```typescript
import { useSuperAdminConfigRead } from '@/hooks/useSuperAdminConfig';

export function PublicFooter() {
  const { config, isLoading } = useSuperAdminConfigRead();

  if (isLoading) return <footer>Carregando...</footer>;

  return (
    <footer>
      <div className="footer-content">
        {config?.footerSettings?.aboutText && (
          <p>{config.footerSettings.aboutText}</p>
        )}

        {config?.socialMedia && (
          <div className="social-links">
            {config.socialMedia.instagram && (
              <a href={`https://instagram.com/${config.socialMedia.instagram}`}>
                @{config.socialMedia.instagram}
              </a>
            )}
            {config.socialMedia.twitter && (
              <a href={`https://twitter.com/${config.socialMedia.twitter}`}>
                @{config.socialMedia.twitter}
              </a>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
```

## 🔧 API Reference

### Funções Principais

#### `getSuperAdminConfig(superAdminUid?: string)`
Obtém configuração do SuperAdmin (global → individual → null)

```typescript
const config = await getSuperAdminConfig();
// ou com UID específico
const config = await getSuperAdminConfig('uid123');
```

#### `updateSuperAdminGlobalConfig(updates: Partial<SuperAdminConfig>)`
Atualiza configuração global do SuperAdmin

```typescript
await updateSuperAdminGlobalConfig({
  name: 'Novo Nome',
  description: 'Nova bio',
});
```

#### `syncGlobalToIndividual(superAdminUid: string)`
Sincroniza GLOBAL → INDIVIDUAL

```typescript
await syncGlobalToIndividual('uid123');
```

#### `checkSuperAdminSync(superAdminUid: string)`
Verifica status de sincronização

```typescript
const status = await checkSuperAdminSync('uid123');
console.log(status.isSynced);        // boolean
console.log(status.missingFields);   // string[]
```

#### `forceSuperAdminSync(superAdminUid: string)`
Força sincronização completa

```typescript
await forceSuperAdminSync('uid123');
```

## 📚 Estrutura de Dados

```typescript
interface SuperAdminConfig {
  // Básico
  name: string;
  email: string;
  phone?: string;
  username: string;
  isMainAdmin?: boolean;

  // Perfil
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  description?: string;

  // Redes Sociais
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
    telegram?: string;
    linkedin?: string;
  };

  // Pagamentos
  paymentSettings?: {
    pixKey?: string;
    pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
    stripeAccountId?: string;
    paypalEmail?: string;
    mercadopagoAccountId?: string;
  };

  // Avaliações
  reviewSettings?: {
    acceptReviews: boolean;
    autoApproveReviews: boolean;
    maxReviewsPerUser: number;
  };

  // Rodapé
  footerSettings?: {
    showAbout: boolean;
    aboutText?: string;
    showContact: boolean;
    showLinks: boolean;
    links?: Array<{ label: string; url: string }>;
  };

  // Galeria
  galleryPhotos?: Array<{
    url: string;
    title?: string;
    order?: number;
  }>;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  lastSync?: string;
}
```

## ✅ Checklist de Configuração

- [ ] Dados globais existentes em `admin/profileSettings`
- [ ] SuperAdmin identificado (isMainAdmin=true)
- [ ] Migração de dados executada (`migrateSuperAdminData()`)
- [ ] Status da migração verificado (`checkMigrationStatus()`)
- [ ] Sincronização funcionando corretamente
- [ ] Páginas públicas carregando config do SuperAdmin
- [ ] Dashboard de admin usando `useSuperAdminConfig()`
- [ ] Fallback para INDIVIDUAL se GLOBAL não existir

## 🚀 Próximos Passos

1. Executar migração dos dados atuais
2. Verificar status da migração
3. Implementar em páginas públicas
4. Testar sincronização
5. Monitorar inconsistências

## 📞 Troubleshooting

**P: Config não carrega?**  
R: Verifique se `admin/profileSettings` existe ou se há SuperAdmin com `isMainAdmin=true`

**P: Sincronização não funciona?**  
R: Chame `forceSuperAdminSync()` para forçar ou verifique Firestore rules

**P: Campos faltando?**  
R: Use `checkSync()` para ver quais campos estão diferentes

**P: Como reverter migração?**  
R: Use `rollbackMigration()` (com cuidado!)

