# Integração Twitter - Firebase Authentication

## Visão Geral

Este documento descreve a implementação completa da autenticação Twitter usando Firebase Authentication com OAuth 1.0a no projeto Next.js 14+.

## Componentes Implementados

### 1. Serviço de Autenticação (`services/twitter-auth.ts`)

```typescript
// Funcionalidades principais:
- LoginWithPopup(): Autenticação via popup
- LoginWithRedirect(): Autenticação via redirect  
- Logout(): Encerramento de sessão
- getCurrentUser(): Usuário atual
- getAuthState(): Estado de autenticação
- Extração de credenciais OAuth 1.0a
```

### 2. Hook React (`hooks/useTwitterAuth.ts`)

```typescript
// Estados gerenciados:
- isAuthenticated: boolean
- isLoading: boolean  
- user: TwitterUser | null
- credentials: TwitterCredentials | null
- error: string | null

// Métodos disponíveis:
- loginWithPopup()
- loginWithRedirect()
- logout()
- clearError()
```

### 3. Componente de Login (`components/social/TwitterLoginButton.tsx`)

```typescript
// Props:
- onSuccess?: (result: any) => void
- onError?: (error: Error) => void
- useRedirect?: boolean
- disabled?: boolean
- children?: React.ReactNode
- className?: string
```

### 4. Componente de Integração (`components/social/TwitterIntegration.tsx`)

Interface completa para gerenciamento da autenticação Twitter com:
- Estado de carregamento
- Tratamento de erros
- Exibição de usuário autenticado
- Opções de login (popup/redirect)
- Logout com confirmação

## Configuração do Firebase

### 1. Firebase Console

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: `YOUR_FIREBASE_PROJECT_ID`
3. Vá para **Authentication > Sign-in method**
4. Habilite **Twitter** como provider
5. Adicione suas credenciais do Twitter Developer

### 2. Configuração do Twitter Developer

1. Acesse [Twitter Developer Portal](https://developer.twitter.com/)
2. Crie um novo App ou use existente
3. Configure as seguintes URLs de callback:

```
https://YOUR_FIREBASE_PROJECT_ID.firebaseapp.com/__/auth/handler
https://italosantos.com/__/auth/handler (produção)
http://localhost:3000/__/auth/handler (desenvolvimento)
```

4. Copie:
   - **API Key** (Consumer Key)
   - **API Secret Key** (Consumer Secret)

### 3. Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# Firebase (já configurado)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_PROJECT_ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID

# Twitter (não necessário no client - configurado no Firebase Console)
# TWITTER_API_KEY=your_twitter_api_key
# TWITTER_API_SECRET=your_twitter_api_secret
```

## Uso Básico

### 1. Componente Simples

```tsx
import TwitterLoginButton from '@/components/social/TwitterLoginButton';

function MyComponent() {
  return (
    <TwitterLoginButton
      onSuccess={(data) => console.log('Twitter conectado:', data)}
      onError={(error) => console.error('Erro:', error)}
    >
      Conectar Twitter
    </TwitterLoginButton>
  );
}
```

### 2. Hook Personalizado

```tsx
import { useTwitterAuth } from '@/hooks/useTwitterAuth';

function MyComponent() {
  const { 
    isAuthenticated, 
    user, 
    loginWithPopup, 
    logout 
  } = useTwitterAuth();

  if (isAuthenticated && user) {
    return (
      <div>
        <p>Olá, {user.displayName}!</p>
        <button onClick={logout}>Sair</button>
      </div>
    );
  }

  return <button onClick={loginWithPopup}>Login Twitter</button>;
}
```

### 3. Integração Completa

```tsx
import TwitterIntegration from '@/components/social/TwitterIntegration';

function SocialPage() {
  return <TwitterIntegration />;
}
```

## Tipos TypeScript

### TwitterUser

```typescript
interface TwitterUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  username?: string;
  providerId: string;
}
```

### TwitterCredentials

```typescript
interface TwitterCredentials {
  accessToken?: string;
  secret?: string;
  idToken?: string;
}
```

## Funcionalidades Avançadas

### 1. Extração de Credenciais OAuth

```typescript
const credentials = await TwitterAuthService.extractCredentials(userCredential);
console.log('Access Token:', credentials.accessToken);
console.log('Secret:', credentials.secret);
```

### 2. Tratamento de Erros

```typescript
try {
  await TwitterAuthService.loginWithPopup();
} catch (error) {
  if (error.code === 'auth/popup-closed-by-user') {
    console.log('Popup fechado pelo usuário');
  }
  // Outros tratamentos...
}
```

### 3. Estado de Carregamento

```typescript
const { isLoading } = useTwitterAuth();

