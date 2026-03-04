# 🗂️ Admin Storage System - Estrutura de Armazenamento para Administradores

## 📋 Visão Geral

Cada administrador do sistema tem sua própria pasta isolada no Firebase Storage, com subpastas organizadas por tipo de conteúdo:

```
admins/
├── {adminUid1}/
│   ├── photos/           📷 Fotos do perfil, capa, galeria
│   ├── videos/           🎥 Vídeos publicados
│   ├── uploads/          📁 Uploads gerais e temporários
│   ├── cache/            ⚡ Cache de dados (Twitter, Instagram, etc)
│   └── config/           ⚙️ Configurações e metadados do admin
├── {adminUid2}/
│   ├── photos/
│   ├── videos/
│   ├── uploads/
│   ├── cache/
│   └── config/
└── {adminUidN}/
```

## 🔒 Segurança

### Storage Rules
```firestore
match /admins/{adminUid}/{allPaths=**} {
  // ✅ LEITURA: Pública (qualquer um pode ver fotos/vídeos)
  allow read: if true;
  
  // ✅ ESCRITA: Apenas o admin proprietário (com token admin)
  allow write: if request.auth.uid == adminUid && 
                  request.auth.token.admin == true;
}
```

## 📚 Como Usar

### 1️⃣ Gerenciar Storage com `AdminStorageManager`

Classe principal para gerenciar o armazenamento de um admin:

```typescript
import { AdminStorageManager } from '@/lib/admin-storage';

// Criar instância do gerenciador
const manager = new AdminStorageManager(adminUid);

// Upload de foto
await manager.uploadPhoto('profile.jpg', photoFile);

// Upload de vídeo
await manager.uploadVideo('intro.mp4', videoFile);

// Upload genérico
await manager.uploadFile('document.pdf', documentFile);

// Listar fotos
const photos = await manager.listPhotos();

// Deletar foto
await manager.deletePhoto('profile.jpg');

// Limpar pasta inteira
await manager.clearFolder('cache');
```

### 2️⃣ Usar Hook `useAdminStorage` no Frontend

Hook React para gerenciar uploads com progresso:

```typescript
'use client';

import { useAdminStorage } from '@/hooks/useAdminStorage';

export function PhotoUploadComponent() {
  const {
    isUploading,
    uploadProgress,
    error,
    uploadPhoto,
    uploadVideo,
    uploadFile,
  } = useAdminStorage();

  const handlePhotoUpload = async (file: File) => {
    try {
      const downloadURL = await uploadPhoto(file);
      console.log('Foto salva em:', downloadURL);
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => e.target.files && handlePhotoUpload(e.target.files[0])}
        disabled={isUploading}
      />
      {isUploading && <p>Enviando: {uploadProgress?.percentage}%</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### 3️⃣ Caminhos e URLs

Obter caminhos de arquivos:

```typescript
import { getAdminFilePath, getAdminFolderPath } from '@/lib/admin-storage';

// Caminho de uma pasta
const folderPath = getAdminFolderPath(adminUid, 'photos');
// Resultado: 'admins/uid123/photos'

// Caminho completo de um arquivo
const filePath = getAdminFilePath(adminUid, 'photos', 'profile.jpg');
// Resultado: 'admins/uid123/photos/profile.jpg'

// Obter URL de download
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

const fileRef = ref(storage, filePath);
const downloadURL = await getDownloadURL(fileRef);
// Resultado: https://firebasestorage.googleapis.com/.../profile.jpg?alt=media&token=...
```

### 4️⃣ Gerar Nomes de Arquivo Únicos

```typescript
import { generateUniqueFilename, generateCacheFilename } from '@/lib/admin-storage';

// Gerar nome único com timestamp
const filename = generateUniqueFilename('photo.jpg');
// Resultado: '1704110400000_photo.jpg'

// Gerar nome para cache com expiração
const cacheFile = generateCacheFilename('twitter_data', 24); // 24 horas
// Resultado: 'twitter_data_1704110400000.cache'
```

### 5️⃣ Gerenciar Cache

Sistema de cache (memória + storage) para dados do admin:

```typescript
import { getAdminCacheService } from '@/lib/admin-cache-service';

