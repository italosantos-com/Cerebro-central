# 🌐 Deploy de Cloud Functions via Google Cloud Console (Interface Web)

## 📍 Como você já criou a função `sms-email-code`, vamos replicar o processo para as funções admin

---

## 🎯 **PASSO A PASSO: Deploy via Console Web**

### **1. Acessar o Console de Cloud Functions**

👉 **URL:** https://console.cloud.google.com/functions/list?project=YOUR_FIREBASE_PROJECT_ID

Ou navegue:
- Console do Google Cloud
- Menu lateral → **Cloud Functions**
- Selecione o projeto: **YOUR_FIREBASE_PROJECT_ID**

---

## 📦 **FUNÇÃO 1: setAdminClaim**

### **1.1 Criar Nova Função**
- Clique em **"CREATE FUNCTION"** (botão azul no topo)

### **1.2 Configuração Básica**
- **Environment:** `2nd gen` ✅
- **Function name:** `setAdminClaim`
- **Region:** `europe-west1` (mesma que você usou para sms-email-code)

### **1.3 Trigger**
- **Trigger type:** `HTTPS`
- **Authentication:** `Require authentication` ✅ (IMPORTANTE!)
- Deixe outras opções padrão

### **1.4 Runtime, Build, Connections and Security Settings**
Clique em **"RUNTIME, BUILD, CONNECTIONS AND SECURITY SETTINGS"** para expandir:

**Runtime:**
- **Runtime:** `Node.js 20`
- **Entry point:** `setAdminClaim`

**Runtime environment variables:** (IMPORTANTE! Adicione estas variáveis)
```
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@YOUR_FIREBASE_PROJECT_ID.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1T1Awgb5n7GF1
L7IqF/wB3OeKZ6Jq/yBTbWAWhlG12dPiVZ8WXuEi7WsFzb7/8MaY/TTgTKt+c1bF
dkB8gcSWNroQhea1x67ta37JyKM/3mB9U8BlUeqx5ZaURXK3nxCNbEpLxoHiM1Ce
O8ss5kwn5+xhA4L2udT4Oqp1DclfjrLFPOyDow55daNTpdBwoLC0tj5t80uO86CE
HJl3RLnMLGPc9oc1g16rp3sL/y0GV3io8PP193iUitYBikP6X2MigejLrPYfLgVF
ZUtGwa6NYokPt251BDfCGdw78nlia6rJgNi/7Pn/ybj04aTOEE8cWBxW1ZFGNcgE
TlAYyrb1AgMBAAECggEANrFdvbwtrVjDj1+bbZI9nWw/VmNrvb4HSNNaJIFRPbuf
bIuqiUuGu4wF+EK35qoBpp3fKPhH1UXCu58v1b8ph6yrlRdnYJeDX7BJF2KUSExz
K+srQwUieJaKxWBruhNcIWU0xkXz4UHchFcCM6GnAHS4PA2coIOvSFAeImBNyiqU
0rzdd6cRwUnZ7hK/rgn04koPOv/LmP+8BEU2kijI2BHuKbCgMZTA/Sx7R2rl9a4f
TXSX5Bjt9MxleDDLjDamWZdOKf8qQFl1U7ey3w6r68E/2I8xL6r3b7uIcbI147P+
6LuKYsbDkSbopNWeYcACkJuiW/QZ/SFjZrlgmtpxwwKBgQD42M9Ysfe8nXwotJyL
0CMb7nljTNXkRVfzDqnWfzouCKNCulfxIGuhnYmH08n9pHO0YnJJDoayVA2u7ig8
iYt6LB3gaL1zVuKzXqMRtzuXp3i6GNGxdjy+ge3TIlcWF4/WDyC9WX7PPWTqrQWS
nQcxR7PEI6Pma3zMIIN8qp+jXwKBgQC6hYSa4EnWzfL5w6rTdAwHv1seO0dJWf9f
oj/rIEu4LNQvys6T4NsuMzeJ07Z/bv5Hzmem/a071aPfthmCnsnd9ycacLWV8Mv2
POje5lJtwY5duCbA0tPWvDGZ93iFW0RSytqeRiO0VvKg5Z3pcs5jPK4YggyF89iA
ggw9v0F6KwKBgBXA1jdZr19koPLp/vlV44vQh/n/QH9o9GxB7uTaUFqv1J3DrmZc
wCvrmpcuE21Bz/+Hz5fFVk8Ge/+7v/ayy2eNrbrtTQplIQIvFrA4xVPXhv01qDcM
L/kzYHfhe51px+AdiG4lAanaIxVEtMUBRxyuuO8/cld1M/6gJP5j5/qfAoGAUFuz
vLICveuu0dJt53nosPHNROIPHVgLwNz7IsagOLH/nLOIeod2hpoERHoU9yQPo0oW
uAg0uUGav4gJx4+3ssyHaUnDwdyjUuv8/ANI4gZw2om7EHoEUFB2IjpPD005y12g
AG6BdXG8SHuEpA4VQwXij6Z/1LowvXTJ51Rd1k8CgYEA1DaG3KQpNKlhwNxczYcX
ysbb9gIevrVmnaCVJUL8pgkqOS08dFuIZ0ZhbrnqGYJhyHlmVQkaloK/TNW31e72
c7f0AVt0iJSLdgP2y+HZjX2aXpn1Hw7MJkYQtBezJqPvPj0ASs8AZtvs9ka5tI1d
xn4WQz3SYR+43GqPoMJg7/Y=
-----END PRIVATE KEY-----
```

