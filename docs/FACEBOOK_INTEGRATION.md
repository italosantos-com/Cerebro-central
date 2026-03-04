# Integração Facebook SDK

Este documento explica como configurar e usar a integração com o Facebook JavaScript SDK no projeto.

## 📋 Pré-requisitos

1. **Conta Facebook Developer**: Necessária para criar e configurar o app
2. **App Facebook**: Configurado com Login do Facebook
3. **Domínio Verificado**: Para usar em produção

## 🚀 Configuração

### 1. Configurar o App no Facebook Developer

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Use o app existente ID: `1029313609296207`
3. Adicione o produto **Facebook Login**

### 2. Configurar Domínios e URLs

No painel do Facebook Developer:

**Facebook Login > Settings**
- Valid OAuth Redirect URIs: `https://italosantos.com/`
- Allowed Domains for the JavaScript SDK: `italosantos.com`

### 3. Variáveis de Ambiente

Configuradas no `.env.local`:

```bash
FACEBOOK_APP_ID=1029313609296207
FACEBOOK_APP_SECRET=f22940f7eac755ccb4a6c9d5eff24f57
NEXT_PUBLIC_FACEBOOK_APP_ID=1029313609296207
FACEBOOK_GRAPH_API_VERSION=v18.0
```

## 🔧 Como Usar

### 1. Provider do Facebook SDK

Adicione o provider no seu layout:

```tsx
import FacebookSDKProvider from '@/components/providers/FacebookSDKProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <FacebookSDKProvider>
          {children}
        </FacebookSDKProvider>
      </body>
    </html>
  );
}
```

### 2. Botão de Login Simples

```tsx
import FacebookLoginButton from '@/components/social/FacebookLoginButton';

function MyComponent() {
  return (
    <FacebookLoginButton
      onSuccess={(data) => console.log('Conectado:', data.user?.name)}
      onError={(error) => console.error('Erro:', error)}
    />
  );
}
```

### 3. Hook Completo com Estado

```tsx
import { useFacebookAuth } from '@/hooks/useFacebookAuth';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useFacebookAuth();

  if (isAuthenticated && user) {
    return (
      <div>
        <img src={user.picture?.data.url} alt={user.name} />
        <p>Conectado como: {user.name}</p>
        <p>Email: {user.email}</p>
        <button onClick={logout}>Desconectar</button>
      </div>
    );
  }

  return <button onClick={() => login()}>Conectar Facebook</button>;
}
```

### 4. Serviço Direto do SDK

```tsx
import { FacebookSDKService } from '@/services/facebook-sdk';

// Verificar status
const status = await FacebookSDKService.getLoginStatus();

// Fazer login
const loginResponse = await FacebookSDKService.login('email,public_profile');

// Obter informações do usuário
const userInfo = await FacebookSDKService.getUserInfo();

// Fazer logout
await FacebookSDKService.logout();
```

## 🌐 Inicialização do SDK

O SDK é inicializado automaticamente com:

```javascript
window.fbAsyncInit = function() {
  FB.init({
    appId: '1029313609296207',
    cookie: true,
    xfbml: true,
    version: 'v18.0'
  });
  
  FB.AppEvents.logPageView();
};
```

## 🔒 Permissões Disponíveis

### Permissões Básicas (não requerem revisão)
- `public_profile` - Nome, foto do perfil, etc.
- `email` - Endereço de email

### Permissões Avançadas (requerem App Review)
- `user_posts` - Posts do usuário
- `user_photos` - Fotos do usuário
- `manage_pages` - Gerenciar páginas
- `publish_pages` - Publicar em páginas

## 📱 Fluxo de Autenticação

1. **SDK Inicializado**: JavaScript SDK carregado
2. **Usuário clica em Login**: Popup ou redirect para Facebook
3. **Autorização**: Usuário concede permissões
4. **Token Recebido**: Access token retornado
5. **Informações Obtidas**: Dados do perfil coletados
6. **Estado Atualizado**: Hook/componente atualizado

## 🛡️ Segurança

### Client-side (JavaScript SDK)
- Apenas App ID público é exposto
- Tokens são de curta duração
- Validação no lado do servidor quando necessário

### Server-side (Graph API)
- App Secret mantido seguro no servidor
- Validação de assinaturas de webhook
- Tokens de longa duração para operações de servidor

## 🧪 Teste da Integração

Acesse as páginas de teste:
```
http://localhost:3000/test/social
http://localhost:3000/test/facebook
```

## 🔄 Estados do Login

```typescript
interface FacebookLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: string;
    signedRequest: string;
    userID: string;
  };
}
```

- **connected**: Usuário logado e app autorizado
- **not_authorized**: Usuário logado mas app não autorizado
- **unknown**: Status desconhecido (usuário não logado)

## 🚨 Troubleshooting

### Erro: "FB is not defined"
O SDK ainda não foi carregado. Use o hook `useFacebookSDK` para verificar se `isReady` é `true`.

### Erro: "Invalid App ID"
Verifique se `NEXT_PUBLIC_FACEBOOK_APP_ID` está definido corretamente.

### Erro: "Can't Load URL"
O domínio não está configurado nas configurações do app. Adicione o domínio em "App Domains".

### Login não funciona em produção
Certifique-se de que:
- O domínio está verificado no Facebook
- As URLs de redirect estão configuradas
- O app está em modo "Live" (não Development)

## 📚 Recursos Adicionais

- [Facebook JavaScript SDK](https://developers.facebook.com/docs/javascript)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review)

## 🔄 Próximos Passos

1. **Adicionar Mais Permissões**: Solicitar permissões adicionais conforme necessário
2. **Implementar Graph API**: Para operações no servidor
3. **Configurar Webhooks**: Para notificações em tempo real
4. **App Review**: Submeter para permissões avançadas
