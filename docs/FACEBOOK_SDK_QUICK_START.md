# 🚀 Guia Rápido - Facebook SDK Integration

## 5 Passos para Usar o Facebook SDK

### Passo 1: Verificar Configuração
```bash
# Verificar que as variáveis estão em .env.local
grep "FACEBOOK_APP_ID\|FACEBOOK_APP_SECRET" .env.local
```

✅ Já configurado em `.env.local`

### Passo 2: Testar no Admin
1. Ir para `http://localhost:3000/admin/integrations`
2. Clicar em "Conectar" no card do Facebook
3. Autorizar a aplicação
4. Verificar se status muda para "Conectado"

### Passo 3: Usar em um Componente Novo
```typescript
'use client';

import { useFacebookIntegration } from '@/hooks/useFacebookIntegration';

export function MyComponent() {
  const facebook = useFacebookIntegration();

  const handleLogin = async () => {
    await facebook.initialize();
    const result = await facebook.login('email,public_profile');
    if (result.success) {
      console.log('Login realizado!', result);
    }
  };

  return <button onClick={handleLogin}>Login Facebook</button>;
}
```

### Passo 4: Usar o Componente Pronto
```typescript
import { FacebookLoginButton } from '@/components/FacebookLoginButton';

export function MyPage() {
  return (
    <FacebookLoginButton
      onSuccess={(data) => {
        console.log('Sucesso:', data);
        // data = { accessToken, userID, userInfo }
      }}
      onError={(error) => {
        console.error('Erro:', error);
      }}
    />
  );
}
```

### Passo 5: Usar o Service Diretamente
```typescript
import { FacebookSDKIntegration } from '@/services/facebook-sdk-integration';

// Inicializar
await FacebookSDKIntegration.initialize();

// Login
const loginResponse = await FacebookSDKIntegration.login();

// Info do usuário
const userInfo = await FacebookSDKIntegration.getUserInfo();
console.log(userInfo);
// { id: '...', name: '...', email: '...', picture: {...} }

// Páginas do Facebook
const pages = await FacebookSDKIntegration.getUserPages();
console.log(pages);
// [{ id: '...', name: 'Minha Página', access_token: '...' }, ...]

// Chamada de API genérica
const data = await FacebookSDKIntegration.api(
  '/me/friends',
  { limit: 10 },
  'GET'
);
```

## Testes Rápidos

### Teste 1: Verificar Inicialização
```javascript
// No console do navegador na página /admin/integrations
const { FacebookSDKIntegration } = await import('@/services/facebook-sdk-integration');
await FacebookSDKIntegration.initialize();
console.log(typeof window.FB !== 'undefined'); // deve ser true
```

### Teste 2: Fazer Login
```javascript
const result = await FacebookSDKIntegration.login();
console.log(result);
```

### Teste 3: Listar Páginas
```javascript
const pages = await FacebookSDKIntegration.getUserPages();
console.log(pages);
```

### Teste 4: Usando o Hook
```javascript
const { useFacebookIntegration } = await import('@/hooks/useFacebookIntegration');
const fb = useFacebookIntegration();
const status = await fb.getLoginStatus();
console.log(status);
```

## Verificar Dados Salvos

### No Firebase
1. Ir para Firebase Console
2. Realtime Database
3. Navegar para `admin/integrations/facebook`
4. Deve mostrar:
```json
{
  "connected": true,
  "access_token": "EAAF...",
  "user_id": "123456",
  "name": "Seu Nome",
  "email": "seu@email.com",
  "connected_at": "2024-01-15T10:30:00Z"
}
```

### No Cookie
```javascript
// No console
const cookieStr = document.cookie
  .split('; ')
  .find(row => row.startsWith('facebook_integration='));
console.log(JSON.parse(cookieStr.split('=')[1]));
```

## Troubleshooting

### Problema: "Facebook SDK não carrega"
**Solução:** Verificar console para erros de CORS
```javascript
// Verificar se SDK carregou
console.log(typeof window.FB); // deve ser 'object'
```

