# Integração do Facebook SDK - Documentação

## Visão Geral

A integração do Facebook foi implementada para permitir que usuários autentiquem através do Facebook e conectem suas contas na seção de Admin Integrations.

## Arquivos Principais

### 1. **FacebookSDKIntegration Service** (`src/services/facebook-sdk-integration.ts`)
Serviço que encapsula a inicialização e uso do Facebook SDK v18.0.

**Métodos disponíveis:**
- `initialize()` - Inicializa o SDK carregando o script da CDN
- `login(scope?)` - Realiza login com Facebook
- `logout()` - Faz logout
- `getLoginStatus()` - Obtém o status de login atual
- `getUserInfo()` - Obtém informações do usuário logado
- `getUserPages()` - Obtém as páginas do Facebook do usuário
- `api(path, params, method)` - Método genérico para chamadas à Facebook API

### 2. **Hook useFacebookIntegration** (`src/hooks/useFacebookIntegration.ts`)
Hook React que fornece uma interface amigável para usar FacebookSDKIntegration.

```typescript
const facebookIntegration = useFacebookIntegration();
await facebookIntegration.initialize();
const result = await facebookIntegration.login();
```

### 3. **FacebookLoginButton Component** (`src/components/FacebookLoginButton.tsx`)
Componente React pronto para uso com callback de sucesso/erro.

```typescript
<FacebookLoginButton
  onSuccess={(data) => console.log(data)}
  onError={(error) => console.error(error)}
/>
```

### 4. **Server Actions** (`src/app/admin/integrations/facebook-actions.ts`)
Ações do servidor para gerenciar dados de integração.

**Funções disponíveis:**
- `saveFacebookIntegration(data)` - Salva dados de integração
- `getFacebookIntegration()` - Obtém dados salvos
- `removeFacebookIntegration()` - Remove integração
- `isFacebookConnected()` - Verifica se está conectado
- `getFacebookAccessToken()` - Obtém o token de acesso
- `getFacebookPages()` - Obtém as páginas vinculadas

### 5. **API Routes**
- `/api/auth/facebook` - Redireciona para `/api/admin/facebook/connect`
- `/api/admin/facebook/connect` - Inicia fluxo OAuth
- `/api/admin/facebook/callback` - Recebe callback do OAuth e salva no Firebase
- `/auth/callback` - Página que envia mensagem postMessage para fechar popup

## Fluxo de Autenticação

```
1. Usuário clica em "Conectar com Facebook" no Admin
   ↓
2. handleConnect() abre popup para /api/auth/facebook
   ↓
3. /api/auth/facebook redireciona para /api/admin/facebook/connect
   ↓
4. /api/admin/facebook/connect redireciona para Facebook OAuth dialog
   ↓
5. Usuário autoriza a aplicação no Facebook
   ↓
6. Facebook redireciona para /api/admin/facebook/callback?code=...&state=...
   ↓
7. callback/route.ts troca code por access_token
   ↓
8. Salva dados no Firebase Realtime Database em admin/integrations/facebook
   ↓
9. Redireciona para /auth/callback?platform=facebook&success=true
   ↓
10. /auth/callback envia postMessage com dados para janela pai
    ↓
11. messageListener no Admin recebe dados e mostra toast
```

## Escopos de Permissão

As seguintes permissões são solicitadas:

```
email,public_profile,pages_read_engagement,pages_show_list,instagram_basic,instagram_manage_insights
```

## Variáveis de Ambiente Necessárias

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Facebook
FACEBOOK_APP_ID=1029313609296207
FACEBOOK_APP_SECRET=f22940f7eac755ccb4a6c9d5eff24f57
FACEBOOK_CALLBACK_URL=https://seu-dominio.com/api/admin/facebook/callback (opcional)

# URLs
NEXT_PUBLIC_BASE_URL=https://seu-dominio.com
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
```

## Dados Armazenados

Os dados de integração do Facebook são armazenados em:
1. **Firebase Realtime Database**: `admin/integrations/facebook`
2. **Cookies HTTP-only**: Para acesso rápido na próxima requisição

Dados salvos:
```json
{
  "connected": true,
  "access_token": "...",
  "expires_in": 5184000,
  "user_id": "...",
  "name": "Nome do Usuário",
  "email": "email@example.com",
  "connected_at": "2024-01-15T10:30:00.000Z"
}
```

## Tratamento de Erros

Possíveis erros retornados:
- `facebook_config_error` - Credenciais não configuradas
- `facebook_auth_failed` - Autenticação falhou
- `facebook_token_exchange_failed` - Falha ao trocar authorization code
- `facebook_user_info_failed` - Falha ao buscar informações do usuário
- `facebook_server_error` - Erro genérico do servidor

## Como Usar no Admin

1. **Integração Automática**: O componente já está integrado em `/src/app/admin/integrations/page.tsx`

2. **Usar o Hook Diretamente**:
```typescript
'use client';

import { useFacebookIntegration } from '@/hooks/useFacebookIntegration';

export function MyComponent() {
  const fb = useFacebookIntegration();

  const handleLogin = async () => {
    await fb.initialize();
    const result = await fb.login();
    console.log(result);
  };

  return <button onClick={handleLogin}>Login com FB</button>;
}
```

3. **Usar o Serviço Diretamente**:
```typescript
import { FacebookSDKIntegration } from '@/services/facebook-sdk-integration';

await FacebookSDKIntegration.initialize();
const status = await FacebookSDKIntegration.getLoginStatus();
const userInfo = await FacebookSDKIntegration.getUserInfo();
```

## Notas de Segurança

1. **Access Token**: Mantido no servidor (Firebase) e em cookies HTTP-only
2. **App Secret**: Nunca deve ser exposto ao cliente (está em .env.local)
3. **CSRF Protection**: Usa state parameter e validação via cookies
4. **Same-Site Policy**: Cookies configurados com sameSite='lax'

## Próximas Etapas

1. ✅ FacebookSDKIntegration service criado
2. ✅ Hook useFacebookIntegration criado
3. ✅ FacebookLoginButton component criado
4. ✅ API routes existentes validadas
5. ⏳ Testar fluxo completo de autenticação
6. ⏳ Implementar refresh token quando expirar
7. ⏳ Adicionar sincronização de feed do Facebook
8. ⏳ Implementar desconexão limpa

## Testando Localmente

```bash
# Iniciar o servidor
npm run dev

# Acessar admin
http://localhost:3000/admin/integrations

# Clicar em "Conectar" para Facebook
# Autorizar a aplicação
# Verificar se a conexão foi salva no Firebase
```
