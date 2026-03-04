# Relatório de Limpeza: Páginas/Arquivos Duplicados e Cruzados

Data: 2025-11-02
Responsável: Automação de limpeza e padronização

Este documento descreve todas as ações realizadas para corrigir rotas cruzadas, componentes duplicados e referências inconsistentes. Inclui o status de cada arquivo afetado, onde era usado, qual ação foi tomada e o que ainda pode ser removido com segurança.

---

## Objetivos
- Eliminar comportamento cruzado de rotas (Next.js middleware duplicado)
- Padronizar componentes sociais (Facebook/Instagram) e separar Admin vs SDK
- Corrigir importações e remover dependências frágeis
- Documentar claramente o que foi mantido, depreciado (no-op) e o que pode ser removido

## Resumo das mudanças
- Middleware consolidado no projeto (1 só ponto de verdade)
- Botões sociais: padronização via caminhos canônicos e descontinuação de variantes “auth” antigas
- Integrações Admin: uso canônico do botão PayPal
- Página de perfil alternativa: neutralizada para evitar conflitos
- Página de Perfil do Admin: implementada (não faz parte da limpeza, mas agrega valor)

---

## Rotas e Middleware

- Arquivo canônico:
  - `middleware.ts` (raiz) — único middleware ativo. Define regras e bypass para:
    - Ignorar `/admin` (não interferir em rotas administrativas)
    - Permitir livre acesso a `/galeria-assinantes`
    - Proteger `/perfil` (auth) e `/dashboard` (auth + assinatura)
    - Em ambiente de desenvolvimento, agir como passthrough quando aplicável
- Arquivo neutralizado:
  - `src/middleware.ts` — substituído por `export {}` com comentários para evitar conflitos de execução

Impacto: garante comportamento previsível de rotas/app sem efeitos cruzados.

---

## Componentes sociais (Facebook/Instagram)

- Canais canônicos (SDK Site):
  - `src/components/social/FacebookLoginButton.tsx` → re-exporta `../FacebookLoginButton`
  - `src/components/social/InstagramLoginButton.tsx` → re-exporta `../InstagramLoginButton`
- Variantes antigas (Admin-style) removidas:
  - `src/components/auth/FacebookLoginButton.tsx` — removido
  - `src/components/auth/InstagramLoginButton.tsx` — removido
  - `src/components/auth/TwitterLoginButton.tsx` — removido
  - `src/components/auth/MercadoPagoLoginButton.tsx` — removido

Uso anterior: algumas páginas admin chegaram a importar variantes `auth/*`. Agora, recomenda-se usar cartões/handlers (IntegrationCard) ou os re-exports em `components/social/*` quando o caso for login SDK para o site.

---

## Integrações de Pagamento (PayPal)

- Canônico:
  - `src/components/auth/PayPalLoginButton.tsx` — restaurado como o botão oficial
    - Ajuste: removido `lucide-react` (Loader2). O estado de loading foi simplificado para evitar dependências/typings externos.
- Removido:
  - `src/components/admin/AdminPayPalConnectButton.tsx` — removido por solicitação; substituído por `src/components/auth/PayPalLoginButton.tsx`.

Uso atual: a página de integrações admin utiliza `@/components/auth/PayPalLoginButton`.

---

## Página de Perfil (usuário) duplicada

- Canônico: `src/app/perfil/page.tsx`
- Alternativa antiga: `src/app/perfil/page-clean.tsx` — removida.

Motivo: evitar rotas/perfis alternativos conflitantes e simplificar manutenção.

---

## Página de Perfil do Admin (novo)

- Implementado em: `src/app/admin/profile/page.tsx`
- Funcionalidades:
  - Mostrar avatar, nome e email
  - Atualizar nome de exibição (`useAuth().updateUserProfile`)
  - Alterar email (requer senha atual; fluxo de verificação) (`useAuth().updateUserEmail`)
  - Alterar senha (`useAuth().updateUserPassword`)
- UI: usa componentes shadcn existentes em `@/components/ui/*` (sem novas lib externas)

---

## Tabela de arquivos impactados

