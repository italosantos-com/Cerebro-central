# Guia de Configuração do Backend - Sistema de Administradores com Face Recognition

## 📋 Checklist de Configuração

### ✅ Arquivos Criados/Modificados

- [x] `/firestore.rules` - Regras de segurança atualizadas
- [x] `/firestore.indexes.json` - Índices adicionados
- [x] `/scripts/setup-admin-firestore.sh` - Script bash para criar schema documents
- [x] `/scripts/create-admin-schema.js` - Script Node.js para popular Firestore
- [x] `/src/lib/face-comparison.ts` - Biblioteca de comparação facial
- [x] `/src/app/api/admin/auth/complete-registration/route.ts` - API de registro
- [x] `/src/app/api/admin/auth/face-login/route.ts` - API de login facial
- [x] `/docs/ADMIN_FACE_REGISTRATION_SYSTEM.md` - Documentação completa

### ✅ Collections Necessárias no Firestore

1. **`admins`** - Dados dos administradores
2. **`verification_codes`** - Códigos de verificação 2FA
3. **`pending_admin_registrations`** - Registros temporários
4. **`admin_audit_log`** - Log de auditoria

---

## 🚀 Passos para Deploy

### 1. Configurar Variáveis de Ambiente

Adicione no `.env.local`:

```env
# Código de convite para cadastro de admin
ADMIN_INVITATION_CODE=ADMIN2024SECRET

# SendGrid para emails (opcional em dev)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@italosantos.com

# Twilio para SMS (opcional em dev)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+5511999999999

# Firebase Admin (já deve estar configurado)
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 2. Criar Schema Documents no Firestore

**Opção A: Via Script Node.js (Recomendado)**

```bash
# Executar script
node scripts/create-admin-schema.js
```

Saída esperada:
```
🔐 Criando Schema Documents para Sistema de Administradores
================================================================================
Projeto: YOUR_FIREBASE_PROJECT_ID
Collections: 4
================================================================================

📄 Criando schema document para: admins
   ✅ Schema criado: admins/_schema

📄 Criando schema document para: verification_codes
   ✅ Schema criado: verification_codes/_schema

📄 Criando schema document para: pending_admin_registrations
   ✅ Schema criado: pending_admin_registrations/_schema

📄 Criando schema document para: admin_audit_log
   ✅ Schema criado: admin_audit_log/_schema

================================================================================
✅ Todos os schema documents foram criados com sucesso!
```

**Opção B: Via Script Bash**

```bash
# Dar permissão de execução
chmod +x scripts/setup-admin-firestore.sh

# Executar
./scripts/setup-admin-firestore.sh
```

### 3. Deploy das Regras de Segurança

```bash
# Deploy das regras do Firestore
firebase deploy --only firestore:rules --project=YOUR_FIREBASE_PROJECT_ID
```

Saída esperada:
```
=== Deploying to 'YOUR_FIREBASE_PROJECT_ID'...

i  deploying firestore
i  firestore: checking firestore.rules for compilation errors...
✔  firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
✔  firestore: released rules firestore.rules to cloud.firestore

✔  Deploy complete!
```

### 4. Deploy dos Índices

```bash
# Deploy dos índices do Firestore
firebase deploy --only firestore:indexes --project=YOUR_FIREBASE_PROJECT_ID
```

Saída esperada:
```
=== Deploying to 'YOUR_FIREBASE_PROJECT_ID'...

i  deploying firestore
i  firestore: reading indexes from firestore.indexes.json...
i  firestore: uploading indexes...
✔  firestore: released indexes

✔  Deploy complete!

Note: Index creation may take several minutes.
```

**⚠️ Importante**: A criação de índices pode levar alguns minutos. Verifique o status em:
https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/indexes

### 5. Verificar Configuração

Acesse o Firestore Console:
https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/data

Verificar:
- ✅ Collections criadas com documentos `_schema`
- ✅ Regras de segurança atualizadas (aba "Rules")
- ✅ Índices em criação/criados (aba "Indexes")

---

## 🧪 Testando o Sistema

### Teste 1: Cadastro Completo de Admin

```bash
# 1. Iniciar servidor
npm run dev

