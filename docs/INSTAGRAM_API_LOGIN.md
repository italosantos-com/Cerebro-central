# Instagram API with Instagram Login - Documentação Completa

**Data:** 22 de Janeiro de 2025
**Status:** ✅ IMPLEMENTADO

---

## 📋 Visão Geral

Integração completa com Instagram API usando Instagram Login, permitindo gerenciar conta, mídia, insights, comentários e mensagens diretas.

### Novos Escopos Instagram (Obrigatório até 27/01/2025)

Atualizamos para os novos escopos recomendados pelo Facebook:

```
instagram_business_basic           (antes: business_basic)
instagram_business_content_publish (antes: business_content_publish)
instagram_business_manage_messages (antes: business_manage_messages)
instagram_business_manage_comments (antes: business_manage_comments)
```

---

## 📁 Arquivos Criados

### 1. **InstagramSDKIntegration Service**
**Arquivo:** `src/services/instagram-sdk-integration.ts` (260 linhas)

Classe que encapsula a Instagram Graph API com métodos:

- `initialize()` - Inicializa SDK (usa Facebook SDK)
- `login(scope)` - Login com Instagram
- `logout()` - Logout
- `getInstagramProfile(accessToken)` - Info do perfil
- `getInstagramMedia(accessToken, userId, limit)` - Posts/fotos
- `publishMedia(accessToken, userId, imageUrl, caption)` - Publicar
- `getInstagramInsights(accessToken, userId, metric)` - Estatísticas
- `replyToComment(accessToken, commentId, message)` - Responder comentários
- `getInstagramMessages(accessToken, userId, limit)` - Mensagens diretas
- `sendMessage(accessToken, conversationId, message)` - Enviar DM
- `api(path, params, method)` - Chamada genérica

### 2. **useInstagramIntegration Hook**
**Arquivo:** `src/hooks/useInstagramIntegration.ts` (130 linhas)

Hook React que fornece interface amigável com useCallback para performance.

### 3. **InstagramLoginButton Component**
**Arquivo:** `src/components/InstagramLoginButton.tsx` (70 linhas)

Componente pronto para usar com callbacks onSuccess/onError.

### 4. **Token Refresh Service**
**Arquivo:** `src/services/token-refresh-service.ts` (200 linhas)

Serviço de refresh automático de tokens:

- `isTokenExpired(platform)` - Verifica expiração
- `refreshAccessToken(platform)` - Renova token
- `getValidAccessToken(platform)` - Obtém token válido
- `logTokenExpiration(platform)` - Registra logs

---

## 🔑 Escopos Instagram Atualizados

### Novos Escopos (Obrigatório após 27/01/2025)

```javascript
const scope = 'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments';
```

### O que Cada Escopo Permite

| Escopo | Permite | Métodos |
|--------|---------|---------|
| `instagram_business_basic` | Acesso básico ao perfil | getProfile, getMedia, getInsights |
| `instagram_business_content_publish` | Publicar conteúdo | publishMedia |
| `instagram_business_manage_comments` | Gerenciar comentários | replyToComment |
| `instagram_business_manage_messages` | Gerenciar DMs | getMessages, sendMessage |

---

## 📊 Dados Armazenados no Firebase

```json
{
  "admin/integrations/instagram": {
    "connected": true,
    "access_token": "IGQVJfZAXBPa4U-bFE0bGc2d1KVN...",
    "expires_in": 5184000,
    "expires_at": "2025-02-21T10:30:00.000Z",
    "refresh_token": "...",
    "refresh_token_expires_in": null,
    "user_id": "123456789",
    "name": "username",
    "email": "email@example.com",
    "connected_at": "2025-01-22T10:30:00.000Z",
    "last_refresh_at": "2025-01-22T10:30:00.000Z"
  }
}
```

---

## 🔄 Fluxo de Autenticação

```
1. Usuário clica em "Conectar com Instagram"
   ↓
2. InstagramLoginButton carrega
   ↓
3. useInstagramIntegration.login() é chamado
   ↓
4. FB.login() abre diálogo de Instagram
   ↓
5. Usuário autoriza permissões
   ↓
6. Access token é retornado
   ↓
7. getInstagramProfile() busca dados do usuário
   ↓
8. onSuccess callback é acionado com dados
   ↓
9. Dados são salvos no Firebase (via API route)
```

---

## 🎯 Como Usar

### Opção 1: Componente Pronto (Mais Fácil)

```typescript
import { InstagramLoginButton } from '@/components/InstagramLoginButton';

export function MyPage() {
  return (
    <InstagramLoginButton
      onSuccess={(data) => {
        console.log('Login:', data);
        // data = { accessToken, userID, profile }
      }}
      onError={(error) => console.error(error)}
    />
  );
}
```

### Opção 2: Hook (Flexível)

```typescript
import { useInstagramIntegration } from '@/hooks/useInstagramIntegration';

export function MyComponent() {
  const instagram = useInstagramIntegration();

  const handleLogin = async () => {
    await instagram.initialize();
    const result = await instagram.login();
    if (result.success) {
      const profile = await instagram.getProfile(result.accessToken);
      const media = await instagram.getMedia(result.accessToken);
    }
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

### Opção 3: Service Direto

```typescript
import { InstagramSDKIntegration } from '@/services/instagram-sdk-integration';

await InstagramSDKIntegration.initialize();
const result = await InstagramSDKIntegration.login();
const profile = await InstagramSDKIntegration.getInstagramProfile(result.accessToken);
```

---

## 💾 Refresh Token Automático

### Verificar Expiração

```typescript
import { isTokenExpired, getValidAccessToken } from '@/services/token-refresh-service';