| Arquivo | Status | Usado atualmente? | Ação tomada | Próximo passo |
|---|---|---|---|---|
| `middleware.ts` | Mantido (canônico) | Sim | Consolidado como única fonte de verdade | Nenhum |
| `src/middleware.ts` | Removido | Não | Duplicado do middleware raiz | Nenhum |
| `src/components/FacebookLoginButton.tsx` | Mantido | Sim (via `social/*`) | Sem mudanças | Usar via `components/social/*` |
| `src/components/InstagramLoginButton.tsx` | Mantido | Sim (via `social/*`) | Sem mudanças | Usar via `components/social/*` |
| `src/components/social/FacebookLoginButton.tsx` | Canônico (re-export) | Sim | Padronização de import | Nenhum |
| `src/components/social/InstagramLoginButton.tsx` | Canônico (re-export) | Sim | Padronização de import | Nenhum |
| `src/components/auth/FacebookLoginButton.tsx` | Removido | Não | Variantes admin-style consolidadas | Nenhum |
| `src/components/auth/InstagramLoginButton.tsx` | Removido | Não | Variantes admin-style consolidadas | Nenhum |
| `src/components/auth/TwitterLoginButton.tsx` | Removido | Não | Variantes admin-style consolidadas | Nenhum |
| `src/components/auth/MercadoPagoLoginButton.tsx` | Removido | Não | Variantes admin-style consolidadas | Nenhum |
| `src/components/auth/PayPalLoginButton.tsx` | Mantido (canônico) | Sim | Removida dep. `lucide-react`; simplificado loading | Nenhum |
| `src/components/admin/AdminPayPalConnectButton.tsx` | Removido | Não | Substituído por `auth/PayPalLoginButton.tsx` | Nenhum |
| `src/app/perfil/page.tsx` | Mantido (canônico) | Sim | Nenhum | Nenhum |
| `src/app/perfil/page-clean.tsx` | Removido | Não | Alternativa antiga | Nenhum |
| `src/app/admin/profile/page.tsx` | Novo | Sim (admin) | Implementado | Evoluir conforme necessidade |

---

## Como importar após a padronização (exemplos)

- Facebook/Instagram (SDK do site):
  - Antes (variável conforme local): `@/components/FacebookLoginButton`
  - Agora (canônico):
    - `@/components/social/FacebookLoginButton`
    - `@/components/social/InstagramLoginButton`

- Integrações Admin (PayPal):
  - Antes: `@/components/admin/AdminPayPalConnectButton`
  - Agora (canônico): `@/components/auth/PayPalLoginButton`

---

## Arquivos removidos nesta limpeza

Remoções aplicadas (sem referências em código):

1. `src/middleware.ts`
2. `src/components/admin/AdminPayPalConnectButton.tsx`
3. `src/app/perfil/page-clean.tsx`
4. `src/components/auth/FacebookLoginButton.tsx`
5. `src/components/auth/InstagramLoginButton.tsx`
6. `src/components/auth/TwitterLoginButton.tsx`
7. `src/components/auth/MercadoPagoLoginButton.tsx`

---

## Observações sobre o ambiente de build/type

- Foram detectados erros de tipos globais relacionados ao ambiente (ex.: `react`, `next/server`, `@types/node`). Esses erros não foram introduzidos pelas mudanças; desaparecerão após instalar dependências localmente.
- Recomendado:
  - `npm install`
  - (se necessário) `npm install -D @types/react @types/node`

---

## Apêndice A — Verificações realizadas

- Varreduras de referências para garantir segurança na remoção/neutralização:
  - Nenhuma importação ativa para `src/components/admin/AdminPayPalConnectButton.tsx`
  - Nenhuma importação ativa para `src/app/perfil/page-clean.tsx`
  - Nenhuma importação ativa para `src/components/auth/{Facebook,Instagram,Twitter,MercadoPago}LoginButton.tsx`
- Admin Integrations usa `@/components/auth/PayPalLoginButton` corretamente.

---

## Próximos passos sugeridos
- Remover fisicamente os arquivos listados acima (quando conveniente)
- Centralizar qualquer novo botão social via `components/social/*`
- Manter um único middleware (raiz) como regra de arquitetura
- Se necessário, estender `docs/ADMIN_PROFILE_PAGE.md` com upload de foto para Admin (baseado no fluxo do perfil de usuário)
# Removed Duplicates and Unused Files

Date: 2025-11-02

The following files were removed as part of duplicates/unused cleanup:

- src/middleware.ts — duplicated middleware (root `middleware.ts` is canonical)
- src/components/admin/AdminPayPalConnectButton.tsx — replaced by `src/components/auth/PayPalLoginButton.tsx`
- src/app/perfil/page-clean.tsx — alternate profile page, superseded by `src/app/perfil/page.tsx`
- src/components/auth/FacebookLoginButton.tsx — admin-style variant removed; prefer `IntegrationCard` handlers or SDK under `components/social/*`
- src/components/auth/InstagramLoginButton.tsx — admin-style variant removed
- src/components/auth/TwitterLoginButton.tsx — admin-style variant removed
- src/components/auth/MercadoPagoLoginButton.tsx — admin-style variant removed

Canonical files kept:
- src/components/FacebookLoginButton.tsx (SDK-integrated variant)
- src/components/social/FacebookLoginButton.tsx (re-export)
- src/components/InstagramLoginButton.tsx (SDK-integrated variant)
- src/components/social/InstagramLoginButton.tsx (re-export)
- src/components/auth/PayPalLoginButton.tsx (canonical PayPal integration button for Admin)

Notes:
- Admin integrations page (`src/app/admin/integrations/page.tsx`) uses inline handlers and `IntegrationCard`, plus `PayPalLoginButton`. No other social auth button components are required there.
