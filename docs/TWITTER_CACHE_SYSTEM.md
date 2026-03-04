# 🔄 Sistema de Cache Compartilhado do Twitter

## 📋 Visão Geral

O sistema de cache do Twitter foi atualizado para usar **Firestore**, permitindo que fotos e vídeos sejam **compartilhados entre todos os usuários e dispositivos**.

## ✅ Como Funciona Agora

### Cache Compartilhado (Firestore)

1. **Primeira Carga**: Quando um usuário autenticado acessa `/fotos` ou `/videos`, a API busca do Twitter e salva no Firestore
2. **Cargas Subsequentes**: Todos os outros usuários verão o mesmo cache (não precisa estar logado)
3. **Atualização**: Cache é mantido até que seja **forçadamente atualizado**

### Estrutura no Firestore

```
twitter_cache/
  ├── {username}/
  │   └── media/
  │       ├── photos
  │       │   ├── data: [...tweets]
  │       │   └── timestamp: 1234567890
  │       └── videos
  │           ├── data: [...tweets]
  │           └── timestamp: 1234567890
```

## 🎯 Métodos de Atualização

### 1. **Botão "Forçar Atualização" (Manual)**

Na interface das páginas `/fotos` e `/videos`:

```
┌─────────────────────────────────────────────┐
│ 🐦 Conta: @severetoys (25 fotos)           │
│                    [🔄 Forçar Atualização]  │
└─────────────────────────────────────────────┘
```

- ✅ Disponível para usuários autenticados
- ✅ Chama API com `?force=true`
- ✅ Atualiza cache no Firestore imediatamente
- ✅ Todos os usuários verão o novo cache

### 2. **Script Manual (CLI)**

Execute manualmente para forçar atualização:

```bash
# Método 1: Via npm script
npm run refresh-twitter-cache

# Método 2: Diretamente
node refresh-twitter-cache.js
```

**Pré-requisito**: Configure `ADMIN_REFRESH_TOKEN` no arquivo `.env`

### 3. **Cron Job Automático (Recomendado)**

Configure um cron job no servidor para atualizar automaticamente:

```bash
# Editar crontab
crontab -e

# Adicionar linha para atualizar a cada 30 minutos
*/30 * * * * cd /path/to/project && /usr/bin/node refresh-twitter-cache.js >> /path/to/project/logs/cron.log 2>&1

# Ou a cada hora
0 * * * * cd /path/to/project && /usr/bin/node refresh-twitter-cache.js >> /path/to/project/logs/cron.log 2>&1
```

### 4. **Firebase Scheduled Function (Cloud)**

Crie uma Cloud Function agendada (recomendado para produção):

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const refreshTwitterCache = functions
  .pubsub
  .schedule('every 30 minutes')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const bearerToken = functions.config().twitter.bearer_token;
    
    // Buscar username do admin
    const twitterAdminDoc = await admin.firestore()
      .collection('twitterAdmin')
      .doc('admin_user_id')
      .get();
    
    const username = twitterAdminDoc.data()?.username;
    
    if (!username) {
      console.error('Username não configurado');
      return;
    }
    
    // Buscar fotos e vídeos da API do Twitter
    // e salvar no Firestore em twitter_cache/{username}/media/...
    
    console.log('Cache atualizado com sucesso');
  });
```

Deploy:
```bash
firebase deploy --only functions:refreshTwitterCache
```

## 📊 Parâmetros da API

### `/api/twitter/fotos`

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `force` | boolean | `true` = ignora cache e busca da API |
| `max_results` | number | Quantidade de tweets (padrão: 50) |
| `pagination_token` | string | Token para próxima página |

**Exemplos:**
```bash
# Usar cache (se disponível)
GET /api/twitter/fotos

# Forçar atualização
GET /api/twitter/fotos?force=true

