# 🚀 Deploy no Vercel - Guia Completo

## ✅ **Status: Pronto para Deploy**

### **🔧 Configurações Atualizadas:**
- ✅ `next.config.js` - Configurado para produção
- ✅ `vercel.json` - Configurado para APIs
- ✅ Webhooks funcionando

## **📋 Passo a Passo para Deploy:**

### **1. Fazer Commit das Mudanças:**
```bash
git add .
git commit -m "🚀 Preparado para deploy no Vercel"
git push origin main
```

### **2. Conectar ao Vercel:**
1. Acesse: https://vercel.com
2. Faça login com GitHub
3. Clique em "New Project"
4. Importe o repositório: `italo-santos-studio`

### **3. Configurar Variáveis de Ambiente:**

#### **Firebase Configuration:**
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

#### **Firebase Admin SDK:**
```bash
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
```

#### **Mercado Pago (PRODUÇÃO):**
```bash
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-your_public_key_here
MERCADOPAGO_ACCESS_TOKEN=APP_USR-your_access_token_here
```

#### **App Configuration:**
```bash
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### **4. Configurar Webhook no Mercado Pago:**

Após o deploy, configure o webhook:
- **URL**: `https://your-domain.vercel.app/api/webhook/mercadopago`
- **Eventos**: Pagamentos
- **Versão**: v1

### **5. Testar PIX Completo:**

1. **Acesse**: `https://your-domain.vercel.app`
2. **Faça login** com Face ID
3. **Teste PIX** com valor pequeno (R$ 1,00)
4. **Verifique webhook** nos logs do Vercel

## **🔍 Verificações Pós-Deploy:**

### **1. Testar APIs:**
```bash
# Testar webhook
curl https://your-domain.vercel.app/api/webhook/mercadopago

# Testar PIX
curl -X POST https://your-domain.vercel.app/api/pix/create \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","name":"Teste","amount":1.00,"cpf":"12345678901"}'
```

### **2. Verificar Logs:**
- Acesse: Vercel Dashboard → Project → Functions
- Verifique logs das APIs

### **3. Testar Fluxo Completo:**
1. ✅ Login com Face ID
2. ✅ Criação de PIX
3. ✅ Pagamento via QR Code
4. ✅ Webhook processando
5. ✅ Assinatura ativada

## **🚨 Importante:**

### **Para Produção Real:**
- Use tokens de **PRODUÇÃO** do Mercado Pago
- Configure domínio personalizado
- Ative HTTPS
- Configure monitoramento

### **Para Testes:**
- Use tokens de **SANDBOX** do Mercado Pago
- Teste com valores pequenos
- Verifique logs detalhadamente

## **🎯 Resultado Esperado:**

Após o deploy, você terá:
- ✅ URL pública estável
- ✅ Webhooks funcionando
- ✅ PIX processando automaticamente
- ✅ Assinaturas sendo criadas
- ✅ Sistema completo funcionando

**Agora é só fazer o deploy! 🚀**
