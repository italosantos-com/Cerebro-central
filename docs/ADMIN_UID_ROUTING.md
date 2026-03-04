# ✅ Estrutura de Rotas - Sistema Multi-UID

## 📊 Padrão de URLs Implementado

### Página Pública de Perfil
```
italosantos.com/:uid
└─ Mostra perfil público do admin com galeria isolada por UID
```

**Arquivo**: `src/app/[uid]/page.tsx`
- ✅ Galeria isolada por UID
- ✅ Dados do perfil específico do UID
- ✅ Configurações de pagamento isoladas

---

### Admin Panel - Todas as Rotas

```
italosantos.com/:uid/admin/
├─ /config              → Configuração Geral
├─ /fotos               → Upload de Fotos
├─ /videos              → Upload de Vídeos  
├─ /integracoes         → Integrações
├─ /assinatura          → Gestão de Assinaturas
├─ /dashboard           → Dashboard Principal
├─ /loja                → Loja (Produtos)
├─ /conversations       → Conversas
├─ /conteudo-exclusivo  → Conteúdo Exclusivo
├─ /avaliacoes          → Avaliações
└─ /settings            → Mais Configurações
```

---

## 🔧 Arquivos Criados/Modificados

### Layout Principal (com isolamento de UID)
**Arquivo**: `src/app/[uid]/admin/layout.tsx`
- ✅ Valida que UID da URL = UID do usuário autenticado
- ✅ Redireciona se tentar acessar UID alheio
- ✅ Renderiza sidebar com links dinâmicos

### Rotas do Admin Panel

Cada rota em `src/app/[uid]/admin/*` deve:
1. **Receber UID via params**: `const { uid } = useParams() as { uid: string }`
2. **Validar autenticação**: Confirmar que user.uid === uid
3. **Buscar dados isolados**: `useAdminData(uid)` ao invés de `useAdminData()`
4. **Atualizar dados isolados**: Passar uid para POST/PUT

---

## 🌐 Middleware (Já Configurado)

O middleware em `middleware.ts` já faz o rewrite automático:

```
Entrada: italosantos.com/:uid/admin/config
         ↓ (rewrite)
Interna: /admin/config
         + header: x-admin-slug = :uid
```

---

## 📁 Estrutura de Diretórios

```
src/app/
├── [uid]/                          ← NEW: rotas dinâmicas por UID
│   ├── page.tsx                    ✅ CRIADO: Página pública do perfil
│   └── admin/
│       ├── layout.tsx              ✅ CRIADO: Layout com validação de UID
│       ├── page.tsx                 → Dashboard (existente)
│       ├── config/
│       │   └── page.tsx            → Config (existente, mover para [uid]/admin/)
│       ├── fotos/
│       │   └── page.tsx            → Photos (existente, mover para [uid]/admin/)
│       ├── videos/
│       │   └── page.tsx            → Videos (existente, mover para [uid]/admin/)
│       ├── integracoes/
│       │   └── page.tsx            → Integrations (existente, mover para [uid]/admin/)
│       ├── assinatura/
│       │   └── page.tsx            → Subscriptions (existente, mover para [uid]/admin/)
│       ├── loja/
│       │   └── page.tsx            → Products (existente, mover para [uid]/admin/)
│       ├── conversations/
│       │   └── page.tsx            → Conversations (existente, mover para [uid]/admin/)
│       ├── conteudo-exclusivo/
│       │   └── page.tsx            → Exclusive Content (existente, mover para [uid]/admin/)
│       ├── avaliacoes/
│       │   └── page.tsx            → Reviews (existente, mover para [uid]/admin/)
│       └── settings/
│           └── page.tsx            → Settings (existente, mover para [uid]/admin/)
```

---

## 🔐 Segurança - Fluxo de Validação

### 1️⃣ **Middleware**
- Extrai `:uid` da URL
- Injeta `x-admin-slug: :uid` no header
- Reescreve para `/admin/*` internamente

### 2️⃣ **Layout.tsx ([uid]/admin/layout.tsx)**
- Valida que `user.uid === URL:uid`
- Redireciona se mismatch: `router.push(/${user.uid}/admin/config)`
- Renderiza sidebar com links corretos

### 3️⃣ **Página Component**
- Recebe UID via `useParams()`
- Passa UID para hooks: `useAdminData(uid)`
- Dados são buscados isoladamente do Firestore

### 4️⃣ **API Routes**
- Extraem `x-admin-slug` do header
- Validam JWT token
- Filtram dados por `adminUid`

---

## ✅ Checklist de Implementação

- [x] Criar [uid]/page.tsx (página pública)
- [x] Criar [uid]/admin/layout.tsx (validação + sidebar)
- [x] Middleware configurado corretamente
- [ ] Mover componentes admin existentes para [uid]/admin/
- [ ] Atualizar hooks para aceitar uid parameter
- [ ] Verificar isolamento de dados em APIs
- [ ] Testar URLs: italosantos.com/:uid/admin/*
- [ ] Testar acesso negado (UID diferente)
- [ ] Testar galeria isolada por UID

---

## 🧪 Teste Rápido

### Criar teste de isolamento:
```bash
# Admin A tenta acessar painel de Admin B
curl "https://italosantos.com/admin-b-uid/admin/config" \
  -H "Authorization: Bearer admin-a-token"

# Resultado esperado: ❌ 401 ou redirect para admin-a-uid
```

### Verificar galeria isolada:
```bash
GET /api/admin/data/photos?adminUid=admin-a-uid
# Retorna: Fotos apenas de admin-a-uid ✅

GET italosantos.com/admin-a-uid
# Mostra: Galeria com fotos de admin-a-uid ✅
```

---

## 📚 Referências Internos

- **Middleware**: [middleware.ts](../middleware.ts)
- **Layout Admin**: [src/app/[uid]/admin/layout.tsx](../src/app/[uid]/admin/layout.tsx)
- **Página Pública**: [src/app/[uid]/page.tsx](../src/app/[uid]/page.tsx)
- **Sidebar**: [src/components/admin/sidebar.tsx](../src/components/admin/sidebar.tsx)

---

**Status**: ✅ Estrutura base implementada  
**Próximo passo**: Mover componentes existentes + testar isolamento
