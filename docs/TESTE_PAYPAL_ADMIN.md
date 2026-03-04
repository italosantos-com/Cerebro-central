# Teste PayPal - Fluxo Completo

## ✅ Correção Implementada

O sistema agora **sempre usa as credenciais do admin** para processar pagamentos de clientes.

---

## 🧪 Como Testar Localmente

### 1. Iniciar Servidor de Desenvolvimento
```bash
cd "/Users/italosanta/Documents/download (3) 2"
npm run dev
```

### 2. Configurar Admin PayPal (Apenas uma vez)

#### 2.1. Acesse o Painel Admin
```
http://localhost:3000/admin/integrations
```

#### 2.2. Conectar PayPal
1. Clique no botão **"Conectar PayPal"**
2. Faça login com sua conta PayPal Sandbox ou Business
3. Autorize a aplicação
4. Você será redirecionado de volta

#### 2.3. Verificar no Firebase Console
```
Firebase Console → Realtime Database
└── admin
    └── integrations
        └── paypal
            ├── connected: true
            ├── email: "seu-admin@paypal.com"
            ├── access_token: "..."
            └── refresh_token: "..."
```

---

### 3. Testar Pagamento como Cliente

#### 3.1. Abrir Homepage
```
http://localhost:3000
```

#### 3.2. Fazer Login como Cliente
- Use qualquer conta de teste (não precisa ser admin)
- Exemplo: `cliente@test.com`

#### 3.3. Clicar em "Pagar com PayPal"
- Os botões do PayPal devem estar visíveis
- Clique no botão amarelo do PayPal

#### 3.4. Verificar Popup do PayPal
O popup deve mostrar:
- ✅ **Nome do Admin** (não do cliente)
- ✅ **Email do Admin** como destinatário
- ✅ Valor: R$ 99.90 (ou conforme configurado)

#### 3.5. Completar Pagamento
1. Faça login no PayPal Sandbox com conta de comprador
2. Confirme o pagamento
3. Aguarde redirecionamento
4. ✅ Sucesso! Você deve ver mensagem de confirmação

---

## 📋 Checklist de Teste

### Backend Logs (Terminal onde `npm run dev` está rodando)

Ao clicar em "Pagar com PayPal", você deve ver:
```
✅ [PayPal] Buscando credenciais do admin em RTDB
✅ [PayPal] Token válido até: 2024-XX-XX XX:XX
✅ [PayPal] Email do payee: admin@paypal.com
✅ [PayPal] Pedido criado: orderId=7XX12345XX
```

### Browser Console (F12 → Console)

Você **não** deve ver:
- ❌ Erros de CORS do PayPal (foram suprimidos)
- ❌ "Nenhum email encontrado"
- ❌ "sellerId não definido"

Você **deve** ver:
- ✅ `[PayPal] createOrder chamado`
- ✅ `[PayPal] orderId: 7XX12345XX`
- ✅ `[PayPal] onApprove chamado`

### Firebase Realtime Database

Após conectar PayPal no admin, verifique:
```
admin/integrations/paypal:
├── connected: true ✅
├── email: "admin@paypal.com" ✅
├── access_token: "A21AA..." ✅
├── refresh_token: "v2.public.eu..." ✅
└── merchant_id: "XXXXXXXXX" ✅
```

---

## 🐛 Troubleshooting

### Erro: "As credenciais de pagamento do admin não foram encontradas"

**Causa:** Admin não conectou PayPal

**Solução:**
1. Vá para `/admin/integrations`
2. Clique em "Conectar PayPal"
3. Complete o fluxo OAuth
4. Recarregue a página

---

### Erro: "Firebase Admin não inicializado"

**Causa:** Falta `service_account.json` ou variáveis de ambiente

**Solução 1 (Recomendado):**
```bash
# Verifique se o arquivo existe:
ls -la service_account.json

# Se não existir, baixe do Firebase Console:
# Firebase Console → Project Settings → Service Accounts → Generate New Private Key
```

