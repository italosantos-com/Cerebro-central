# Sistema de Armazenamento de Mídias Multi-Provider

## 📋 Visão Geral

Sistema diferenciado de armazenamento de mídias baseado no tipo de usuário:

- **SuperAdmin (severepics)**: Firebase Storage (serviço nativo)
- **Admins Regulares**: Google Drive, Google One, YouTube, iCloud Drive

## 🏗️ Arquitetura

### 1. Serviço Principal
**Arquivo**: `src/services/cloud-storage-providers.ts`

- Gerencia todos os providers de armazenamento
- Roteamento inteligente baseado em role e tipo de mídia
- Validações de tipo de arquivo e limites de tamanho

### 2. API Routes

#### Firebase Storage (SuperAdmin)
- Usa a API existente em `/api/upload`
- Armazenamento nativo do Firebase
- Limite: 5GB por arquivo

#### Google Drive
**Endpoint**: `/api/storage/google-drive`
- Arquivos gerais e documentos
- Limite: 15GB (conta gratuita)
- Métodos: POST (upload), GET (info), DELETE

#### Google One
**Endpoint**: `/api/storage/google-one`
- Backup de arquivos grandes
- Upload resumable para arquivos grandes
- Limite: 15GB (gratuito) a 2TB (pago)
- Métodos: POST (upload), GET (quota)

#### YouTube
**Endpoint**: `/api/storage/youtube`
- Upload de vídeos
- Privacidade configurável (public, unlisted, private)
- Limite: 256GB ou 12h de vídeo
- Métodos: POST (upload), GET (info), DELETE

#### iCloud Drive
**Endpoint**: `/api/storage/icloud-drive`
- Galeria de fotos
- Sincronização com dispositivos Apple
- Limite: 5GB (gratuito)
- Métodos: POST (upload), GET (info)

### 3. Componentes UI

#### Storage Integrations Settings
**Arquivo**: `src/components/admin/storage-integrations-settings.tsx`

Componente para configurar integrações:
- Status de conexão
- Quota de armazenamento
- Botões de conectar/desconectar
- Indicadores visuais

### 4. API de Status
**Endpoint**: `/api/admin/integrations/status`

Retorna status de todas as integrações do admin:
```json
{
  "success": true,
  "integrations": [
    {
      "provider": "google-drive",
      "connected": true,
      "lastSync": "2026-02-05T10:30:00Z",
      "quota": {
        "used": 1073741824,
        "total": 16106127360,
        "available": 15032385536
      }
    }
  ]
}
```

## 🔄 Fluxo de Upload

### Para SuperAdmin:
1. Upload de arquivo via `/api/upload`
2. Sistema detecta que é SuperAdmin
3. Armazena no Firebase Storage
4. Retorna URL pública do Firebase

### Para Admins Regulares:
1. Upload de arquivo via `/api/upload`
2. Sistema detecta tipo de mídia:
   - **Vídeo** → YouTube
   - **Imagem** → iCloud Drive
   - **Arquivo** → Google Drive/One
3. Redireciona para API do provider específico
4. Provider faz upload
5. Salva metadados no Firestore
6. Retorna URL do provider externo

## 🔐 Autenticação

### OAuth 2.0 (Google Services)
Necessário configurar:
- Client ID
- Client Secret
- Redirect URI
- Scopes necessários

### iCloud
Requer:
- Apple ID
- Session Token
- 2FA configurado

### Estrutura no Firestore
```typescript
admins/{adminUid} {
  googleDrive: {
    accessToken: string,
    refreshToken: string,
    expiresAt: timestamp,
    folderId: string,
    quota: {
      used: number,
      total: number,
      available: number
    }
  },
  youtube: {
    accessToken: string,
    refreshToken: string,
    channelId: string
  },
  icloud: {
    sessionToken: string,
    dsid: string,
    keyId: string
  }
}
```

## 📊 Limites e Quotas

| Provider | Limite por Arquivo | Quota Total (Gratuito) |
|----------|-------------------|------------------------|
| Firebase Storage | 5GB | Ilimitado* |
| Google Drive | 15GB | 15GB |
| Google One | 2TB | 15GB - 2TB |
| YouTube | 256GB | Ilimitado |
| iCloud Drive | 5GB | 5GB |

*Sujeito aos limites do plano Firebase

## 🚀 Como Usar

### 1. Configurar Integrações
```tsx
import StorageIntegrationsSettings from '@/components/admin/storage-integrations-settings';

<StorageIntegrationsSettings />
```

### 2. Upload Automático
```typescript
// O sistema escolhe automaticamente o provider
const formData = new FormData();
formData.append('file', file);
formData.append('title', 'Minha mídia');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const data = await response.json();
// data.provider: 'youtube' | 'icloud-drive' | 'google-drive' | 'firebase-storage'
// data.url: URL pública do arquivo
```

### 3. Upload Manual para Provider Específico
```typescript
// Upload direto para YouTube
const formData = new FormData();
formData.append('file', videoFile);
formData.append('title', 'Meu Vídeo');
formData.append('privacy', 'unlisted');

const response = await fetch('/api/storage/youtube', {
  method: 'POST',
  body: formData
});
```

## 🔧 Variáveis de Ambiente

Adicionar ao `.env.local`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# YouTube
YOUTUBE_API_KEY=your_youtube_api_key

# iCloud (opcional)
ICLOUD_APP_ID=your_icloud_app_id
ICLOUD_TEAM_ID=your_team_id
```

## 📝 TODO

- [ ] Implementar OAuth flows para Google Services
- [ ] Configurar iCloud CloudKit API
- [ ] Adicionar progress bars para uploads grandes
- [ ] Implementar sincronização automática
- [ ] Criar dashboard de uso de storage
- [ ] Adicionar suporte para Dropbox/OneDrive
- [ ] Implementar compressão automática de imagens
- [ ] Gerar thumbnails para vídeos

## 🐛 Troubleshooting

### Erro: "Autenticação não configurada"
- Verificar se as credenciais OAuth estão no documento do admin
- Reconectar a integração em Configurações > Integrações

### Erro: "Upload falhou"
- Verificar quota disponível
- Verificar tipo de arquivo suportado
- Verificar token de acesso não expirado

### Erro: "Provider não disponível"
- Verificar se a integração está conectada
- Renovar tokens OAuth se necessário

## 📚 Referências

- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Google Drive API](https://developers.google.com/drive/api/guides/about-sdk)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [CloudKit (iCloud)](https://developer.apple.com/icloud/cloudkit/)

## 🤝 Contribuindo

Para adicionar novos providers:

1. Criar função em `cloud-storage-providers.ts`
2. Adicionar API route em `/api/storage/{provider}`
3. Atualizar componente de integrações
4. Documentar limites e autenticação
