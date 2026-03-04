# Instagram Business + Facebook Login (Graph API v23) — Guia Rápido

Este guia mostra o caminho mínimo para autenticar com Facebook Login for Business, resolver a conta IG Business/Creator conectada e listar a mídia, usando Graph API v23.

Importante:
- Use sempre o Facebook OAuth dialog (não o instagram.com/authorize) para permissões de Instagram Business.
- Não exponha App Secret ou tokens no frontend. Configure variáveis no servidor (.env.local) e use rotas do backend.

## Pré-requisitos
- Conta de Negócios ou de Criador no Instagram
- Página do Facebook conectada a essa conta IG
- Conta de desenvolvedor do Facebook com permissão para executar Tarefas nessa Página
- App do Facebook criado e configurado

## 1) Habilite o Facebook Login for Business no App
No Facebook Developers, adicione o produto "Facebook Login" ao app. Mantenha defaults e configure o Valid OAuth Redirect apenas se necessário (usamos SDK/rotas backend que resolvem o redirect automaticamente).

## 2) Implemente o Login (v23)
Use nossa rota backend para iniciar o login, mantendo state/callback seguros:

- Botão/âncora (recomendado):
  - `<a href="/api/auth/instagram">Conectar com Instagram</a>`
  - para reautorização: `<a href="/api/auth/instagram?force_reauth=true">Conectar com Instagram</a>`

A rota redireciona para:
- `https://www.facebook.com/v23.0/dialog/oauth?client_id=...&redirect_uri=...&scope=...&state=...`

Escopos padrão solicitados:
- instagram_business_basic
- instagram_business_manage_messages
- instagram_business_manage_comments
- instagram_business_content_publish
- instagram_business_manage_insights
- pages_show_list (ajuda a resolver a conta IG vinculada)

## 3) Obtenha o Access Token de Usuário
Após o consentimento, o backend troca o `code` por `access_token` via:
- `https://graph.facebook.com/v23.0/oauth/access_token`

Armazenamos com segurança em `admin/integrations/instagram` (Firebase) com `expires_at` para renovação automática.

## 4) Liste as Páginas do Usuário (resolver a Página correta)
Use o token de usuário para consultar as páginas às quais ele tem acesso e capturar a que está vinculada ao Instagram:

```
GET https://graph.facebook.com/v23.0/me/accounts
  ?fields=id,name,instagram_business_account{ig_id,username}
  &access_token={USER_ACCESS_TOKEN}
```

A resposta contém Páginas e, quando vinculadas, o objeto `instagram_business_account` com `ig_id` e `username`.

## 5) Obtenha o IG User (opcional)
Caso falte `username`, você pode consultar diretamente o IG user:

```
GET https://graph.facebook.com/v23.0/{ig_user_id}
  ?fields=ig_id,username
  &access_token={USER_ACCESS_TOKEN}
```

## 6) Liste a Mídia do IG User
Com o `ig_user_id` em mãos, recupere os objetos de mídia:

```
GET https://graph.facebook.com/v23.0/{ig_user_id}/media
  ?access_token={USER_ACCESS_TOKEN}
```

Para detalhes de cada mídia (legenda, tipo, URL, etc.), consulte os campos do Instagram Graph API (ex.: `caption,media_type,media_url,timestamp`).

---

## Rotas já prontas no projeto
- `/api/auth/instagram` → inicia o login (alias)
- `/api/admin/instagram/connect` → monta URL do OAuth (v23) com escopos corretos e state
- `/api/admin/instagram/callback` → troca `code` por token, resolve IG account e salva no Firebase

O popup fecha e a página de integrações é notificada via `postMessage`.

## Variáveis de ambiente (.env.local)
Defina apenas no servidor (não commit):

```
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
NEXT_PUBLIC_BASE_URL=https://seu-dominio.com
INSTAGRAM_CALLBACK_URL=https://seu-dominio.com/api/admin/instagram/callback
# Opcional: scopes customizados
# INSTAGRAM_SCOPES=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights,pages_show_list
```

## Dicas
- Para re-solicitar consentimento/escopos, use `?force_reauth=true` (mapeado para `auth_type=rerequest`).
- Para resolver a conta IG conectada à Página, `pages_show_list` ajuda nos metadados; `pages_read_engagement` pode ser útil adicionalmente.
- Tokens expiram (~60 dias). O projeto já salva `expires_at` e tem serviço de auto-renovação.

## Troubleshooting
- Retornou sem `instagram_business_account` nas páginas? Garanta que a conta IG é Business/Creator e está corretamente vinculada à Página.
- Erro de permissão? Confirme as permissões aprovadas no App Review e que o usuário concedeu os escopos.
- Ambiente local vs produção: ajuste `NEXT_PUBLIC_BASE_URL` e `INSTAGRAM_CALLBACK_URL` conforme o domínio atual.

---

Pronto! Você já consegue autenticar via Facebook Login for Business (v23), identificar a conta IG vinculada e listar a mídia dessa conta.