**Solução 2 (Variáveis de Ambiente):**
```bash
# Crie .env.local com:
FIREBASE_PROJECT_ID="projeto-italo-bc5ef"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

### Erro: "PayPal popup não abre"

**Causa:** Bloqueador de popups ativo

**Solução:**
1. Permita popups para `localhost:3000`
2. Ou clique direito no ícone de popup bloqueado na barra de endereço

---

### Erro: "Falha ao renovar o token de acesso do PayPal"

**Causa:** `refresh_token` expirado ou inválido

**Solução:**
1. Desconecte PayPal no admin panel:
   ```
   /admin/integrations → Botão "Desconectar"
   ```
2. Reconecte PayPal (novo fluxo OAuth)
3. Novo `refresh_token` será salvo automaticamente

---

### Erro: "PAYPAL_CLIENT_ID não configurado"

**Causa:** Variáveis de ambiente faltando

**Solução:**
```bash
# Crie ou edite .env.local:
NEXT_PUBLIC_PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."

# Obtenha as credenciais em:
# https://developer.paypal.com/dashboard/applications/sandbox
```

---

## 🔍 Verificação de Segurança

### ✅ Credenciais Protegidas
- Cliente **nunca** vê o `access_token` do admin
- Cliente **nunca** vê o `refresh_token` do admin
- Cliente **não** pode modificar o `sellerId`

### ✅ Fluxo Correto
```
Cliente → Frontend (público) → API Route (servidor) → RTDB (admin credenciais) → PayPal API
```

### ❌ Fluxo Anterior (Incorreto)
```
Cliente Login → UID do Cliente usado como sellerId → Erro (cliente não tem PayPal)
```

---

## 📊 Testes Finais

Após implementar, teste os seguintes cenários:

### Cenário 1: Cliente Não Logado
1. Acesse homepage sem fazer login
2. Clique em "Pagar com PayPal"
3. ✅ Deve redirecionar para login
4. ✅ Após login, popup PayPal abre

### Cenário 2: Cliente Logado (Não Admin)
1. Faça login com `cliente@test.com`
2. Clique em "Pagar com PayPal"
3. ✅ Popup abre imediatamente
4. ✅ Popup mostra admin como destinatário

### Cenário 3: Admin Logado
1. Faça login com conta admin
2. Clique em "Pagar com PayPal"
3. ✅ Popup abre
4. ✅ Popup mostra admin como destinatário (mesmo pagando para si mesmo - válido)

### Cenário 4: Token Expirado
1. No Firebase Console, edite `admin/integrations/paypal/expires_in` para `0`
2. Clique em "Pagar com PayPal"
3. ✅ Sistema deve renovar token automaticamente
4. ✅ Pedido criado com sucesso

---

## 🚀 Deploy para Produção

Após testes locais bem-sucedidos:

### 1. Build de Produção
```bash
npm run build
```

### 2. Verificar Erros
```bash
# Se houver erros de tipo:
npm run build 2>&1 | grep "error"

# Corrigir e rebuildar
```

### 3. Deploy para Cloud Run
```bash
# Opção 1: Cloud Console
https://console.cloud.google.com/run?project=projeto-italo-bc5ef

# Opção 2: Cloud Shell (se gcloud SDK local corrompido)
# Abra Cloud Shell no navegador
gcloud run deploy italosantos \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 4. Testar em Produção
```
https://italosantos-423019559653.us-central1.run.app
```

---

## 📝 Notas Importantes

1. ⚠️ **Sandbox vs Live**: 
   - Desenvolvimento: Use PayPal Sandbox
   - Produção: Migre para PayPal Live após aprovação

2. ⚠️ **Access Token**: 
   - Expira em 1 hora
   - Renovação automática implementada

3. ⚠️ **Refresh Token**: 
   - Válido por 10 anos (PayPal default)
   - Salvo em `admin/integrations/paypal`

4. ⚠️ **Email do Admin**: 
   - Deve ser email verificado no PayPal
   - Usado como destinatário de todos os pagamentos

---

**Data:** 2024-12-19
**Status:** ✅ Implementado - Aguardando Testes