// Verificar se token está prestes a expirar (< 1 hora)
const expired = await isTokenExpired('instagram');

// Obter token válido (renova automaticamente se necessário)
const accessToken = await getValidAccessToken('instagram');
```

### Renovação Manual

```typescript
import { refreshAccessToken } from '@/services/token-refresh-service';

// Renovar token manualmente
const refreshed = await refreshAccessToken('instagram');
if (refreshed) {
  console.log('Token renovado com sucesso');
}
```

---

## 📈 Exemplos de Uso

### 1. Obter Perfil do Usuário

```typescript
const profile = await instagram.getProfile(accessToken);
// {
//   id: '123456789',
//   username: 'myusername',
//   name: 'My Name',
//   biography: 'My bio',
//   profile_picture_url: 'https://...',
//   website: 'https://example.com',
//   ig_id: '987654321'
// }
```

### 2. Listar Mídia (Posts)

```typescript
const media = await instagram.getMedia(accessToken, userId, 10);
// [
//   {
//     id: '123456',
//     caption: 'My caption',
//     media_type: 'IMAGE',
//     media_url: 'https://...',
//     timestamp: '2025-01-22T10:00:00+0000',
//     like_count: 150,
//     comments_count: 25
//   },
//   ...
// ]
```

### 3. Publicar Imagem

```typescript
const result = await instagram.publishMedia(
  accessToken,
  userId,
  'https://example.com/image.jpg',
  'Nova foto! #instagram'
);
// { id: '123456' }
```

### 4. Obter Insights (Estatísticas)

```typescript
const insights = await instagram.getInsights(
  accessToken,
  userId,
  'impressions,reach,profile_views'
);
// [
//   {
//     id: '123456',
//     name: 'impressions',
//     period: 'day',
//     values: [{ value: 1500 }],
//     total_value: 1500
//   },
//   ...
// ]
```

### 5. Responder a Comentários

```typescript
const reply = await instagram.replyToComment(
  accessToken,
  commentId,
  'Obrigado por comentar!'
);
// { id: '789456' }
```

### 6. Obter Mensagens Diretas

```typescript
const messages = await instagram.getMessages(accessToken, userId, 10);
// [
//   {
//     id: 'conversation123',
//     participants: ['user1', 'user2'],
//     snippet: 'Olá, como vai?',
//     updated_time: '2025-01-22T10:00:00+0000'
//   },
//   ...
// ]
```

### 7. Enviar Mensagem Direta

```typescript
const dm = await instagram.sendMessage(
  accessToken,
  conversationId,
  'Oi! Como posso ajudar?'
);
// { id: 'message123' }
```

---

## 🛠️ Integração com Admin

A integração já está conectada com `/admin/integrations`:

1. O botão Instagram aparece no card de integrações
2. Clique em "Conectar" para fazer login
3. Os dados são salvos no Firebase automaticamente
4. O status muda para "Conectado"

---

## 🔐 Segurança

### ✅ Implementado

1. **Access Token** - Armazenado no servidor (Firebase)
2. **App Secret** - Nunca exposto ao cliente
3. **HTTPS Only** - Cookies HTTP-only para tokens
4. **Token Expiration** - Renovação automática
5. **Scope Limitation** - Apenas permissões necessárias

### ⚠️ Importante

- Access token tem validade de ~60 dias
- Refresh token precisa ser implementado para renovação a longo prazo
- Sempre validar tokens antes de usar

---

## ⚡ Conversão para Novos Escopos

Se você tem código antigo usando escopos antigos:

**Antes (Deprecated):**
```javascript
'email,public_profile,pages_manage_metadata,pages_read_user_content,business_basic'
```

**Depois (Novo):**
```javascript
'email,public_profile,pages_manage_metadata,pages_read_user_content,instagram_business_basic'
```

### Mapeamento de Escopos

| Antigo | Novo |
|--------|------|
| `business_basic` | `instagram_business_basic` |
| `business_content_publish` | `instagram_business_content_publish` |
| `business_manage_comments` | `instagram_business_manage_comments` |
| `business_manage_messages` | `instagram_business_manage_messages` |

**Deadline:** 27 de Janeiro de 2025

---

## 🐛 Troubleshooting

### Erro: "User not authorized"
**Causa:** Escopos insuficientes ou permissões não concedidas
**Solução:** Fazer logout e login novamente com novo escopo

### Erro: "Invalid access token"
**Causa:** Token expirado
**Solução:** Usar `getValidAccessToken()` que renova automaticamente

### Erro: "API call failed"
**Causa:** Erro na chamada à API do Instagram
**Solução:** Verificar logs de erro e validar ID do usuário

### Erro: "Cannot publish to this account"
**Causa:** Conta não é business/creator
**Solução:** Converter conta para business no Instagram

---

## 📚 Referências

- [Instagram API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Instagram Login Documentation](https://developers.facebook.com/docs/instagram-api/guides/instagram-login)
- [New Scopes Announcement](https://developers.facebook.com/docs/instagram-api/guides/instagram-login/scopes)
- [Graph API Reference](https://developers.facebook.com/docs/instagram-api/reference)

---

## ✅ Checklist de Implementação

- [x] InstagramSDKIntegration service criado
- [x] useInstagramIntegration hook criado
- [x] InstagramLoginButton component criado
- [x] Token refresh service criado
- [x] Novos escopos implementados (instagram_business_*)
- [x] Firebase integration configurada
- [x] Documentação completa
- [ ] Testar fluxo completo
- [ ] Integrar com página de galeria
- [ ] Implementar sincronização de feed

---

**Status:** ✅ PRONTO PARA TESTAR
**Versão:** 1.0