const cacheService = getAdminCacheService(adminUid);

// Salvar dados em cache (24 horas por padrão)
await cacheService.set('twitter_followers', data);
await cacheService.set('instagram_posts', data, 12); // 12 horas

// Recuperar dados do cache
const followers = await cacheService.get('twitter_followers');

// Verificar se existe em cache
const hasData = await cacheService.has('instagram_posts');

// Remover do cache
await cacheService.delete('twitter_followers');

// Limpar tudo
await cacheService.clear();

// Estatísticas
const stats = await cacheService.getStats();
console.log(`Cache: ${stats.size} itens`);
```

#### Helpers para Cache de Redes Sociais

```typescript
import {
  cacheTwitterData,
  getTwitterDataFromCache,
  cacheInstagramData,
  getInstagramDataFromCache,
} from '@/lib/admin-cache-service';

// Twitter
await cacheTwitterData(adminUid, twitterData);
const cachedTwitter = await getTwitterDataFromCache(adminUid);

// Instagram
await cacheInstagramData(adminUid, instagramData);
const cachedInstagram = await getInstagramDataFromCache(adminUid);
```

## 📂 Exemplos Práticos

### Exemplo 1: Upload de Foto de Perfil

```typescript
'use client';

import { useAuth } from '@/contexts/AuthProvider';
import { AdminStorageManager } from '@/lib/admin-storage';

export function ProfilePhotoUpload() {
  const { user } = useAuth();

  const handleUpload = async (file: File) => {
    if (!user) return;

    const manager = new AdminStorageManager(user.uid);
    const filename = `profile_${Date.now()}.jpg`;

    try {
      const result = await manager.uploadPhoto(filename, file);
      console.log('Foto de perfil enviada:', result);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <input
      type="file"
      accept="image/*"
      onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
    />
  );
}
```

### Exemplo 2: Galeria de Vídeos

```typescript
'use client';

import { useAdminStorage } from '@/hooks/useAdminStorage';
import { useState, useEffect } from 'react';

export function VideoGallery() {
  const { listFiles } = useAdminStorage();
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    listFiles('videos').then(setVideos);
  }, [listFiles]);

  return (
    <div className="grid gap-4">
      {videos.map((video) => (
        <div key={video.name}>
          <p>{video.name}</p>
          <video src={`/api/file/admins/${video.name}`} controls />
        </div>
      ))}
    </div>
  );
}
```

### Exemplo 3: Cache de Dados do Twitter

```typescript
import { getAdminCacheService } from '@/lib/admin-cache-service';

async function updateTwitterCache(adminUid: string) {
  const cacheService = getAdminCacheService(adminUid);
  
  // Verificar se dados já estão em cache e válidos
  const cachedData = await cacheService.get('twitter_data');
  if (cachedData) {
    console.log('Usando dados do Twitter do cache');
    return cachedData;
  }

  // Se não estiver em cache, buscar da API
  console.log('Buscando dados do Twitter...');
  const freshData = await fetchTwitterData(adminUid);

  // Salvar em cache por 12 horas
  await cacheService.set('twitter_data', freshData, 12);

  return freshData;
}
```

### Exemplo 4: API Route para Upload

```typescript
// src/app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AdminStorageManager } from '@/lib/admin-storage';
import { requireAdminAuth } from '@/lib/admin-api-middleware';

