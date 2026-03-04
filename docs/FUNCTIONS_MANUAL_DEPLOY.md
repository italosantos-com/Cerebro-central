# 🚀 Deploy Manual de Cloud Functions via gcloud

## ✅ Função Criada Manualmente

### **sms-email-code**
- **Região:** europe-west1
- **URL:** https://sms-email-code-479719049222.europe-west1.run.app
- **Status:** ✅ Deployed
- **Runtime:** Node.js 20
- **Trigger:** HTTP

---

## 📋 Funções Admin que Precisam ser Criadas

### **1. setAdminClaim**
Função callable que define custom claim 'admin' para um usuário.

**Comando gcloud:**
```bash
gcloud functions deploy setAdminClaim \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=functions \
  --entry-point=setAdminClaim \
  --trigger-http \
  --allow-unauthenticated=false \
  --project=YOUR_FIREBASE_PROJECT_ID
```

### **2. isAdmin**
Função callable que verifica se um usuário tem permissão de admin.

**Comando gcloud:**
```bash
gcloud functions deploy isAdmin \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=functions \
  --entry-point=isAdmin \
  --trigger-http \
  --allow-unauthenticated=false \
  --project=YOUR_FIREBASE_PROJECT_ID
```

### **3. getAllAdmins**
Função callable que lista todos os administradores.

**Comando gcloud:**
```bash
gcloud functions deploy getAllAdmins \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=functions \
  --entry-point=getAllAdmins \
  --trigger-http \
  --allow-unauthenticated=false \
  --project=YOUR_FIREBASE_PROJECT_ID
```

### **4. onAdminCreated** (Trigger Firestore)
Trigger que é executado quando um admin é criado na collection 'admins'.

**Comando gcloud:**
```bash
gcloud functions deploy onAdminCreated \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=functions \
  --entry-point=onAdminCreated \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \
  --trigger-event-filters="database=(default)" \
  --trigger-location=us-central1 \
  --project=YOUR_FIREBASE_PROJECT_ID
```

**⚠️ Nota:** Para triggers Firestore, a `--trigger-location` deve ser a mesma do Firestore (us-central1).

### **5. onAdminDeleted** (Trigger Firestore)
Trigger que é executado quando um admin é removido da collection 'admins'.

**Comando gcloud:**
```bash
gcloud functions deploy onAdminDeleted \
  --gen2 \
  --runtime=nodejs20 \
  --region=europe-west1 \
  --source=functions \
  --entry-point=onAdminDeleted \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.deleted" \
  --trigger-event-filters="database=(default)" \
  --trigger-location=us-central1 \
  --project=YOUR_FIREBASE_PROJECT_ID
```

---

## 🔧 Alternativa: Deploy via Console

Se preferir usar a interface gráfica:

1. **Acesse o Console:**
   👉 https://console.cloud.google.com/functions/list?project=YOUR_FIREBASE_PROJECT_ID

2. **Clique em "Create Function"**

3. **Configurações:**
   - **Environment:** 2nd gen
   - **Function name:** (nome da função)
   - **Region:** europe-west1
   - **Trigger:** 
     - HTTP (para callable functions)
     - Firestore (para triggers)
   - **Runtime:** Node.js 20
   - **Source code:** Inline editor ou ZIP upload
   - **Entry point:** (nome da função exportada)

4. **Variáveis de Ambiente:**
   Copie as variáveis do `.env.local`:
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY
   - SENDGRID_API_KEY
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_PHONE_NUMBER

---

## 📝 Script de Deploy em Lote

Crie um arquivo `deploy-functions.sh`:

```bash
#!/bin/bash

PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
REGION="europe-west1"
RUNTIME="nodejs20"
SOURCE_DIR="functions"

echo "🚀 Deploying Cloud Functions..."

# Callable Functions
for FUNC in setAdminClaim isAdmin getAllAdmins; do
  echo "Deploying $FUNC..."
  gcloud functions deploy $FUNC \
    --gen2 \
    --runtime=$RUNTIME \
    --region=$REGION \
    --source=$SOURCE_DIR \
    --entry-point=$FUNC \
    --trigger-http \
    --allow-unauthenticated=false \
    --project=$PROJECT_ID
done

# Firestore Triggers
echo "Deploying onAdminCreated..."
gcloud functions deploy onAdminCreated \
  --gen2 \
  --runtime=$RUNTIME \
  --region=$REGION \
  --source=$SOURCE_DIR \
  --entry-point=onAdminCreated \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \
  --trigger-event-filters="database=(default)" \
  --trigger-location=us-central1 \
  --project=$PROJECT_ID

echo "Deploying onAdminDeleted..."
gcloud functions deploy onAdminDeleted \
  --gen2 \
  --runtime=$RUNTIME \
  --region=$REGION \
  --source=$SOURCE_DIR \
  --entry-point=onAdminDeleted \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.deleted" \
  --trigger-event-filters="database=(default)" \
  --trigger-location=us-central1 \
  --project=$PROJECT_ID

echo "✅ All functions deployed!"
```

**Tornar executável:**
```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

---

## 🔍 Verificar Functions Deployadas

```bash
gcloud functions list --project=YOUR_FIREBASE_PROJECT_ID --gen2
```

---

## 🆘 Resolver Erro 403 no Firebase CLI

O erro acontece porque o Firebase CLI não tem permissões suficientes.

### **Solução 1: Usar Service Account**

1. **Baixar Service Account Key:**
   👉 https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/settings/serviceaccounts/adminsdk

2. **Configurar credencial:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="caminho/para/serviceAccountKey.json"
   firebase deploy --only functions
   ```

### **Solução 2: Reautenticar com Conta Certa**

```bash
firebase logout
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
firebase deploy --only functions
```

### **Solução 3: Adicionar Permissões IAM**

1. Acesse: https://console.cloud.google.com/iam-admin/iam?project=YOUR_FIREBASE_PROJECT_ID
2. Procure: `bellarj021@gmail.com`
3. Adicione roles:
   - **Cloud Functions Admin**
   - **Cloud Build Service Account**
   - **Service Account User**

---

## 📊 URLs das Funções Deployadas

Após deploy, as URLs estarão no formato:

- **setAdminClaim:** `https://setadminclaim-479719049222.europe-west1.run.app`
- **isAdmin:** `https://isadmin-479719049222.europe-west1.run.app`
- **getAllAdmins:** `https://getalladmins-479719049222.europe-west1.run.app`
- **onAdminCreated:** (trigger, sem URL pública)
- **onAdminDeleted:** (trigger, sem URL pública)

---

**Última atualização:** 10 de outubro de 2025  
**Projeto:** YOUR_FIREBASE_PROJECT_ID  
**Região:** europe-west1
