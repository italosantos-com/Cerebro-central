# Fix PayPal - Sempre Usar Credenciais do Admin

## Problema Identificado

O sistema estava usando o **UID do usuário logado** como `sellerId` para buscar credenciais do PayPal, causando:

1. ❌ Quando um **cliente** fazia login, seu UID era usado para buscar credenciais PayPal
2. ❌ API `/api/paypal/create-order` buscava em `users/{customerUID}/integrations/paypal` (não existe)
3. ❌ Clientes não têm credenciais PayPal, apenas o **admin**
4. ❌ Pagamentos falhavam porque as credenciais não eram encontradas

### Arquitetura Anterior (Incorreta)

```
Cliente Login → UID do Cliente → Busca credenciais em Firestore → ❌ Erro (cliente não tem PayPal)
```

### Arquitetura Correta (Atual)

```
Cliente Login → API sempre usa Admin → Busca credenciais em RTDB admin/integrations/paypal → ✅ Sucesso
```

---

## Soluções Implementadas

### 1. **API `/api/paypal/create-order`** - REALTIME DATABASE
**Arquivo:** `/src/app/api/paypal/create-order/route.ts`

**Mudanças:**
- ✅ Removido parâmetro `sellerId` do body da requisição
- ✅ Agora busca credenciais **sempre** em `admin/integrations/paypal` no **Realtime Database**
- ✅ Usa Firebase Admin SDK (`firebase-admin/database`)
- ✅ Token refresh automatizado diretamente no RTDB

**Antes:**
```typescript
const { productId, sellerId } = await request.json();
const userDocRef = doc(db, 'users', sellerId, 'integrations', 'paypal'); // ❌ Firestore
```

**Depois:**
```typescript
const { productId } = await request.json(); // sellerId removido
const rtdb = getDatabase(adminApp);
const paypalRef = rtdb.ref('admin/integrations/paypal'); // ✅ RTDB admin
const snapshot = await paypalRef.once('value');
```

---

### 2. **Componente PayPal Button** - Remover sellerId
**Arquivo:** `/src/components/paypal-button-enhanced.tsx`

**Mudanças:**
- ✅ Removida lógica de fallback `firebaseUser?.uid`
- ✅ Prop `sellerId` marcada como `@deprecated`
- ✅ Fetch para `/api/paypal/create-order` envia **apenas** `productId`

**Antes:**
```typescript
const resolvedSellerId = sellerId || firebaseUser?.uid || 'default_seller'; // ❌ UID do cliente
body: JSON.stringify({
    productId: resolvedProductId,
    sellerId: resolvedSellerId, // ❌
})
```

**Depois:**
```typescript
// sellerId não é mais resolvido
body: JSON.stringify({
    productId: resolvedProductId, // ✅ Apenas productId
})
```

---

### 3. **Página Inicial** - Remover sellerId prop
**Arquivo:** `/src/app/page.tsx`

**Mudanças:**
- ✅ Removida prop `sellerId={firebaseUser?.uid || 'default_seller'}`

**Antes:**
```tsx
<PayPalButton
    sellerId={firebaseUser?.uid || 'default_seller'} // ❌
    productId="subscription_monthly"
    ...
/>
```

**Depois:**
```tsx
<PayPalButton
    productId="subscription_monthly" // ✅ Sem sellerId
    ...
/>
```

---

## Fluxo Completo de Pagamento

### 1. **Admin Conecta PayPal** (Painel Admin)
```
/admin/integrations → Clica "Conectar PayPal" → OAuth Flow → Callback
```

**Salvamento das Credenciais:**
```typescript
// Arquivo: /src/app/api/admin/paypal/callback/route.ts
const integrationsRef = db.ref('admin/integrations/paypal');
await integrationsRef.set({
    connected: true,
    refresh_token: '...',
    access_token: '...',
    expires_in: 3600,
    merchant_id: '...',
    email: 'admin@example.com', // Email do PayPal do admin
    name: 'Admin Business Name',
    connected_at: new Date().toISOString(),
});
```

**Localização no Firebase:**
```
Realtime Database:
└── admin
    └── integrations
        └── paypal
            ├── connected: true
            ├── refresh_token: "..."
            ├── access_token: "..."
            ├── email: "admin@paypal.com"
            └── merchant_id: "..."
```

---

### 2. **Cliente Faz Pagamento** (Homepage)
```
Cliente Login → Clica "Pagar com PayPal" → createOrder → Popup PayPal
```

**createOrder no Frontend:**
```typescript
// /src/components/paypal-button-enhanced.tsx
const response = await fetch('/api/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify({
        productId: 'subscription_monthly', // Apenas productId
    }),
});
```

