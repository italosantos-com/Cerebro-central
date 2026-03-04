# Firebase Data Connect - Schema & Queries

## 📋 Schema Completo Criado

### Tabelas Principais

1. **User** - Usuários do sistema
   - Firebase Auth integration
   - Perfil público
   - Admin flag

2. **PasswordReset** - Recuperação de senha
   - Token único
   - Expiração
   - Controle de uso

3. **SocialAccount** - Contas sociais conectadas
   - Twitter, Instagram, Facebook, PayPal, MercadoPago
   - Tokens de acesso
   - Status e sincronização

4. **MediaAsset** - Arquivos de mídia
   - Imagens, vídeos, áudio
   - Metadata (dimensões, duração, etc.)
   - Tags e descrição

5. **Post** - Posts cross-platform
   - Status (draft, scheduled, published)
   - Caption e mídia associada

6. **PlatformPost** - Posts por plataforma
   - Link com Post e SocialAccount
   - Status de publicação

7. **TwitterPhoto** - Fotos do Twitter
   - Feed público
   - Prioridade e status

8. **TwitterVideo** - Vídeos do Twitter
   - Feed público
   - Duração e thumbnail

9. **TwitterAccount** - Contas do Twitter
   - Admin account
   - Sincronização

10. **ProductService** - Produtos/Serviços
    - Digital ou físico
    - Estoque
    - Categoria

11. **Transaction** - Transações
    - PayPal, MercadoPago, PIX
    - Status e histórico

12. **Notification** - Notificações
    - Email, SMS, Push
    - Status de envio

---

## 🔍 Queries Criadas

### User Queries
- `GetUserByFirebaseUid` - Buscar por Firebase UID
- `GetUserByEmail` - Buscar por email
- `GetUserBySlug` - Buscar por slug público
- `ListUsers` - Listar usuários (admin)
- `CreateUser` - Criar usuário
- `UpdateUser` - Atualizar perfil
- `DeleteUser` - Deletar usuário

### Password Reset
- `GetPasswordResetByToken` - Validar token
- `CreatePasswordReset` - Criar token de reset
- `MarkPasswordResetUsed` - Marcar token como usado

### Social Accounts
- `GetUserSocialAccounts` - Listar contas sociais
- `GetSocialAccountByPlatform` - Buscar por plataforma
- `CreateSocialAccount` - Conectar conta
- `UpdateSocialAccount` - Atualizar tokens
- `DeleteSocialAccount` - Desconectar conta

### Media Assets
- `GetUserMediaAssets` - Listar mídia do usuário
- `GetMediaAssetById` - Buscar mídia por ID
- `CreateMediaAsset` - Upload de mídia
- `DeleteMediaAsset` - Deletar mídia (soft delete)

### Twitter Feed
- `GetTwitterPhotos` - Fotos do feed
- `GetTwitterVideos` - Vídeos do feed
- `CreateTwitterPhoto` - Adicionar foto
- `CreateTwitterVideo` - Adicionar vídeo
- `UpdateTwitterPhotoStatus` - Atualizar status
- `UpdateTwitterVideoStatus` - Atualizar status

### Products
- `GetUserProducts` - Produtos do usuário
- `GetActiveProducts` - Produtos ativos (público)
- `CreateProduct` - Criar produto
- `UpdateProduct` - Atualizar produto

### Transactions
- `GetUserTransactions` - Transações do usuário
- `GetTransactionById` - Detalhes da transação
- `CreateTransaction` - Registrar transação
- `UpdateTransactionStatus` - Atualizar status

### Notifications
- `GetUserNotifications` - Notificações do usuário
- `CreateNotification` - Criar notificação
- `UpdateNotificationStatus` - Atualizar status

---

## 🚀 Deploy e Uso

### 1. Deploy do Schema
```bash
cd dataconnect
firebase dataconnect:sql:migrate
```

### 2. Gerar SDK
```bash
firebase dataconnect:sdk:generate
```

### 3. Usar no Código
```typescript
import { getDataConnect } from 'firebase/data-connect';
import { getUserByFirebaseUid, createUser } from './generated';

// Buscar usuário
const user = await getUserByFirebaseUid({ firebaseUid: 'abc123' });

// Criar usuário
await createUser({
  firebaseUid: 'abc123',
  email: 'user@example.com',
  displayName: 'User Name',
  photoUrl: 'https://example.com/photo.jpg',
});
```

---

## 🔐 Segurança

### Níveis de Auth
- `PUBLIC` - Acesso público
- `USER` - Requer autenticação
- `ADMIN` - Apenas admins (implemente no código)

### Best Practices
1. Sempre validar `firebaseUid` no backend
2. Usar row-level security no PostgreSQL
3. Validar permissões antes de operações sensíveis
4. Sanitizar inputs

---

## 📊 Índices Recomendados

```sql
-- User indexes
CREATE INDEX idx_user_firebase_uid ON user(firebase_uid);
CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_slug ON user(public_profile_slug);

-- Social accounts
CREATE INDEX idx_social_user_platform ON social_account(user_id, platform);

-- Media assets
CREATE INDEX idx_media_user_type ON media_asset(user_id, media_type);

-- Twitter feed
CREATE INDEX idx_twitter_photo_feed ON twitter_photo(added_to_feed, is_active, priority);
CREATE INDEX idx_twitter_video_feed ON twitter_video(added_to_feed, is_active, priority);

-- Transactions
CREATE INDEX idx_transaction_user ON transaction(user_id, received_at);
CREATE INDEX idx_transaction_gateway_id ON transaction(gateway_transaction_id);

-- Notifications
CREATE INDEX idx_notification_user_status ON notification(user_id, status);
```

---

## 🧪 Testes

### Teste de Conexão
```typescript
import { connectDataConnectEmulator } from 'firebase/data-connect';

// Em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  connectDataConnectEmulator(dataConnect, 'localhost', 9399);
}
```

### Queries de Teste
```graphql
# Criar usuário de teste
mutation {
  createUser(
    firebaseUid: "test123"
    email: "test@example.com"
    displayName: "Test User"
  )
}

# Buscar usuário
query {
  getUserByEmail(email: "test@example.com") {
    id
    displayName
    email
  }
}
```

---

## 📝 Próximos Passos

1. **Deploy do Schema:**
   ```bash
   firebase dataconnect:sql:migrate
   ```

2. **Gerar SDK TypeScript:**
   ```bash
   firebase dataconnect:sdk:generate
   ```

3. **Integrar no Código:**
   - Substituir calls diretas ao Firestore
   - Usar queries do Data Connect
   - Implementar cache e optimistic updates

4. **Monitoramento:**
   - Configurar logs
   - Dashboard de queries
   - Alertas de performance

---

## 🔗 Links Úteis

- [Firebase Data Connect Docs](https://firebase.google.com/docs/data-connect)
- [GraphQL Syntax](https://graphql.org/learn/)
- [PostgreSQL on Cloud SQL](https://cloud.google.com/sql/docs/postgres)