### Problema: "Login abre popup e fecha sem fazer nada"
**Solução:** Verificar se FACEBOOK_APP_ID está correto
```javascript
console.log(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID);
```

### Problema: "Token expirado após 60 minutos"
**Solução:** Tokens de acesso expiram em ~60 dias. Para renovar:
1. Fazer logout
2. Fazer login novamente

### Problema: "Erro 'user is not authorized'"
**Solução:** Verificar escopos de permissão
```javascript
// Fazer login com escopos adicionais
await FacebookSDKIntegration.login(
  'email,public_profile,pages_read_engagement,pages_show_list'
);
```

## Checklist de Implementação

- [x] Service FacebookSDKIntegration criado
- [x] Hook useFacebookIntegration criado
- [x] Componente FacebookLoginButton criado
- [x] Server actions criadas
- [x] Variáveis de ambiente configuradas
- [x] API routes validadas
- [x] Documentação criada
- [x] Testes criados
- [ ] Testar fluxo completo no admin
- [ ] Testar sincronização de feed (próximo passo)

## Próximos Passos

### Fase 2: Sincronizar Feed
```typescript
// Buscar posts da página
const posts = await FacebookSDKIntegration.api(
  '/{page_id}/feed',
  { fields: 'id,message,picture,link,created_time' }
);
```

### Fase 3: Exibir Galeria
Criar componente para exibir posts/fotos em `/public` ou `/gallery`

### Fase 3: Publicar Posts
```typescript
// Publicar novo post na página
await FacebookSDKIntegration.api(
  '/{page_id}/feed',
  { message: 'Novo post', link: 'https://...' },
  'POST'
);
```

## Arquivos Criados

```
✨ src/services/facebook-sdk-integration.ts     (298 linhas)
✨ src/hooks/useFacebookIntegration.ts          (85 linhas)
✨ src/components/FacebookLoginButton.tsx       (65 linhas)
✨ src/app/admin/integrations/facebook-actions.ts (85 linhas)
📚 docs/FACEBOOK_SDK_INTEGRATION.md            (Documentação completa)
📚 docs/FACEBOOK_SDK_TESTS.js                  (Script de testes)
📚 docs/FACEBOOK_SDK_STATUS.md                 (Status do projeto)
```

## Resumo de Métodos

### FacebookSDKIntegration

| Método | Descrição | Retorna |
|--------|-----------|---------|
| `initialize()` | Carrega o SDK | Promise\<void\> |
| `login(scope?)` | Login do usuário | FacebookAuthResponse |
| `logout()` | Logout | Promise\<void\> |
| `getLoginStatus()` | Status atual | FacebookAuthResponse |
| `getUserInfo()` | Info do usuário | FacebookUser \| null |
| `getUserPages()` | Páginas vinculadas | Array\<Page\> |
| `api(path, params?, method?)` | Chamada genérica | Any |

### useFacebookIntegration Hook

```typescript
{
  initialize: () => Promise<boolean>,
  login: (scope?: string) => Promise<{success: boolean, accessToken?: string, userID?: string, error?: string}>,
  logout: () => Promise<void>,
  getLoginStatus: () => Promise<FacebookAuthResponse>,
  getUserInfo: () => Promise<FacebookUser | null>,
  getUserPages: () => Promise<Array<Page>>,
  apiCall: (path: string, params?: any, method?: string) => Promise<any>
}
```

## Links Úteis

- [Facebook Developer Docs](https://developers.facebook.com/)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api)
- [SDK v18.0 Docs](https://developers.facebook.com/docs/facebook-login/web/v18.0)
- [Scopes & Permissions](https://developers.facebook.com/docs/facebook-login/permissions/)

---

**Status: 🟢 PRONTO PARA USAR**

Para começar, vá para `/admin/integrations` e clique em "Conectar com Facebook"!
