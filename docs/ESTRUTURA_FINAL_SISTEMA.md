# Estrutura Final do Sistema (Pós-Limpeza)

Data: 2025-11-02
Este documento resume o estado final planejado para funcionamento correto do sistema após a limpeza de duplicatas/arquivos cruzados. Ele lista o que deve ser deletado, o que deve permanecer (com função/contrato), a estrutura por áreas e a contagem dos arquivos principais.

Referências:
- Relatório detalhado: `docs/LIMPEZA_DUPLICATAS_RELATORIO.md`
- Lista de removidos: `docs/DUPLICATES_REMOVED_LIST.md`

---

## 1) O que deve ser deletado (fisicamente)

Estes arquivos foram removidos logicamente (viraram módulos vazios) e não possuem importações ativas. Podem ser excluídos do disco sem impactar o sistema:

1. `src/middleware.ts` — middleware duplicado (o canônico fica na raiz)
2. `src/components/admin/AdminPayPalConnectButton.tsx` — substituído por `src/components/auth/PayPalLoginButton.tsx`
3. `src/app/perfil/page-clean.tsx` — página alternativa antiga
4. `src/components/auth/FacebookLoginButton.tsx` — variante admin-style antiga
5. `src/components/auth/InstagramLoginButton.tsx` — variante admin-style antiga
6. `src/components/auth/TwitterLoginButton.tsx` — variante admin-style antiga
7. `src/components/auth/MercadoPagoLoginButton.tsx` — variante admin-style antiga

Resumo: 7 arquivos para deletar fisicamente.

---

## 2) O que deve ficar (canônicos) e sua função

Arquivos essenciais para o funcionamento como planejado, com seus papéis:

- `middleware.ts` (raiz) — ÚNICO middleware ativo
  - Regras:
    - Ignora `/admin` (não interfere em rotas administrativas)
    - Permite `/galeria-assinantes`
    - Protege `/perfil` (auth) e `/dashboard` (auth + assinatura)
  - Contrato (alto nível):
    - Entrada: `NextRequest` (URL atual)
    - Saída: `NextResponse.next()` (passa), `NextResponse.redirect()` (redireciona), ou `NextResponse.rewrite()` quando aplicável

- `src/app/admin/profile/page.tsx` — Perfil do Administrador
  - Funções:
    - Mostrar avatar, nome, email do admin
    - Atualizar nome de exibição
    - Iniciar troca de email (requer senha atual; fluxo com verificação por email)
    - Alterar senha (senha atual + nova)
  - Principais dependências: `useAuth()` (contexto), componentes `@/components/ui/*`, `sonner` para toasts
  - Contratos de ações (alto nível):
    - `updateUserProfile(updates: { displayName?: string }) => Promise<void>`
    - `updateUserEmail(newEmail: string, currentPassword: string) => Promise<any>`
    - `updateUserPassword(currentPassword: string, newPassword: string) => Promise<void>`

- `src/app/admin/integrations/page.tsx` — Integrações Admin
  - Funções:
    - Exibir cartões de integrações com status e ações (conectar/desconectar/sincronizar)
    - Usar `@/components/auth/PayPalLoginButton` para PayPal
  - Observação: permanece como página canônica de integrações administrativas

- `src/components/auth/PayPalLoginButton.tsx` — Botão PayPal (Admin)
  - Função: renderiza botão de Conectar/Desconectar/Carregando
  - Contrato de props:
    ```ts
    interface PayPalLoginButtonProps {
      isConnected: boolean;
      isLoading: boolean;
      onConnect: () => void;
      onDisconnect: () => void;
    }
    ```
  - Comportamento:
    - `isLoading = true` → botão desabilitado com texto "Carregando..."
    - `isConnected = true` → botão "Desconectar" (variant destrutivo)
    - Caso contrário → botão "Conectar"

- `src/components/FacebookLoginButton.tsx` — SDK do site (Facebook)
  - Função: implementação real do login via SDK (para uso no site)
  - Importar preferencialmente via reexport canônico (ver abaixo)

- `src/components/InstagramLoginButton.tsx` — SDK do site (Instagram)
  - Função: implementação real do login via SDK (para uso no site)
  - Importar preferencialmente via reexport canônico (ver abaixo)

- `src/components/social/FacebookLoginButton.tsx` — Reexport canônico
  - Conteúdo: `export { default } from '../FacebookLoginButton'`
  - Uso: `@/components/social/FacebookLoginButton`

- `src/components/social/InstagramLoginButton.tsx` — Reexport canônico
  - Conteúdo: `export { default } from '../InstagramLoginButton'`
  - Uso: `@/components/social/InstagramLoginButton`

- `src/app/perfil/page.tsx` — Perfil do Usuário (canônico)
  - Funções: gerenciamento completo de perfil do usuário, incluindo Face ID opcional, troca de email/senha com fluxos verificados e sync com Firestore

Resumo: 8 arquivos canônicos principais listados acima (há outros arquivos de UI/serviços no projeto que permanecem inalterados).

---

## 3) Estrutura por áreas (alto nível)

- Middleware / Roteamento
  - `middleware.ts` (raiz) — único middleware

- Admin
  - `src/app/admin/profile/page.tsx` — Perfil Administrativo
  - `src/app/admin/integrations/page.tsx` — Integrações administrativas (usa `PayPalLoginButton`)

- Site (Social SDK)
  - `src/components/FacebookLoginButton.tsx` — implementação SDK
  - `src/components/InstagramLoginButton.tsx` — implementação SDK
  - Reexports canônicos: `src/components/social/*`

- Usuário (Perfil)
  - `src/app/perfil/page.tsx` — página canônica de perfil do usuário

---

## 4) Contagem dos arquivos-chave

- Para deletar fisicamente: 7
- Para manter (canônicos listados neste doc): 8

Observação: o projeto contém vários outros arquivos (UI, serviços, hooks, etc.). Aqui focamos as peças afetadas pela limpeza/organização.

---

## 5) Garantias de funcionamento

- Não há importações ativas para os arquivos marcados para remoção
- Importações canônicas padronizadas:
  - Facebook/Instagram (SDK): `@/components/social/FacebookLoginButton` e `@/components/social/InstagramLoginButton`
  - PayPal (Admin): `@/components/auth/PayPalLoginButton`
- Middleware único assegura comportamento consistente entre rotas públicas, protegidas e administrativas

---

## 6) Observações de ambiente

- Se surgirem erros de tipos do ambiente (ex.: missing `react`, `next/server`, `@types/node`), instale dependências localmente:
  ```bash
  npm install
  # se necessário
  npm install -D @types/react @types/node
  ```
- Não são erros introduzidos pelas mudanças; são do setup local.

---

## 7) Próximos passos opcionais

- Remover fisicamente os 7 arquivos listados (já estão vazios, sem código)
- Evoluir a página Admin Profile com upload de foto (baseado no fluxo de `src/app/perfil/page.tsx`)
- Manter qualquer novo botão social reexportado via `src/components/social/*` para evitar duplicatas
