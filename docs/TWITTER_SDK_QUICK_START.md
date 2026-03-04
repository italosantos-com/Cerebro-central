e i# Twitter SDK (Next.js + React) — OAuth2 PKCE Login/Logout/Refresh + Mídia Paginada

Este guia explica como autenticar usuários com o Twitter (OAuth 2.0 PKCE), manter tokens atualizados e consumir vídeos/fotos paginados para alimentar suas páginas.

## Rotas já implementadas

- Login (abre dialog): `GET /api/auth/twitter` → redireciona para `/api/admin/twitter/connect`
- Callback (troca o code por tokens): `GET /api/admin/twitter/callback`
- Logout (apaga cookies): `POST /api/auth/twitter/logout`
- Refresh token (renova access token): `POST /api/auth/twitter/refresh`
- API de mídia:
  - `GET /api/twitter/videos?username=:handle&max_results=50&pagination_token=...`
  - `GET /api/twitter/fotos?username=:handle&max_results=50&pagination_token=...`

Tokens são mantidos em cookies HTTP-only:
- `twitter_access_token`
- `twitter_refresh_token`

## Hook React

```tsx
import { useTwitterIntegration } from '@/hooks/useTwitterIntegration';

export function MyTwitterSection() {
  const { login, logout, refresh, getVideos, getPhotos } = useTwitterIntegration();

  async function connect() {
    const res = await login();
    if (res.success && res.username) {
      localStorage.setItem('twitter_username', res.username);
    }
  }

  async function loadMoreVideos(next?: string) {
    const username = localStorage.getItem('twitter_username') || 'your_fallback';
    const page = await getVideos(username, next, 50);
    console.log(page.items, page.next_token);
  }

  return (
    <div>
      <button onClick={connect}>Conectar Twitter</button>
      <button onClick={() => logout()}>Sair</button>
    </div>
  );
}
```

Notas:
- O hook tenta `POST /api/auth/twitter/refresh` automaticamente quando a API retorna 401, e refaz a requisição uma vez.
- Use `page.next_token` para paginação.

## Painel Admin > Integrações

A página `src/app/admin/integrations/page.tsx` já integra com o fluxo de popup e recebe `postMessage` de `/auth/callback` para exibir toasts e armazenar `twitter_username` no localStorage.

## Variáveis de Ambiente

No `.env.local` (não comitar):
```
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
NEXT_PUBLIC_BASE_URL=https://seu-dominio.com
TWITTER_CALLBACK_URL=https://seu-dominio.com/api/admin/twitter/callback
```

## Tratamento de Erros
- 401 na API: o hook aciona refresh e tenta novamente.
- Popup bloqueado: o hook faz fallback para `window.location.href` (navegação inteira), mantendo o login funcional.

## Segurança
- Cookies HTTP-only para access e refresh token.
- Nenhum segredo do app é exposto no cliente.

Pronto! Você tem login/logout/refresh e endpoints de mídia paginados para montar sua galeria de vídeos e fotos do Twitter.
