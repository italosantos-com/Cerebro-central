# 🏠 Configuração para Localhost

## ✅ **PROBLEMA IDENTIFICADO E CORRIGIDO:**

### **🔧 Inconsistência nas Variáveis de Ambiente:**
- **Problema:** O código estava usando `MERCADOPAGO_ACCESS_TOKEN` em alguns lugares e `MERCADO_PAGO_ACCESS_TOKEN` em outros
- **Solução:** Corrigido para aceitar ambas as variáveis com fallback

### **📝 Arquivos Corrigidos:**
- ✅ `src/ai/flows/mercado-pago-pix-flow.ts`
- ✅ `src/app/api/webhook/mercadopago/route.ts`
- ✅ `src/app/api/create-preference/route.ts`

## 🔧 **Configuração para Localhost:**

### **1. Criar arquivo `.env.local`:**
```bash
# ========================================
# CONFIGURAÇÕES PARA LOCALHOST
# ========================================

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Firebase Admin SDK (Server-side only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com

# Mercado Pago Configuration (SANDBOX para testes)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-your_public_key_here
MERCADOPAGO_ACCESS_TOKEN=TEST-your_access_token_here

# PayPal Configuration (SANDBOX para testes)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret_here

# Instagram API Configuration
# Opcional: usado apenas para o feed público (@severepics)
INSTAGRAM_FEED_ACCESS_TOKEN=your_instagram_feed_token_here

# Twitter API Configuration
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here

# Facebook API Configuration
# Catálogo usado na página Loja (listar produtos)
FACEBOOK_CATALOG_ID=your_facebook_catalog_id_here

# Observação: os tokens de acesso do Facebook/Instagram
# são obtidos automaticamente via integração Admin (OAuth).

# App Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development
```

### **2. Configurar Mercado Pago para Sandbox:**
- Use tokens de **SANDBOX** do Mercado Pago
- URLs de webhook: `http://localhost:3000/api/webhook/mercadopago`
- Modo de teste ativado

### **3. Configurar PayPal para Sandbox:**
- Use credenciais de **SANDBOX** do PayPal
- URLs de retorno: `http://localhost:3000/assinante?success=true`

### **4. Testar o PIX:**
```bash
# 1. Iniciar o servidor
npm run dev

# 2. Acessar: http://localhost:3000

# 3. Testar pagamento PIX
# - Usar valores pequenos (R$ 1,00 - R$ 10,00)
# - Verificar logs no console do navegador
# - Verificar logs no terminal do servidor
```

## 🔍 **Debug do Erro PIX:**

### **Verificar se as variáveis estão carregadas:**
```bash
# No terminal, executar:
node src/scripts/testEnv.ts
```

### **Verificar logs do servidor:**
```bash
# No terminal onde está rodando npm run dev, procurar por:
💰 [PIX MERCADO PAGO] Criando pagamento PIX:
❌ [PIX MERCADO PAGO] Erro ao gerar PIX:
```

### **Possíveis causas do erro:**
1. **Token não configurado:** `MERCADOPAGO_ACCESS_TOKEN` não definido
2. **Token inválido:** Token de produção em ambiente de desenvolvimento
3. **Valor muito baixo:** Mercado Pago tem limite mínimo
4. **Email inválido:** Formato de email incorreto
5. **Rede:** Problemas de conectividade com API do Mercado Pago

## 🚀 **Solução Rápida:**

### **1. Verificar variáveis de ambiente:**
```bash
# Criar arquivo .env.local na raiz do projeto
touch .env.local
```

### **2. Adicionar configuração mínima:**
```bash
# .env.local
MERCADOPAGO_ACCESS_TOKEN=TEST-your_sandbox_token_here
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-your_sandbox_public_key_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### **3. Reiniciar o servidor:**
```bash
# Parar o servidor (Ctrl+C) e reiniciar
npm run dev
```

## ✅ **Status Atual:**

**🔧 PROBLEMA CORRIGIDO** - Inconsistência nas variáveis de ambiente foi resolvida.

**📋 PRÓXIMOS PASSOS:**
1. Configurar arquivo `.env.local`
2. Usar tokens de SANDBOX do Mercado Pago
3. Testar pagamento PIX com valores pequenos
4. Verificar logs para debug

O projeto agora deve funcionar corretamente no localhost! 🎉