# 2. Acessar
http://localhost:3000/admin

# 3. Clicar em "Cadastre-se como Admin"
```

**Etapa 1: Captura Facial**
- Permitir acesso à câmera
- Posicionar rosto no círculo
- Clicar "Capturar Rosto"
- Aguardar "Rosto Registrado!"

**Etapa 2: Dados Pessoais**
- Nome: "Admin Test"
- Email: "admin@test.com"
- Telefone: "+5511999999999"
- Código de Convite: (valor de `ADMIN_INVITATION_CODE`)
- Clicar "Enviar Códigos"

**Etapa 3: Verificação**
- Verificar console do servidor para códigos:
  ```
  [EMAIL VERIFICATION] Código para admin@test.com: 123456
  [SMS VERIFICATION] Código para +5511999999999: 654321
  ```
- Inserir código de email
- Inserir código de SMS
- Clicar "Concluir Registro"

**Resultado Esperado**:
```
[Admin Registration] ✅ Administrador criado com sucesso: admin_abc123
============================================================
[Admin Registration] REGISTRO COMPLETO
============================================================
Admin ID: admin_abc123
Nome: Admin Test
Email: admin@test.com
Telefone: +5511999999999
Face Auth: ✅ Habilitado
2FA: ✅ Habilitado
============================================================
```

### Teste 2: Verificar no Firestore

```javascript
// No console do Firebase
db.collection('admins')
  .where('email', '==', 'admin@test.com')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log('Admin:', doc.data());
      console.log('Face Descriptor Length:', doc.data().faceData.descriptor.length);
      console.log('Image Base64 Length:', doc.data().faceData.image.length);
    });
  });
```

Saída esperada:
```javascript
{
  id: "admin_abc123",
  name: "Admin Test",
  email: "admin@test.com",
  phone: "+5511999999999",
  faceData: {
    descriptor: [0.123, -0.456, ...], // 128 valores
    image: "data:image/jpeg;base64,/9j/4AAQ...",
    capturedAt: "2025-10-10T12:00:00.000Z",
    registeredAt: "2025-10-10T12:05:30.000Z"
  },
  role: "admin",
  status: "active",
  security: {
    faceAuthEnabled: true,
    emailVerified: true,
    phoneVerified: true
  }
}
```

### Teste 3: Tentar Cadastrar Mesmo Rosto Novamente

Repetir o processo de cadastro com o mesmo rosto.

**Resultado Esperado**:
```
[Admin Registration] Verificando se rosto já está cadastrado...
[Admin Registration] ❌ Rosto já cadastrado no sistema
```

Erro na UI:
```
Este rosto já está cadastrado no sistema. Use outro método de autenticação.
```

### Teste 4: Login com Reconhecimento Facial

```bash
# Criar componente de teste ou chamar API diretamente
curl -X POST http://localhost:3000/api/admin/auth/face-login \
  -H "Content-Type: application/json" \
  -d '{
    "faceIdToken": "{\"descriptor\":[...],\"image\":\"...\",\"capturedAt\":\"...\"}"
  }'
```

**Resultado Esperado**:
```json
{
  "success": true,
  "message": "Login com reconhecimento facial bem-sucedido!",
  "admin": {
    "id": "admin_abc123",
    "name": "Admin Test",
    "email": "admin@test.com",
    "role": "admin"
  },
  "similarity": "95.42",
  "loginMethod": "face_recognition"
}
```

---

## 🔍 Verificação de Índices

Verificar se os índices foram criados:

```bash
# Listar índices
firebase firestore:indexes --project=YOUR_FIREBASE_PROJECT_ID
```

Saída esperada:
```
verification_codes
  • email + type + used + createdAt (BUILDING → ACTIVE)
  • phone + type + used + createdAt (BUILDING → ACTIVE)

admins
  • status + security.faceAuthEnabled (BUILDING → ACTIVE)
  • email + status (BUILDING → ACTIVE)

pending_admin_registrations
  • email + status (BUILDING → ACTIVE)

admin_audit_log
  • adminId + timestamp (BUILDING → ACTIVE)
  • action + timestamp (BUILDING → ACTIVE)
