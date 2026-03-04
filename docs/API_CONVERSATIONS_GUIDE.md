# 🚀 Guia Rápido - APIs de Conversas Admin Isoladas

## 📍 Endpoints Disponíveis

### Base URL
```
/api/admin/conversations-scoped
```

---

## 1️⃣ Listar Conversas (GET)

**Endpoint**: `GET /api/admin/conversations-scoped`

**Headers Necessários**:
```
Authorization: Bearer {idToken}
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "count": 2,
  "conversations": [
    {
      "id": "conv-001",
      "title": "Aula de Python",
      "description": "Aprenda Python do zero",
      "visibility": "subscribers",
      "adminUid": "admin-italo",
      "tags": ["python", "programming"],
      "createdAt": "2026-01-02T10:00:00Z",
      "updatedAt": "2026-01-02T15:30:00Z",
      "messageCount": 5,
      "participants": ["admin-italo"]
    }
  ]
}
```

**Exemplos de Uso**:

```typescript
// TypeScript/React
const token = await user?.getIdToken();
const response = await fetch('/api/admin/conversations-scoped', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
if (data.success) {
  console.log(`Encontradas ${data.count} conversas`);
}
```

---

## 2️⃣ Criar Conversa (POST)

**Endpoint**: `POST /api/admin/conversations-scoped`

**Headers Necessários**:
```
Authorization: Bearer {idToken}
Content-Type: application/json
```

**Body**:
```json
{
  "title": "Aula de JavaScript",
  "description": "Aprenda JavaScript moderno",
  "visibility": "public",  // ou "subscribers" ou "private"
  "tags": ["javascript", "web"]
}
```

**Resposta (201 Created)**:
```json
{
  "success": true,
  "message": "Conversa criada com sucesso",
  "conversationId": "conv-123",
  "data": {
    "id": "conv-123",
    "title": "Aula de JavaScript",
    "adminUid": "admin-italo",
    "createdAt": "2026-01-02T10:00:00Z",
    "updatedAt": "2026-01-02T10:00:00Z"
  }
}
```

**Exemplos de Uso**:

```typescript
const token = await user?.getIdToken();
const response = await fetch('/api/admin/conversations-scoped', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Nova Aula',
    description: 'Descrição da aula',
    visibility: 'public',
    tags: ['aula', 'novo']
  })
});

const data = await response.json();
if (data.success) {
  console.log(`Conversa criada: ${data.conversationId}`);
}
```

---

## 3️⃣ Obter Conversa Específica (GET)

**Endpoint**: `GET /api/admin/conversations-scoped/{id}`

**Headers Necessários**:
```
Authorization: Bearer {idToken}
```

**Parâmetros**:
- `id` - ID da conversa (obrigatório)

**Resposta (200 OK)**:
```json
{
  "success": true,
  "conversation": {
    "id": "conv-001",
    "title": "Aula de Python",
    "description": "Aprenda Python do zero",
    "visibility": "subscribers",
    "adminUid": "admin-italo",
    "createdAt": "2026-01-02T10:00:00Z",
    "updatedAt": "2026-01-02T15:30:00Z"
  }
}
```

**Exemplos de Uso**:

```typescript
const conversationId = 'conv-001';
const token = await user?.getIdToken();
const response = await fetch(
  `/api/admin/conversations-scoped/${conversationId}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
if (data.success) {
  console.log(data.conversation);
}
```

---

## 4️⃣ Atualizar Conversa (PUT)

**Endpoint**: `PUT /api/admin/conversations-scoped/{id}`

**Headers Necessários**:
```
Authorization: Bearer {idToken}
Content-Type: application/json
```

**Body** (todos os campos opcionais):
```json
{
  "title": "Novo Título",
  "description": "Nova descrição",
  "visibility": "public",
  "tags": ["novo", "tag"]
}
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "message": "Conversa atualizada com sucesso",
  "conversationId": "conv-001"
}
```

**Exemplos de Uso**:

```typescript
const conversationId = 'conv-001';
const token = await user?.getIdToken();
const response = await fetch(
  `/api/admin/conversations-scoped/${conversationId}`,
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Título Atualizado',
      visibility: 'subscribers'
    })
  }
);

const data = await response.json();
if (data.success) {
  console.log('Conversa atualizada!');
}
```

---

## 5️⃣ Deletar Conversa (DELETE)

**Endpoint**: `DELETE /api/admin/conversations-scoped/{id}`

**Headers Necessários**:
```
Authorization: Bearer {idToken}
```

**Resposta (200 OK)**:
```json
{
  "success": true,
  "message": "Conversa deletada com sucesso",
  "conversationId": "conv-001"
}
```

**Exemplos de Uso**:

```typescript
const conversationId = 'conv-001';
const token = await user?.getIdToken();
const response = await fetch(
  `/api/admin/conversations-scoped/${conversationId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
if (data.success) {
  console.log('Conversa deletada!');
}
```

---

## ⚠️ Códigos de Erro

| Código | Situação | Solução |
|--------|----------|---------|
| **400** | Campos obrigatórios faltando | Verifique o body da requisição |
| **401** | Token não fornecido/inválido | Faça login novamente |
| **403** | Usuário não é admin | Verifique custom claim `admin=true` |
| **404** | Conversa não encontrada | Verifique o ID da conversa |
| **500** | Erro interno do servidor | Verifique logs do servidor |

---

## 🔒 Segurança

- ✅ Todas as rotas requerem autenticação (Bearer token)
- ✅ Admins só podem acessar suas próprias conversas
- ✅ Dados são isolados por `adminUid`
- ✅ Firestore Security Rules validam propriedade

---

## 📝 Notas Importantes

1. **Isolamento de Dados**: Admin A nunca vê conversas de Admin B
2. **Authenticação obrigatória**: Toda requisição precisa do Bearer token
3. **Visibilidade**: Afeta apenas acesso de clientes, não de admins
4. **Timestamps**: Criados/atualizados automaticamente pelo servidor

---

## 🧪 Teste as APIs

Usando cURL:

```bash
# Listar conversas
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://seu-dominio.com/api/admin/conversations-scoped

# Criar conversa
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Nova Aula","visibility":"public"}' \
  https://seu-dominio.com/api/admin/conversations-scoped

# Obter conversa
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://seu-dominio.com/api/admin/conversations-scoped/CONVERSATION_ID

# Atualizar conversa
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Título Atualizado"}' \
  https://seu-dominio.com/api/admin/conversations-scoped/CONVERSATION_ID

# Deletar conversa
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://seu-dominio.com/api/admin/conversations-scoped/CONVERSATION_ID
```

---