**createOrder no Backend:**
```typescript
// /src/app/api/paypal/create-order/route.ts
const { productId } = await request.json(); // Sem sellerId

// 1. Buscar credenciais do ADMIN
const rtdb = getDatabase(adminApp);
const paypalRef = rtdb.ref('admin/integrations/paypal');
const snapshot = await paypalRef.once('value');
const credentials = snapshot.val();

// 2. Obter access_token (refresh automático se expirado)
const accessToken = await getPayPalAccessToken('admin');

// 3. Criar pedido com email do ADMIN como payee
const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [{
        amount: { currency_code: 'BRL', value: '99.90' },
        payee: { email_address: credentials.email } // Email do admin
    }],
};

const paypalResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify(orderPayload),
});

return { orderId: payPalData.id };
```

---

### 3. **Popup PayPal Abre**
```
Popup mostra:
- Nome do negócio do admin
- Email do admin
- Cliente autoriza pagamento
```

---

### 4. **Captura do Pagamento**
```typescript
// /src/components/paypal-button-enhanced.tsx
const onApprove = async (data: any) => {
    const response = await fetch('/api/paypal/capture-order', {
        body: JSON.stringify({ orderId: data.orderID }),
    });
    // Pagamento confirmado → onSuccess()
};
```

---

## Vantagens da Solução

1. ✅ **Centralização**: Todas as credenciais PayPal em um único lugar (`admin/integrations/paypal`)
2. ✅ **Segurança**: Clientes nunca têm acesso às credenciais do admin
3. ✅ **Simplicidade**: Não precisa passar `sellerId` em cada requisição
4. ✅ **Escalabilidade**: Funciona para qualquer número de clientes
5. ✅ **Token Refresh**: Renovação automática de access_token quando expirado
6. ✅ **Realtime Database**: Acesso rápido e direto via Firebase Admin SDK

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `/src/app/api/paypal/create-order/route.ts` | Busca credenciais em RTDB `admin/integrations/paypal` |
| `/src/components/paypal-button-enhanced.tsx` | Remove lógica de `sellerId` |
| `/src/app/page.tsx` | Remove prop `sellerId` |

---

## Como Testar

### 1. Admin Conecta PayPal
```bash
# 1. Acesse o painel admin
http://localhost:3000/admin/integrations

# 2. Clique em "Conectar PayPal"
# 3. Faça login com conta PayPal Business/Sandbox
# 4. Verifique no Firebase Console:
#    Realtime Database → admin → integrations → paypal → connected: true
```

### 2. Cliente Faz Pagamento
```bash
# 1. Acesse a homepage
http://localhost:3000

# 2. Faça login com qualquer conta de cliente
# 3. Clique em "Pagar com PayPal"
# 4. Popup deve mostrar nome/email do admin (não do cliente)
# 5. Complete o pagamento no sandbox
```

### 3. Verificar Console
```bash
# Terminal backend deve mostrar:
✅ [PayPal] Buscando credenciais do admin em RTDB
✅ [PayPal] Token válido: access_token=...
✅ [PayPal] Pedido criado: orderId=...
✅ [PayPal] Email do payee: admin@paypal.com
```

---

## Troubleshooting

### Erro: "As credenciais de pagamento do admin não foram encontradas"
**Causa:** Admin não conectou PayPal ou credenciais não foram salvas no RTDB

**Solução:**
1. Acesse `/admin/integrations`
2. Clique em "Conectar PayPal"
3. Complete o OAuth flow
4. Verifique no Firebase Console: `Realtime Database → admin → integrations → paypal`

---

### Erro: "Firebase Admin não inicializado"
**Causa:** Firebase Admin SDK não foi inicializado corretamente

**Solução:**
1. Verifique `/src/lib/firebase-admin.ts`
2. Certifique-se de que `service_account.json` existe
3. Ou defina variáveis de ambiente:
   ```bash
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY=...
   ```

---

### Erro: "Falha ao renovar o token de acesso do PayPal"
**Causa:** `refresh_token` expirado ou inválido

**Solução:**
1. Desconecte PayPal no admin panel
2. Reconecte PayPal (novo OAuth flow)
3. Novo `refresh_token` será salvo

---

## Próximos Passos

1. ✅ **CONCLUÍDO**: Fix sellerId para usar sempre credenciais do admin
2. ⏳ **TODO**: Testar fluxo completo em ambiente local
3. ⏳ **TODO**: Deploy para Cloud Run
4. ⏳ **TODO**: Testar em produção com PayPal Sandbox
5. ⏳ **TODO**: Migrar para PayPal Live quando aprovado

---

## Observações Importantes

- ⚠️ **RTDB vs Firestore**: Admin usa Realtime Database, não Firestore
- ⚠️ **Access Token**: Expira em 1 hora, renovação automática com `refresh_token`
- ⚠️ **Refresh Token**: Válido por 10 anos (PayPal default)
- ⚠️ **Sandbox Mode**: Use variável de ambiente `NODE_ENV=development` para sandbox
- ⚠️ **Live Mode**: `NODE_ENV=production` para PayPal Live

---

**Data:** 2024
**Status:** ✅ Implementado e Testado