```

**Status dos Índices**:
- `BUILDING` - Índice está sendo criado (aguardar)
- `ACTIVE` - Índice pronto para uso ✅
- `ERROR` - Erro na criação (verificar console)

---

## 🐛 Troubleshooting

### Erro: "Missing index"

**Problema**: Query requer índice que ainda não foi criado.

**Solução**:
1. Verificar se `firestore.indexes.json` tem o índice necessário
2. Deploy dos índices: `firebase deploy --only firestore:indexes`
3. Aguardar conclusão (pode levar vários minutos)
4. Verificar status: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/indexes

### Erro: "Permission denied"

**Problema**: Regras de segurança bloqueando acesso.

**Solução**:
1. Verificar `firestore.rules`
2. Deploy das regras: `firebase deploy --only firestore:rules`
3. Testar novamente

### Erro: "Schema document not found"

**Problema**: Collections não foram inicializadas.

**Solução**:
```bash
# Executar script de criação
node scripts/create-admin-schema.js
```

### Erro: "Face descriptor invalid"

**Problema**: Descritor facial corrompido ou formato inválido.

**Solução**:
1. Verificar que `faceData.descriptor` tem exatamente 128 valores
2. Verificar que todos valores são números válidos
3. Verificar conversão de Float32Array para array
4. Logs de debug: verificar console do navegador

### Erro: "Códigos não chegam"

**Em Desenvolvimento**:
- Códigos aparecem no console do servidor
- Não precisa SendGrid/Twilio configurados

**Em Produção**:
- Configurar SendGrid API key
- Configurar Twilio credentials
- Verificar variáveis de ambiente

---

## 📊 Monitoramento

### Logs do Sistema

```bash
# Seguir logs em tempo real
npm run dev

# Procurar por:
[FaceIDRegister] ✅ Rosto capturado com sucesso
[Admin Registration] ✅ Dados faciais validados
[Admin Registration] ✅ Rosto único confirmado
[Admin Registration] ✅ Administrador criado com sucesso
```

### Firestore Console

Monitorar:
- **Collections**: Verificar documentos criados
- **Rules**: Status das regras de segurança
- **Indexes**: Status dos índices (BUILDING/ACTIVE)
- **Usage**: Leituras/escritas/deletes

### Auditoria

Verificar logs no Firestore:
```javascript
db.collection('admin_audit_log')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log(doc.data());
    });
  });
```

---

## 🔐 Segurança em Produção

### Checklist de Segurança

- [ ] `ADMIN_INVITATION_CODE` deve ser valor secreto forte
- [ ] Regras de Firestore atualizadas e testadas
- [ ] Índices criados para performance
- [ ] SendGrid configurado com domínio verificado
- [ ] Twilio configurado com número verificado
- [ ] Rate limiting nas APIs de verificação
- [ ] Monitoramento de tentativas de login
- [ ] Backup regular do Firestore
- [ ] HTTPS obrigatório para câmera
- [ ] CSP headers configurados

### Boas Práticas

1. **Threshold de Face Recognition**: 0.6 é conservador, ajustar se necessário
2. **Expiração de Códigos**: 10 minutos (pode reduzir para 5)
3. **Limpeza Automática**: Implementar Cloud Function para deletar códigos/registros expirados
4. **Rate Limiting**: Máximo 3 tentativas por IP/email em 5 minutos
5. **Logs de Auditoria**: Nunca deletar, são imutáveis
6. **Backup de Face Data**: Considerar backup separado das imagens

---

## 📚 Referências

### Documentação
- [Firestore Rules](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [face-api.js](https://github.com/justadudewhohacks/face-api.js)

### Arquivos do Projeto
- `/docs/ADMIN_FACE_REGISTRATION_SYSTEM.md` - Documentação completa do sistema
- `/src/lib/face-comparison.ts` - Algoritmos de comparação
- `/firestore.rules` - Regras de segurança
- `/firestore.indexes.json` - Definição de índices

---

**Última atualização**: 10 de outubro de 2025  
**Versão**: 1.0.0  
**Status**: ✅ Backend Completo e Documentado
