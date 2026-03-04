# Feed de Vídeos do Twitter do Admin

## Visão Geral

Este sistema permite que o feed de vídeos da página pública seja automaticamente alimentado pela conta do Twitter que o admin fizer login no painel administrativo.

## Como Funciona

### 1. Login do Admin
- Quando o admin faz login no sistema, suas informações do Twitter são automaticamente salvas
- Apenas uma conta admin pode estar ativa por vez
- O sistema detecta automaticamente quando o admin está logado

### 2. Sincronização Automática
- Vídeos da conta Twitter do admin são sincronizados automaticamente
- O admin pode controlar quais vídeos aparecem no feed público
- Sistema de prioridades permite organizar a ordem dos vídeos

### 3. Feed Público
- A página `/videos` mostra os vídeos do admin na aba "Vídeos do Admin"
- Vídeos são exibidos com player inteligente que suporta múltiplos formatos
- Badge especial indica que são vídeos do feed do admin

## Estrutura do Sistema

### Serviços
- `AdminTwitterVideoFeedService`: Gerencia dados dos vídeos do Twitter do admin
- Métodos principais:
  - `saveAdminTwitterAccount()`: Salva informações da conta do admin
  - `getTwitterVideosForFeed()`: Busca vídeos para o feed público
  - `syncRecentTwitterVideos()`: Sincroniza novos vídeos
  - `updateVideoPriority()`: Atualiza prioridade de exibição
  - `removeVideoFromFeed()`: Remove vídeo do feed

### Hooks React
- `useAdminTwitterVideoFeed`: Hook para gerenciar estado dos vídeos
- Funcionalidades:
  - Carregamento de vídeos
  - Sincronização
  - Atualização de prioridades
  - Remoção de vídeos
  - Estatísticas do feed

### Páginas
- `/admin/twitter-video-feed`: Painel de administração dos vídeos
- `/videos`: Página pública com feed de vídeos

### APIs
- `POST /api/admin/twitter-video-feed`: Sincronizar vídeos
- `GET /api/admin/twitter-video-feed`: Buscar vídeos e estatísticas
- `PATCH /api/admin/twitter-video-feed/[videoId]`: Atualizar prioridade
- `DELETE /api/admin/twitter-video-feed/[videoId]`: Remover vídeo

## Configuração Firebase

### Coleções Firestore
```javascript
// admin_twitter_videos
{
  tweetId: string,
  mediaUrl: string,
  mediaKey: string,
  text: string,
  createdAt: string,
  username: string,
  profileImage: string,
  isActive: boolean,
  addedToFeed: boolean,
  feedPriority: number,
  thumbnailUrl: string,
  duration: number,
  platform: string
}

// admin_twitter_accounts
{
  uid: string,
  username: string,
  displayName: string,
  profileImage: string,
  accessToken: string,
  refreshToken: string,
  lastSync: string,
  isActive: boolean
}
```

## Fluxo de Uso

### Para o Admin:
1. Fazer login no painel admin
2. Acessar `/admin/twitter-video-feed`
3. Clicar em "Sincronizar Twitter" para buscar vídeos
4. Gerenciar prioridades e remover vídeos conforme necessário
5. Visualizar estatísticas do feed

### Para o Usuário Público:
1. Acessar `/videos`
2. Ver aba "Vídeos do Admin"
3. Assistir vídeos diretamente da conta Twitter do admin
4. Vídeos são atualizados automaticamente conforme admin gerencia

## Recursos

### Painel Admin:
- ✅ Estatísticas detalhadas (total, ativos, última sincronização)
- ✅ Grid visual dos vídeos com thumbnails
- ✅ Sistema de prioridades numerado
- ✅ Remoção individual de vídeos
- ✅ Visualização em modal fullscreen
- ✅ Sincronização manual

### Feed Público:
- ✅ Player inteligente com suporte a múltiplos formatos
- ✅ Badge identificando vídeos do admin
- ✅ Thumbnails e metadados do Twitter
- ✅ Informações do tweet original
- ✅ Carregamento otimizado

### Técnicos:
- ✅ TypeScript completo
- ✅ Hooks React reutilizáveis
- ✅ APIs RESTful
- ✅ Tratamento de erros
- ✅ Loading states
- ✅ Responsivo

## Exemplo de Integração

```tsx
// Usar o hook em qualquer componente
import { useAdminTwitterVideoFeed } from '@/hooks/useAdminTwitterVideoFeed';

function MyComponent() {
  const { videos, loading, syncVideos } = useAdminTwitterVideoFeed();
  
  return (
    <div>
      {loading ? 'Carregando...' : `${videos.length} vídeos`}
      <button onClick={syncVideos}>Sincronizar</button>
    </div>
  );
}
```

## Scripts Utilitários

```bash
# Adicionar vídeos de exemplo (desenvolvimento)
node scripts/add-sample-twitter-videos.js

# O script adiciona 3 vídeos de exemplo para testar o sistema
```

## Status da Implementação

✅ **Completo**: Sistema totalmente funcional com todas as funcionalidades implementadas
- Serviço de gerenciamento de vídeos do Twitter do admin
- Hook React para estado e ações
- Painel administrativo completo
- Integração com feed público
- APIs RESTful
- Tratamento de erros e loading states

O sistema está pronto para uso e pode ser estendido conforme necessário.