**Memory:** `256 MiB` (padrão)
**Timeout:** `60 seconds`

### **1.5 Código**
Clique em **"NEXT"** para ir para a aba de código.

**Inline Editor:**
- Você precisará copiar 2 arquivos:
  1. `package.json`
  2. `index.js` (código da função)

Vou preparar os arquivos agora...

---

## 📝 **ARQUIVO 1: package.json**

Cole este conteúdo no `package.json` do editor inline:

```json
{
  "name": "admin-functions",
  "version": "1.0.0",
  "main": "index.js",
  "engines": {
    "node": "20"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.8.0"
  }
}
```

---

## 📝 **ARQUIVO 2: index.js (setAdminClaim)**

Cole este conteúdo no `index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * FUNÇÃO: setAdminClaim
 * Define custom claim 'admin: true' para um usuário específico
 */
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
    // Verificar autenticação
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Usuário não autenticado.'
        );
    }

    const { uid } = data;

    if (!uid) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'UID do usuário é obrigatório.'
        );
    }

    try {
        // Verificar se existe na collection 'admins'
        const adminDoc = await admin.firestore()
            .collection('admins')
            .where('uid', '==', uid)
            .limit(1)
            .get();

        if (adminDoc.empty) {
            throw new functions.https.HttpsError(
                'not-found',
                'Usuário não encontrado na coleção de administradores.'
            );
        }

        // Setar custom claim 'admin'
        await admin.auth().setCustomUserClaims(uid, {
            admin: true,
            role: 'admin'
        });

        // Atualizar documento
        await adminDoc.docs[0].ref.update({
            adminClaimSet: true,
            adminClaimSetAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Custom claim 'admin' definido para UID: ${uid}`);

        return {
            success: true,
            message: 'Custom claim admin definido com sucesso.'
        };
    } catch (error) {
        console.error('Erro ao definir custom claim:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Erro: ${error.message}`
        );
    }
});
```

### **1.6 Deploy**
- Clique em **"DEPLOY"**
- Aguarde alguns minutos (2-5 minutos)
- Você verá a função aparecer na lista com status ✅

---

## 📦 **FUNÇÃO 2: isAdmin**

Repita o processo acima com estas alterações:

**Configuração:**
- **Function name:** `isAdmin`
- **Entry point:** `isAdmin`

**Código (index.js):**
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

exports.isAdmin = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Usuário não autenticado.'
        );
    }

    const uid = context.auth.uid;

    try {
        const user = await admin.auth().getUser(uid);
        const customClaims = user.customClaims || {};
        const hasAdminClaim = customClaims.admin === true;

        const adminDoc = await admin.firestore()
            .collection('admins')
            .where('uid', '==', uid)
            .limit(1)
            .get();

        const isAdminInCollection = !adminDoc.empty;
        const isAdminUser = hasAdminClaim || isAdminInCollection;

        // Auto-set claim se estiver na collection mas não tem claim
        if (isAdminInCollection && !hasAdminClaim) {
            await admin.auth().setCustomUserClaims(uid, {
                admin: true,
                role: 'admin'
            });

            await adminDoc.docs[0].ref.update({
                adminClaimSet: true,
                adminClaimSetAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Custom claim definido automaticamente para: ${uid}`);
        }

        return {
            isAdmin: isAdminUser,
            hasCustomClaim: hasAdminClaim,
            inAdminCollection: isAdminInCollection,
            uid
        };
    } catch (error) {
        console.error('Erro ao verificar admin:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Erro: ${error.message}`
        );
    }
});
```

---

## 📦 **FUNÇÃO 3: getAllAdmins**

**Configuração:**
- **Function name:** `getAllAdmins`
- **Entry point:** `getAllAdmins`

**Código (index.js):**
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

exports.getAllAdmins = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Usuário não autenticado.'
        );
    }

    try {
        // Verificar se é admin
        const user = await admin.auth().getUser(context.auth.uid);
        const customClaims = user.customClaims || {};
        
        if (customClaims.admin !== true) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Apenas administradores podem listar admins.'
            );
        }

        // Buscar todos admins
        const adminsSnapshot = await admin.firestore()
            .collection('admins')
            .get();

        const admins = adminsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                uid: data.uid,
                email: data.email,
                name: data.name,
                createdAt: data.createdAt,
                adminClaimSet: data.adminClaimSet || false
            };
        });

        return {
            success: true,
            count: admins.length,
            admins
        };
    } catch (error) {
        console.error('Erro ao listar admins:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Erro: ${error.message}`
        );
    }
});
```

---

## 🔥 **FUNÇÃO 4: onAdminCreated (Trigger Firestore)**

**Configuração:**
- **Function name:** `onAdminCreated`
- **Entry point:** `onAdminCreated`
- **Trigger type:** `Cloud Firestore` (não HTTP!)
- **Event type:** `google.cloud.firestore.document.v1.created`
- **Document path:** `admins/{adminId}`

**Código (index.js):**
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

exports.onAdminCreated = functions.firestore
    .document('admins/{adminId}')
    .onCreate(async (snap, context) => {
        const adminData = snap.data();
        const uid = adminData.uid;

        if (!uid) {
            console.error('Admin criado sem UID:', snap.id);
            return null;
        }

        try {
            await admin.auth().setCustomUserClaims(uid, {
                admin: true,
                role: 'admin'
            });

            await snap.ref.update({
                adminClaimSet: true,
                adminClaimSetAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Custom claim definido automaticamente para: ${uid}`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao definir custom claim:', error);

            await snap.ref.update({
                adminClaimSet: false,
                adminClaimError: error.message,
                adminClaimErrorAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: false, error: error.message };
        }
    });