# Paginação
GET /api/twitter/fotos?max_results=50&pagination_token=abc123
```

### `/api/twitter/videos`

Mesmos parâmetros que `/api/twitter/fotos`.

## 🔐 Autenticação

### Usuários Finais
- Precisam estar autenticados (Firebase Auth)
- Token JWT via header: `Authorization: Bearer {token}`

### Script Automático
- Configure `ADMIN_REFRESH_TOKEN` no `.env`
- Obtenha o token fazendo login como admin e copiando do localStorage

## 📈 Vantagens do Sistema Atual

| Antes (localStorage) | Agora (Firestore) |
|---------------------|-------------------|
| ❌ Cache local por dispositivo | ✅ Cache compartilhado globalmente |
| ❌ Expira em 1 hora | ✅ Mantido até atualização forçada |
| ❌ Usuários anônimos sem cache | ✅ Todos veem o mesmo cache |
| ❌ Carregamento lento para novos usuários | ✅ Carregamento instantâneo |
| ❌ Inconsistência entre dispositivos | ✅ Consistência total |

## 🚀 Fluxo Completo

### Primeira Visita (Sem Cache)
```
Usuário → /fotos
    ↓
API verifica cache no Firestore
    ↓
Cache não existe
    ↓
API busca do Twitter
    ↓
Salva no Firestore
    ↓
Retorna para usuário
```

### Visitas Subsequentes (Com Cache)
```
Usuário → /fotos
    ↓
API verifica cache no Firestore
    ↓
Cache existe e válido
    ↓
Retorna cache (INSTANTÂNEO)
```

### Atualização Forçada
```
Usuário clica "Forçar Atualização"
    ↓
Frontend chama API com ?force=true
    ↓
API ignora cache
    ↓
Busca do Twitter
    ↓
Atualiza Firestore
    ↓
Todos os usuários veem novo cache
```

## 🔧 Configuração Inicial

### 1. Configurar Token de Admin

```bash
# .env
ADMIN_REFRESH_TOKEN=seu_token_aqui
```

### 2. Testar Script

```bash
npm run refresh-twitter-cache
```

### 3. Configurar Cron (Opcional)

```bash
# Linux/Mac
crontab -e

# Windows (Task Scheduler)
# Criar tarefa agendada executando:
# node C:\path\to\project\refresh-twitter-cache.js
```

### 4. Deploy Function (Produção)

```bash
firebase deploy --only functions:refreshTwitterCache
```

## 📝 Logs

Os logs de atualização são salvos em:
```
logs/twitter-cache-refresh.log
```

Exemplo:
```
[2025-11-13T10:00:00.000Z] Cache atualizado com sucesso (3.45s)
[2025-11-13T10:30:00.000Z] Cache atualizado com sucesso (2.98s)
[2025-11-13T11:00:00.000Z] ERRO: Bearer token não configurado
```

## ⚡ Performance

- **Cache Hit**: ~50ms (leitura do Firestore)
- **Cache Miss**: ~2-5s (API do Twitter + escrita no Firestore)
- **Atualização Forçada**: ~2-5s (API do Twitter + atualização do Firestore)

## 🎯 Recomendações

1. ✅ **Configure cron job** para atualizar a cada 30-60 minutos
2. ✅ **Use Firebase Functions** em produção (mais confiável)
3. ✅ **Monitore logs** para detectar problemas de API
4. ✅ **Configure alertas** se atualização falhar
5. ✅ **Mantenha bearer token** atualizado

## 🔍 Troubleshooting

### Cache não atualiza
- Verificar se `?force=true` está sendo passado
- Verificar logs de erro no console
- Confirmar que bearer token está válido

### Erro "Bearer token não configurado"
- Adicionar `TWITTER_BEARER_TOKEN` no `.env`
- Ou adicionar no Firestore em `twitter_config/bearer_token`

### Script falha no cron
- Verificar permissões do arquivo
- Usar caminho absoluto para node e script
- Redirecionar output para arquivo de log

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs em `logs/twitter-cache-refresh.log`
2. Verificar console do navegador (F12)
3. Verificar Firestore Collection `twitter_cache`

---

**Última Atualização**: Novembro 2025  
**Versão**: 2.0 (Firestore Shared Cache)
