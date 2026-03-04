# FirebaseUI Web – Guia de Uso neste Projeto

Este documento explica como usamos o FirebaseUI Web (carregado por CDN) para autenticação nesta base de código, cobrindo cadastro e login com Google, Apple e Face ID, o painel de Integrações (Facebook, Instagram, Twitter e Microsoft), e o fluxo de cadastro de administradores (SMS + Email + Face ID).


## Visão geral

- O FirebaseUI Web é carregado dinamicamente via CDN para evitar problemas de SSR e conflitos de dependências.
- Os widgets são inicializados apenas no cliente e mostrados dentro de modais/portais (Radix UI Dialog).
- Relacionados:
  - `src/components/admin/FirebaseUiDemo.tsx` – exemplo completo com Email/Senha e Telefone (SMS).
  - `src/components/admin/AdminDualFirebaseUi.tsx` – fluxo sequencial para administradores: Email (verificado) → SMS (vinculado).
  - `src/components/admin/FirebaseUiSocialButtons.tsx` – exemplo de botões para abrir UI de provedores sociais (Facebook/Twitter) em modal.
  - `src/app/admin/integrations/page.tsx` – Integrações usando FirebaseUI (Twitter) sem alterar aparência dos cards.


## Cadastro/Login – Google, Apple e Face ID

- Na página inicial, o modal de cadastro/login oferece:
  - Google (Firebase Auth – `signInWithPopup` com `GoogleAuthProvider`)
  - Apple (Firebase Auth – `OAuthProvider('apple.com')`)
  - Face ID (fluxo próprio local + Firestore)
- Arquivos relevantes:
  - `src/components/signup-type-modal.tsx` – modal com botões Google/Apple/Face ID.
  - `src/lib/firebase.ts` – inicialização do Firebase no cliente.
- Após login com Google/Apple, marcamos `localStorage.isAuthenticated = 'true'` para permitir que a UI libere pagamentos/galerias imediatamente, enquanto os listeners de auth finalizam a sincronização.


## Painel → Integrações (Facebook, Instagram, Twitter, Microsoft)

- Tela: `src/app/admin/integrations/page.tsx`.
- Cards mantêm o visual original. O botão “Conectar com Twitter” abre um Dialog com o FirebaseUI Web (modo popup) para o provedor `twitter.com`.
- Facebook e Instagram seguem seus fluxos específicos já existentes; é possível migrar usando FirebaseUI Web quando apropriado.
- Dicas:
  - Habilite os provedores no Console do Firebase (Authentication → Sign-in method) antes de testar.
  - Para Twitter, certifique-se das chaves/API e que o provedor esteja ATIVADO no Firebase.


## Cadastro de Admin – Fluxo SMS + Email + Face ID

- A partir da tela de login do admin, clique em “Cadastre-se como admin”.
- Modal de cadastro (arquivo `src/components/admin/AdminRegisterModal.tsx`):
  1) Passo Nome – informe seu nome e clique em Próximo.
  2) Passo Autenticação – `AdminDualFirebaseUi`:
     - Passo 1 de 2: Email/Senha via FirebaseUI (com verificação obrigatória de e-mail).
     - Botão “Já verifiquei” atualiza o status; ao verificado, surge botão “Próximo”.
     - Passo 2 de 2: Telefone (SMS) via FirebaseUI. Vinculamos o telefone ao mesmo usuário (link com credential).
  3) Conclusão – Criamos/atualizamos o documento em `admins/{uid}` usando `ensureAdminDoc`. As Cloud Functions podem definir custom claims.
- Arquivos:
  - `src/components/admin/AdminRegisterModal.tsx`
  - `src/components/admin/AdminDualFirebaseUi.tsx`
  - `src/services/admin-auth-service.ts` (função `ensureAdminDoc`)


## Configuração necessária

1) Console do Firebase → Authentication → Sign-in method:
   - Ative: Email/Password, Phone, Google, Apple, (Twitter/Facebook/Microsoft, se usar no painel).
   - Para Apple/Twitter, configure as chaves e domínios de retorno.

2) Variáveis de ambiente (cliente – `NEXT_PUBLIC_*`):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.
   - Opcional: `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` para desenvolvimento.

3) Admin SDK (servidor – `src/lib/firebase-admin.ts`):
   - Suporta credenciais via JSON em env (`FIREBASE_SERVICE_ACCOUNT`), ou chave privada Base64 (`FIREBASE_PRIVATE_KEY_BASE64`), ou variáveis discretas.
   - Normaliza `\n` na private key e permite fallback para ADC (Hosting/Cloud Run/Functions).


## Como rodar localmente (opcional)

```bash
# 1) Defina .env.local com NEXT_PUBLIC_* do seu projeto Firebase
# 2) (Opcional) Inicie emuladores, se desejar usar SMS/Firestore locais
# 3) Inicie o dev server
npm run dev
```

Se usar emuladores (`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true`), o Auth/Firestore/Functions se conectam a `localhost` (portas padrões). Verifique a `src/lib/firebase.ts` para portas em uso.


## Dicas e troubleshooting

- Popup não abre (Twitter/Apple/Google):
  - Verifique se o provedor está ATIVADO no Console do Firebase e se as credenciais estão corretas.
  - Desative bloqueadores de popup no navegador.
- UI do FirebaseUI não aparece nos modais:
  - A UI é inicializada com pequeno atraso para garantir que o container no portal Radix esteja montado (evita race conditions). Se ainda falhar, recarregue a página.
- SMS no desenvolvimento:
  - Em localhost com emuladores, o reCAPTCHA pode ser relaxado. No ambiente real, o reCAPTCHA é requerido.
- Strict Mode (React) em dev:
  - Efeitos podem rodar duas vezes; por isso fazemos `ui.delete()` no cleanup e usamos checagens/atrasos controlados.


## Segurança & Regras

- Garanta que suas regras de Firestore/Storage sigam o princípio de menor privilégio.
- O documento `admins/{uid}` ativa gatilhos e/ou validação de claims para acesso ao painel.
- Evite expor secrets no cliente; use variáveis `NEXT_PUBLIC_*` apenas para credenciais Web do Firebase.


## Onde editar/estender

- Adicionar provedores no FirebaseUI: ajuste `signInOptions` nos componentes (`FirebaseUiDemo`, `AdminDualFirebaseUi`, social buttons/flows).
- Ajustar UX (textos/botões): edite os componentes de modal/card correspondentes.
- Integrar claims e rotas admin: refine as Cloud Functions e o middleware.

---

Se quiser, posso adicionar exemplos de configuração por ambiente (dev/staging/prod) e um checklist para ativar cada provedor (URLs de callback, domínios autorizados) no Console do Firebase.
