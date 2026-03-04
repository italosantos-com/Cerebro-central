# 🗺️ Roadmap: Sistema Multi-Admin com Isolamento de Dados

## 📊 Timeline Estimada: 4-6 Semanas

```
Semana 1: Infraestrutura & Contexto
├── Firestore Security Rules ✅
├── AdminContext Provider ✅
├── Hooks (useAdminData) ✅
└── API Middleware (withAdminAuth) ✅

Semana 2: APIs de Conversas
├── GET /api/admin/conversations
├── POST /api/admin/conversations
├── PUT /api/admin/conversations/:id
└── DELETE /api/admin/conversations/:id

Semana 3: APIs de Mídia
├── Fotos (GET, POST, DELETE)
├── Vídeos (GET, POST, DELETE)
├── Uploads (GET, POST)
└── Índices Firestore

Semana 4: APIs de Negócios
├── Produtos (CRUD)
├── Assinantes (GET, POST, DELETE)
├── Avaliações (GET, PUT)
└── Integrações (GET, POST, PUT)

Semana 5: Frontend & Migração
├── Componentes do Admin com novos hooks
├── Página pública /:username com dados isolados
├── Script de migração de dados
└── Validação de dados

Semana 6: Testes & Deploy
├── Testes de isolamento
├── Testes de segurança
├── Deploy em produção
└── Monitoramento
```

## Phase 1: Fundação ✅ (Semana 1)

### Tarefas Completadas
- [x] Criar documento de arquitetura (`MULTI_ADMIN_ARCHITECTURE.md`)
- [x] Implementar AdminContext (`src/context/AdminContext.tsx`)
- [x] Implementar hooks de dados (`src/hooks/useAdminData.ts`)
- [x] Implementar middleware de API (`src/lib/admin-api-middleware.ts`)
- [x] Exemplo de API (`src/app/api/admin/conversations-scoped/route.ts`)
- [x] Guia de implementação (`IMPLEMENTATION_GUIDE.md`)

### Próximas Tarefas (Você pode começar):
```bash
# 1. Adicionar AdminContextProvider ao layout.tsx
# 2. Testar AdminContext com um componente simples
# 3. Verificar Security Rules no Firebase Console
```

## Phase 2: APIs de Conversas 📋 (Semana 2)

### Tarefas
- [ ] Implementar GET /api/admin/conversations (com paginação)
- [ ] Implementar POST /api/admin/conversations
- [ ] Implementar GET /api/admin/conversations/:id
- [ ] Implementar PUT /api/admin/conversations/:id
- [ ] Implementar DELETE /api/admin/conversations/:id
- [ ] Criar componentes de UI (ListaConversas, FormConversa)
- [ ] Integrar com useAdminConversations hook

### Arquivo: `src/app/api/admin/conversations/route.ts`

```typescript
import { withAdminAuth } from '@/lib/admin-api-middleware';

// GET - Listar
export const GET = withAdminAuth(async (request, { adminUid }) => {
  // TODO: Implementar
});

// POST - Criar
export const POST = withAdminAuth(async (request, { adminUid }) => {
  // TODO: Implementar
});
```

## Phase 3: APIs de Mídia 📸 (Semana 3)

### Fotos
- [ ] GET /api/admin/photos (com filtro de visibility)
- [ ] POST /api/admin/photos (upload com FormData)
- [ ] DELETE /api/admin/photos/:id

### Vídeos
- [ ] GET /api/admin/videos
- [ ] POST /api/admin/videos
- [ ] DELETE /api/admin/videos/:id

### Uploads Genéricos
- [ ] GET /api/admin/uploads
- [ ] POST /api/admin/uploads
- [ ] DELETE /api/admin/uploads/:id

### Componentes
- [ ] GaleriaFotos (admin)
- [ ] GaleriaVídeos (admin)
- [ ] UploadMídia (drag-drop)
- [ ] VisibilityToggle (public/subscribers/private)

## Phase 4: APIs de Negócios 💼 (Semana 4)

### Produtos
- [ ] GET /api/admin/products
- [ ] POST /api/admin/products
- [ ] PUT /api/admin/products/:id
- [ ] DELETE /api/admin/products/:id

### Assinantes
- [ ] GET /api/admin/subscribers
- [ ] POST /api/admin/subscribers (import)
- [ ] DELETE /api/admin/subscribers/:id
- [ ] PUT /api/admin/subscribers/:id/status

### Avaliações
- [ ] GET /api/admin/reviews
- [ ] PUT /api/admin/reviews/:id (approve/reject)
- [ ] DELETE /api/admin/reviews/:id

### Integrações
- [ ] GET /api/admin/integrations
- [ ] POST /api/admin/integrations/:type (stripe, paypal, etc)
- [ ] PUT /api/admin/integrations/:type
- [ ] DELETE /api/admin/integrations/:type

### Componentes
- [ ] DashboardAdmin (estatísticas isoladas)
- [ ] GerenciadorProdutos
- [ ] ListaAssinantes
- [ ] PainelAvaliações
- [ ] ConfigIntegrações

## Phase 5: Frontend & Migração 🔄 (Semana 5)

### Frontend
- [ ] Atualizar `/admin/dashboard` com hooks novos
- [ ] Atualizar `/admin/fotos` com useAdminPhotos
- [ ] Atualizar `/admin/videos` com useAdminVideos
- [ ] Atualizar `/admin/produtos` com useAdminProducts
- [ ] Atualizar `/admin/assinantes` com useAdminSubscribers
- [ ] Página pública `/:username` com dados isolados
- [ ] Página pública `/:username/galeria` (fotos públicas)
- [ ] Página pública `/:username/videos` (vídeos públicos)

