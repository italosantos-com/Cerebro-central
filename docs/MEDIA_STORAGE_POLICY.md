# Política de Armazenamento de Mídias (Fotos/Vídeos)

## Objetivo

Separar o armazenamento de mídias pesadas por perfil:

- **SuperAdmin (perfil global)**: armazena **fotos e vídeos pesados** no **Firebase (Storage + Firestore)**.
- **Demais admins** (ex.: `italosantos.com/{username}`): **não** enviam binários para o Firebase; usam **URLs externas** (Google / iCloud / etc.) e o sistema salva apenas os metadados/links.

## Regras no backend

- Endpoint: `/api/upload`
  - Requer autenticação de admin (Bearer token ou session cookie).
  - Se vier `file` (upload binário): **permitido apenas** para **SuperAdmin**.
  - Para outros admins: deve ser enviado `externalUrl` (link externo) e o sistema registra no Firestore.

## Impacto no frontend

- Páginas/admin que chamam `/api/upload` devem enviar `Authorization: Bearer <idToken>`.
- Para admins não-superadmin, o fluxo recomendado é usar a aba **Link Externo**.

## Observação sobre iCloud / Google

- iCloud/Google Photos podem não permitir embed direto em `iframe` ou em localhost.
- O player deve oferecer fallback: “Abrir no navegador” quando necessário.