```

---

## 🔥 **FUNÇÃO 5: onAdminDeleted (Trigger Firestore)**

**Configuração:**
- **Function name:** `onAdminDeleted`
- **Entry point:** `onAdminDeleted`
- **Trigger type:** `Cloud Firestore`
- **Event type:** `google.cloud.firestore.document.v1.deleted`
- **Document path:** `admins/{adminId}`

**Código (index.js):**
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

exports.onAdminDeleted = functions.firestore
    .document('admins/{adminId}')
    .onDelete(async (snap, context) => {
        const adminData = snap.data();
        const uid = adminData.uid;

        if (!uid) {
            console.error('Admin deletado sem UID:', snap.id);
            return null;
        }

        try {
            await admin.auth().setCustomUserClaims(uid, {
                admin: false,
                role: null
            });

            console.log(`Custom claim removido para: ${uid}`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover custom claim:', error);
            return { success: false, error: error.message };
        }
    });
```

---

## ✅ **CHECKLIST DE DEPLOY**

- [ ] **setAdminClaim** - Função HTTP callable
- [ ] **isAdmin** - Função HTTP callable
- [ ] **getAllAdmins** - Função HTTP callable  
- [ ] **onAdminCreated** - Trigger Firestore (onCreate)
- [ ] **onAdminDeleted** - Trigger Firestore (onDelete)

---

## 🧪 **TESTAR APÓS DEPLOY**

Após todas as funções estarem deployadas:

```bash
cd "/Users/italosanta/Downloads/italosantos.com original"
node scripts/init-admin-system.js
```

---

## 📊 **VERIFICAR FUNÇÕES DEPLOYADAS**

Acesse: https://console.cloud.google.com/functions/list?project=YOUR_FIREBASE_PROJECT_ID

Você deve ver todas as 6 funções:
1. ✅ sms-email-code (já existe)
2. ⏳ setAdminClaim
3. ⏳ isAdmin
4. ⏳ getAllAdmins
5. ⏳ onAdminCreated
6. ⏳ onAdminDeleted

---

**Tempo estimado:** 5-10 minutos por função = ~30-50 minutos total para as 5 funções