### Migração de Dados
- [ ] Script: `scripts/migrate-conversations.ts`
- [ ] Script: `scripts/migrate-media.ts`
- [ ] Script: `scripts/migrate-products.ts`
- [ ] Script: `scripts/validate-migration.ts`
- [ ] Backup de dados antigos
- [ ] Testes de integridade

### Estrutura Esperada Após Migração
```
Firestore:
├── admins/{uid}/conversations/* ✅
├── admins/{uid}/photos/* ✅
├── admins/{uid}/videos/* ✅
├── admins/{uid}/products/* 
├── admins/{uid}/subscribers/*
├── admins/{uid}/reviews/*
└── admins/{uid}/integrations/*
```

## Phase 6: Testes & Deploy 🚀 (Semana 6)

### Testes
- [ ] Teste de isolamento (Admin A vs Admin B)
- [ ] Teste de segurança (acesso negado)
- [ ] Teste de paginação
- [ ] Teste de visibilidade (public/subscribers/private)
- [ ] Teste de performance (índices)

### Testes de Exemplo
```typescript
// Teste 1: Isolamento
it('Admin A não vê conversas de Admin B', async () => {
  const adminA = await getConversations('uid-a');
  const adminB = await getConversations('uid-b');
  expect(adminA).not.toEqual(adminB);
});

// Teste 2: Segurança
it('Sem token retorna 401', async () => {
  const response = await fetch('/api/admin/conversations');
  expect(response.status).toBe(401);
});

// Teste 3: Visibilidade
it('Fotos privadas não aparecem publicamente', async () => {
  const response = await fetch('/:username/fotos');
  expect(response.photos.every(p => p.visibility !== 'private')).toBe(true);
});
```

### Deploy
- [ ] Deploy em staging
- [ ] Testes de integração em staging
- [ ] Review de Security Rules
- [ ] Verificação de índices
- [ ] Backup antes do deploy
- [ ] Deploy em produção
- [ ] Monitoramento de errors
- [ ] Rollback plan preparado

## Pontos de Checkup

### Checkup 1 (Fim Semana 1)
- [ ] AdminContext funciona
- [ ] useAdminData retorna dados
- [ ] API middleware autentica corretamente
- [ ] Exemplo de conversa funciona

### Checkup 2 (Fim Semana 2)
- [ ] CRUD de conversas funciona
- [ ] Paginação funciona
- [ ] Isolamento verificado (uma query por admin)

### Checkup 3 (Fim Semana 3)
- [ ] Fotos e vídeos salvam em subcoleções
- [ ] Filtro de visibilidade funciona
- [ ] Upload sem erros de autenticação

### Checkup 4 (Fim Semana 4)
- [ ] Todas as APIs respondendo
- [ ] Dashboard mostra dados corretos
- [ ] Integrações salvam isoladamente

### Checkup 5 (Fim Semana 5)
- [ ] Dados migrados com sucesso
- [ ] Dados antigos = dados novos
- [ ] /:username mostra apenas dados públicos

### Checkup 6 (Fim Semana 6)
- [ ] Todos os testes passam
- [ ] Security Rules validadas
- [ ] Performance aceitável
- [ ] Deploy bem-sucedido

## KPIs de Sucesso

✅ **Isolamento**: Admin A nunca vê dados de Admin B
✅ **Segurança**: APIs recusam requisições sem token ou com token errado
✅ **Performance**: Query por admin retorna em <500ms
✅ **Disponibilidade**: Zero downtime durante migração
✅ **Usabilidade**: UI mostra dados isolados sem confusão

## Rollback Plan

Se algo der errado:

1. **Durante migração**: Parar script, fazer restore de backup
2. **Após deploy**: Reverter código, restaurar dados antigos
3. **Se perda de dados**: Usar backups automáticos do Firebase

```bash
# Backup antes de começar
firebase firestore:export gs://backup-bucket/backup-$(date +%s)

# Restaurar se necessário
firebase firestore:import gs://backup-bucket/backup-XXXXX
```

## Documentação Para Cada Fase

| Fase | Documentação | Link |
|------|--------------|------|
| 1 | Arquitetura & Implementação | `MULTI_ADMIN_ARCHITECTURE.md` |
| 2 | API de Conversas | (A criar) |
| 3 | API de Mídia | (A criar) |
| 4 | API de Negócios | (A criar) |
| 5 | Migração & Frontend | `IMPLEMENTATION_GUIDE.md` |
| 6 | Testes & Deploy | (A criar) |

## Dependências Externas

- [x] Firebase Admin SDK (já instalado)
- [x] Firebase Firestore (já inicializado)
- [ ] Algolia (para busca full-text - opcional)
- [ ] Cloud Storage (para uploads grandes - opcional)
- [ ] Cloud Functions (para processamento - opcional)

## Perguntas Frequentes

### P: Por onde começo?
R: Pela Fase 1! Adicione AdminContextProvider ao layout e teste com um componente simples.

### P: Como faço backup dos dados?
R: Firebase faz automaticamente, mas você pode fazer manualmente via Console > Firestore > Export

### P: E se eu tiver 100k+ documentos?
R: Use paginação com `startAfter()` e implementar índices. Opcional: use Algolia para busca.

### P: Como testo isolamento?
R: Criar dois admins diferentes, logar como cada um e verificar que dados são diferentes.

### P: Posso fazer tudo de uma vez?
R: Não recomendado! Divida em fases menores para evitar quebras.

---

**Próximo Passo**: Volte ao `IMPLEMENTATION_GUIDE.md` para começar a Fase 1!
