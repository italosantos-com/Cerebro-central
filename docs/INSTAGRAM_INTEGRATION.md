# Integração Instagram Business API

Este documento explica como configurar e usar a integração com o Instagram Business API no projeto.

## 📋 Pré-requisitos

1. **Conta Instagram Business**: Sua conta deve ser do tipo Business (não pessoal)
2. **Facebook Developer Account**: Necessário para criar o app
3. **App Facebook**: Configurado com Instagram Basic Display e Instagram Business API

## 🚀 Configuração

### 1. Configurar o App no Facebook Developer

1. Acesse [Facebook Developers](https://developers.facebook.com/)
2. Crie um novo app ou use o existente (`737697635744491`)
3. Adicione os produtos:
   - **Instagram Basic Display**
   - **Instagram Business API**

### 2. Configurar URLs de Callback

No painel do Facebook Developer, configure:

**Instagram Basic Display > Basic Display > Instagram App Secret**
- Valid OAuth Redirect URIs: `https://italosantos.com/api/instagram/callback`

**App Review > Current Submissions**
- Deauthorize Callback URL: `https://italosantos.com/api/instagram/deauth`
- Data Deletion Request URL: `https://italosantos.com/api/instagram/delete`

### 3. Variáveis de Ambiente

As seguintes variáveis já estão configuradas no `.env.local`:

```bash
INSTAGRAM_CLIENT_ID=737697635744491
INSTAGRAM_REDIRECT_URI=https://italosantos.com/api/instagram/callback
INSTAGRAM_OAUTH_SCOPES=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights
INSTAGRAM_DEAUTH_CALLBACK_URL=https://italosantos.com/api/instagram/deauth
INSTAGRAM_DELETE_CALLBACK_URL=https://italosantos.com/api/instagram/delete
```

## 🔧 Como Usar

### 1. Componente de Login Simples

```tsx
import InstagramLoginButton from '@/components/social/InstagramLoginButton';

function MyComponent() {
  return (
    <InstagramLoginButton
      onSuccess={(data) => console.log('Conectado:', data)}
      onError={(error) => console.error('Erro:', error)}
    />
  );
}
```

### 2. Hook Completo com Estado

```tsx
import { useInstagramAuth } from '@/hooks/useInstagramAuth';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useInstagramAuth();

  if (isAuthenticated && user) {
    return (
      <div>
        <p>Conectado como: @{user.username}</p>
        <button onClick={logout}>Desconectar</button>
      </div>
    );
  }

  return <button onClick={login}>Conectar Instagram</button>;
}
```

### 3. Componente de Integração Completa

```tsx
import InstagramIntegration from '@/components/social/InstagramIntegration';

function MyPage() {
  return <InstagramIntegration />;
}
```

## 🌐 URLs e Endpoints

### URLs de Autorização
```
https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=737697635744491&redirect_uri=https://italosantos.com/api/instagram/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights
```

### Endpoints da API

- **Callback**: `GET/POST /api/instagram/callback`
- **Desautorização**: `POST /api/instagram/deauth`
- **Exclusão de Dados**: `POST /api/instagram/delete`

## 🔒 Permissões Solicitadas

| Escopo | Descrição |
|--------|-----------|
| `instagram_business_basic` | Informações básicas da conta (ID, username, tipo) |
| `instagram_business_manage_messages` | Ler e responder mensagens diretas |
| `instagram_business_manage_comments` | Ler e responder comentários |
| `instagram_business_content_publish` | Publicar fotos, vídeos e stories |
| `instagram_business_manage_insights` | Acessar métricas e insights |

## 🧪 Teste da Integração

Acesse a página de teste:
```
http://localhost:3000/test/instagram
```

## 📱 Fluxo de Autenticação

1. **Usuário clica em "Conectar Instagram"**
2. **Redirecionamento para Instagram OAuth**
3. **Usuário autoriza o app**
4. **Callback recebe código de autorização**
5. **Troca código por token de acesso**
6. **Obtém perfil do usuário**
7. **Salva dados no localStorage**
8. **Redireciona de volta com sucesso**

## 🛡️ Segurança e Privacidade

### Desautorização
Quando um usuário remove o app do Instagram, o endpoint `/api/instagram/deauth` é chamado automaticamente.

### Exclusão de Dados
Se um usuário solicitar exclusão de dados, o endpoint `/api/instagram/delete` processa a solicitação e retorna um código de confirmação.

### Armazenamento Local
- Tokens são armazenados no `localStorage` do navegador
- Validação automática de expiração
- Limpeza automática de dados inválidos

## 🚨 Troubleshooting

### Erro: "Instagram OAuth configuration is incomplete"
Verifique se as variáveis `INSTAGRAM_CLIENT_ID` e `INSTAGRAM_REDIRECT_URI` estão definidas.

### Erro: "authorization_code_missing"
O Instagram não retornou um código válido. Verifique se:
- A redirect URI está correta no Facebook Developer
- O app está aprovado para produção
- As permissões estão configuradas corretamente

### Erro: "callback_processing_failed"
Erro interno no processamento. Verifique:
- Se `INSTAGRAM_APP_SECRET` está definido corretamente
- Se a API do Instagram está acessível
- Os logs do servidor para mais detalhes

## 📚 Recursos Adicionais

- [Instagram Business API Documentation](https://developers.facebook.com/docs/instagram-api)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Facebook App Review Process](https://developers.facebook.com/docs/app-review)

## 🔄 Próximos Passos

1. **Submeter para App Review**: Para usar em produção com usuários reais
2. **Implementar Webhooks**: Para receber notificações em tempo real
3. **Adicionar Funcionalidades**: Publicação de conteúdo, gestão de comentários, etc.
4. **Integrar com Banco de Dados**: Salvar tokens e dados de usuários no Firebase