export async function POST(request: NextRequest) {
  const { isValid, adminUid, response } = await requireAdminAuth(request);
  if (!isValid) return response;

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const folder = (formData.get('folder') as string) || 'uploads';

  if (!file) {
    return NextResponse.json(
      { error: 'Arquivo não fornecido' },
      { status: 400 }
    );
  }

  try {
    const manager = new AdminStorageManager(adminUid);
    const filename = `${Date.now()}_${file.name}`;

    if (folder === 'photos') {
      await manager.uploadPhoto(filename, file);
    } else if (folder === 'videos') {
      await manager.uploadVideo(filename, file);
    } else {
      await manager.uploadFile(filename, file);
    }

    return NextResponse.json({
      success: true,
      filename,
      path: `admins/${adminUid}/${folder}/${filename}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao fazer upload' },
      { status: 500 }
    );
  }
}
```

## 🔗 Endpoints Suportados

### Upload (POST)
```
POST /api/admin/upload
Content-Type: multipart/form-data

form-data:
  - file: <arquivo>
  - folder: 'photos' | 'videos' | 'uploads'
```

### Download (GET)
```
GET /api/file/admins/{adminUid}/{folder}/{filename}
```

### Listar Arquivos (GET)
```
GET /api/admin/files/{folder}
```

## 📊 Estrutura do Firestore (Metadata)

Cada arquivo carrega metadados personalizados:

```json
{
  "adminUid": "uid123",
  "folder": "photos",
  "uploadedAt": "2024-01-02T10:00:00Z",
  "originalName": "photo.jpg",
  "size": "2048576"
}
```

## ⚙️ Configurações Recomendadas

### Limpeza Automática de Cache

```typescript
// Executar periodicamente (por exemplo, a cada 24h)
async function cleanupExpiredCache(adminUid: string) {
  const cacheService = getAdminCacheService(adminUid);
  
  // Limpar caches expirados
  await cacheService.clear();
  
  console.log('Cache expirado removido');
}
```

### Backup de Configurações

```typescript
// src/app/api/admin/backup/route.ts
import { AdminStorageManager } from '@/lib/admin-storage';

async function backupAdminConfig(adminUid: string) {
  const manager = new AdminStorageManager(adminUid);
  
  const config = {
    backup_date: new Date().toISOString(),
    admin_uid: adminUid,
    // ... outras configurações
  };

  await manager.uploadFile(
    `config_backup_${Date.now()}.json`,
    new Blob([JSON.stringify(config)], { type: 'application/json' })
  );
}
```

## 📈 Performance

- **Cache em Memória**: Acesso rápido aos dados frequentemente acessados
- **Cache em Storage**: Persistência entre execuções
- **Lazy Loading**: Dados carregados conforme necessário
- **TTL (Time To Live)**: Cache com expiração automática

## 🚀 Migração de Dados Antigos

Se você tem arquivos em estrutura antiga (`/uploads/*`), migre para a nova:

```typescript
import { storage } from '@/lib/firebase';
import { ref, listAll, copyString } from 'firebase/storage';

async function migrateOldStorage(adminUid: string) {
  const oldRef = ref(storage, 'uploads');
  const newManager = new AdminStorageManager(adminUid);

  const { items } = await listAll(oldRef);

  for (const item of items) {
    // Copiar para nova estrutura
    const data = await getBytes(item);
    await newManager.uploadFile(item.name, data);
  }

  console.log(`✅ Migrados ${items.length} arquivos`);
}
```

## 📝 Checklist de Implementação

- [x] Estrutura de pastas `admins/{adminUid}/**`
- [x] `AdminStorageManager` para gerenciar arquivos
- [x] Hook `useAdminStorage` para frontend
- [x] Serviço de cache `AdminCacheService`
- [x] Storage rules com isolamento por admin
- [ ] API routes para upload/download
- [ ] Limpeza automática de caches expirados
- [ ] Backup de configurações
- [ ] Migração de dados antigos

## ❓ FAQ

**P: Quantos uploads por admin?**  
R: Sem limite técnico. O Firebase Storage é escalável. Recomendo limitar por quota de projeto.

**P: Como controlar tamanho de arquivos?**  
R: Validar no frontend antes de upload, e na API se necessário.

**P: Dados de cache expiram automaticamente?**  
R: Não no Storage, apenas na memória. Implemente limpeza periódica se necessário.

**P: URLs de download são permanentes?**  
R: Sim, com token. URLs sem token expiram em ~2 horas por padrão.

**P: Posso compartilhar arquivos entre admins?**  
R: Não pela estrutura atual. Crie uma pasta `/shared/*` se necessário.