if (isLoading) {
  return <LoadingSpinner />;
}
```

## Páginas de Teste

### 1. Teste Individual
- **URL:** `/test/twitter`
- **Componente:** `TwitterIntegration`
- **Propósito:** Teste isolado da funcionalidade Twitter

### 2. Teste Social Unificado
- **URL:** `/test/social`
- **Componente:** `SocialIntegration`
- **Propósito:** Teste de todas as integrações (Facebook, Instagram, Twitter)

## Integração com SocialIntegration

O Twitter foi integrado ao componente `SocialIntegration` que unifica:

1. **Facebook SDK** - Login tradicional via JavaScript SDK
2. **Instagram Business API** - OAuth 2.0 para contas business
3. **Twitter** - Firebase Authentication com OAuth 1.0a

### Status Unificado

```tsx
// O componente mostra status de todas as três integrações
{(isFacebookConnected || isInstagramConnected || isTwitterConnected) && (
  <Card>
    <CardContent>
      <div className="grid grid-cols-3 gap-4">
        <Badge variant={isFacebookConnected ? 'default' : 'secondary'}>
          Facebook: {isFacebookConnected ? 'Conectado' : 'Desconectado'}
        </Badge>
        <Badge variant={isInstagramConnected ? 'default' : 'secondary'}>
          Instagram: {isInstagramConnected ? 'Conectado' : 'Desconectado'}
        </Badge>
        <Badge variant={isTwitterConnected ? 'default' : 'secondary'}>
          Twitter: {isTwitterConnected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </div>
    </CardContent>
  </Card>
)}
```

## Troubleshooting

### 1. Erro de Configuração

**Problema:** "Twitter provider not configured"
**Solução:** Verifique se o Twitter está habilitado no Firebase Console

### 2. Callback URL Inválida

**Problema:** "Invalid callback URL"
**Solução:** Configure corretamente as URLs no Twitter Developer Portal

### 3. Popup Bloqueado

**Problema:** Popup não abre
**Solução:** Use `loginWithRedirect()` como alternativa

### 4. Credenciais Não Encontradas

**Problema:** `accessToken` ou `secret` undefined
**Solução:** Verifique se `additionalUserInfo` está disponível no `UserCredential`

## Próximos Passos

1. **API Integration:** Use as credenciais OAuth para fazer chamadas à Twitter API v2
2. **Scope Management:** Configure scopes específicos conforme necessário
3. **Token Refresh:** Implemente renovação automática de tokens
4. **Advanced Features:** Adicione funcionalidades como tweet, timeline, etc.

## Segurança

- ✅ **Credentials Safe:** Tokens OAuth são manipulados de forma segura
- ✅ **Client-side Only:** Nenhum secret é exposto no cliente
- ✅ **Firebase Security:** Autenticação gerenciada pelo Firebase
- ✅ **Error Handling:** Tratamento adequado de erros sensíveis

## Arquivos Relacionados

```
src/
├── services/twitter-auth.ts              # Serviço principal
├── hooks/useTwitterAuth.ts               # Hook React
├── components/social/
│   ├── TwitterLoginButton.tsx           # Botão de login
│   ├── TwitterIntegration.tsx           # Interface completa
│   └── SocialIntegration.tsx            # Integração unificada
├── app/test/
│   ├── twitter/page.tsx                 # Teste individual
│   └── social/page.tsx                  # Teste unificado
└── docs/TWITTER_INTEGRATION.md          # Esta documentação
```

---

**Implementação completa finalizada em:** $(date)
**Versão:** 1.0.0
**Status:** ✅ Pronto para produção
