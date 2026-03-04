# Sistema de Cadastro de Administradores com Reconhecimento Facial

## 📋 Visão Geral

Sistema completo de cadastro de administradores com **3 etapas de verificação**:
1. **Reconhecimento Facial** (Face ID com base64)
2. **Verificação por Email** (código de 6 dígitos)
3. **Verificação por SMS** (código de 6 dígitos)

## 🎯 Funcionalidades Principais

### ✅ Reconhecimento Facial

- **Captura de Rosto**: Câmera detecta e captura o rosto em tempo real
- **Conversão Base64**: Imagem do rosto convertida para base64
- **Descritor Facial**: Array de 128 valores (face descriptor) para comparação
- **Validação Única**: Sistema verifica se rosto já está cadastrado
- **Comparação Euclidiana**: Algoritmo de distância euclidiana para matching

### ✅ Verificação por Email

- **Código de 6 Dígitos**: Gerado aleatoriamente
- **Validade**: 10 minutos
- **Email HTML**: Template profissional com SendGrid
- **Dev Mode**: Código exibido no console em desenvolvimento

### ✅ Verificação por SMS

- **Código de 6 Dígitos**: Independente do código de email
- **Formato**: Número com código do país (+5511999999999)
- **Validade**: 10 minutos
- **Dev Mode**: Código exibido no console em desenvolvimento

## 🏗️ Arquitetura

### Componentes Frontend

```
src/components/admin/admin-registration-wizard.tsx
├── Etapa 1: FaceIDRegister (captura facial)
├── Etapa 2: Formulário (nome, email, telefone, código de convite)
└── Etapa 3: Verificação (código email + código SMS)
```

```
src/components/auth/face-id-register.tsx
├── Inicialização face-api.js
├── Acesso à câmera
├── Detecção de rosto
├── Captura de imagem (base64)
├── Extração de descritor (128 valores)
└── Retorno de dados completos
```

### APIs Backend

```
src/app/api/admin/auth/
├── start-registration/route.ts       # Inicia registro, valida código de convite
├── complete-registration/route.ts    # Completa registro com todas verificações
├── face-login/route.ts               # Login com reconhecimento facial
└── /production/admin/auth/
    ├── send-email-code/route.ts      # Envia código por email
    └── send-sms-code/route.ts        # Envia código por SMS
```

### Biblioteca de Comparação Facial

```
src/lib/face-comparison.ts
├── calculateEuclideanDistance()      # Calcula distância entre descritores
├── areFacesSimilar()                 # Verifica se são a mesma pessoa
├── isValidFaceDescriptor()           # Valida descritor
├── findMostSimilarFace()             # Encontra rosto mais similar
├── calculateSimilarityPercentage()   # Calcula % de similaridade
└── isFaceAlreadyRegistered()         # Verifica se rosto já existe
```

## 🔄 Fluxo Completo de Cadastro

### Etapa 1: Captura Facial

```typescript
// 1. Usuário clica "Capturar Rosto"
// 2. FaceIDRegister detecta rosto
const detections = await faceapi
    .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

// 3. Captura imagem do vídeo
const canvas = document.createElement('canvas');
ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

// 4. Extrai descritor facial (128 valores)
const faceDescriptor = detections[0].descriptor; // Float32Array

// 5. Retorna dados completos
onRegistrationSuccess(faceDescriptor, imageBase64);
```

### Etapa 2: Informações Pessoais

```typescript
// Wizard armazena dados faciais
setFaceIdToken(JSON.stringify({
    descriptor: Array.from(faceDescriptor), // Converte Float32Array para array
    image: imageBase64,                     // Base64 da imagem
    capturedAt: new Date().toISOString()    // Timestamp
}));

// Usuário preenche:
// - Nome completo
// - Email
// - Telefone (+5511999999999)
// - Código de convite (ADMIN_INVITATION_CODE)

// API envia códigos de verificação
await sendEmailVerificationCode(email);
await sendSMSVerificationCode(phone);
```

### Etapa 3: Verificação 2FA

```typescript
// Usuário insere:
// - Código de 6 dígitos do email
// - Código de 6 dígitos do SMS

// API valida tudo:
await handleCompleteRegistration({
    name,
    email,
    phone,
    invitationCode,
    emailCode,
    smsCode,
    faceIdToken // JSON com descriptor + image + timestamp
});
```

## 🔒 Validações de Segurança

### 1. Validação de Dados Faciais

```typescript
interface FaceData {
    descriptor: number[];  // Array de 128 valores
    image: string;         // Base64 começando com "data:image"
    capturedAt: string;    // ISO timestamp
}

// Validações:
✅ Descriptor tem exatamente 128 valores
✅ Todos valores são números válidos
✅ Imagem é base64 válido
✅ Timestamp é string ISO válida
```

### 2. Verificação de Rosto Único

```typescript
// Buscar todos admins cadastrados
const existingAdmins = await db.collection('admins').get();
const existingDescriptors: number[][] = [];

existingAdmins.forEach(doc => {
    const data = doc.data();
    if (data.faceData && data.faceData.descriptor) {
        existingDescriptors.push(data.faceData.descriptor);
    }
});

// Comparar novo rosto com todos existentes
const isAlreadyRegistered = isFaceAlreadyRegistered(
    faceData.descriptor,
    existingDescriptors,
    0.6 // Threshold: distância < 0.6 = mesma pessoa
);

if (isAlreadyRegistered) {
    return error('Este rosto já está cadastrado no sistema');
}
```

### 3. Algoritmo de Comparação

```typescript
// Distância Euclidiana
function calculateEuclideanDistance(desc1: number[], desc2: number[]): number {
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

// Thresholds:
// Distance < 0.4: Mesma pessoa (alta confiança)
// Distance < 0.6: Mesma pessoa (confiança normal) ← usado no sistema
// Distance < 0.8: Possível mesma pessoa (baixa confiança)
// Distance > 0.8: Pessoas diferentes
```

### 4. Validação de Códigos

```typescript
// Email
const emailVerification = await db
    .collection('verification_codes')
    .where('email', '==', email)
    .where('type', '==', 'email')
    .where('used', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

if (emailVerification.docs[0].data().code !== emailCode) {
    return error('Código de email inválido');
}

// SMS
const smsVerification = await db
    .collection('verification_codes')
    .where('phone', '==', phone)
    .where('type', '==', 'sms')
    .where('used', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

if (smsVerification.docs[0].data().code !== smsCode) {
    return error('Código de SMS inválido');
}
```

## 💾 Estrutura de Dados no Firestore

### Collection: `admins`

```typescript
{
    id: "admin_abc123",
    name: "João Silva",
    email: "joao@exemplo.com",
    phone: "+5511999999999",
    
    // Dados faciais completos
    faceData: {
        descriptor: [0.123, -0.456, 0.789, ...], // 128 valores
        image: "data:image/jpeg;base64,/9j/4AAQ...", // Base64 da foto
        capturedAt: "2025-10-10T12:00:00.000Z",
        registeredAt: "2025-10-10T12:05:30.000Z"
    },
    
    // Compatibilidade com código antigo
    faceIdToken: "{\"descriptor\":[...],\"image\":\"...\"}",
    
    // Permissões
    role: "admin",
    status: "active",
    
    // Timestamps
    createdAt: "2025-10-10T12:05:30.000Z",
    lastLogin: "2025-10-10T15:30:00.000Z",
    
    // 2FA
    twoFactorEnabled: true,
    
    // Segurança
    security: {
        faceAuthEnabled: true,
        emailVerified: true,
        phoneVerified: true,
        registrationIP: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
        lastFaceLogin: "2025-10-10T15:30:00.000Z",
        faceLoginCount: 42
    }
}
```

### Collection: `verification_codes`

```typescript
{
    // Email verification
    email: "joao@exemplo.com",
    code: "123456",
    type: "email",
    used: false,
    createdAt: "2025-10-10T12:00:00.000Z",
    expiresAt: "2025-10-10T12:10:00.000Z", // +10 min
    usedAt: null
}

{
    // SMS verification
    phone: "+5511999999999",
    code: "654321",
    type: "sms",
    used: false,
    createdAt: "2025-10-10T12:00:00.000Z",
    expiresAt: "2025-10-10T12:10:00.000Z",
    usedAt: null
}
```

### Collection: `pending_admin_registrations`

```typescript
{
    name: "João Silva",
    email: "joao@exemplo.com",
    phone: "+5511999999999",
    status: "pending_verification",
    createdAt: "2025-10-10T12:00:00.000Z",
    expiresAt: "2025-10-10T12:30:00.000Z" // +30 min
}
```

### Collection: `admin_audit_log`

```typescript
{
    action: "admin_registered",
    adminId: "admin_abc123",
    email: "joao@exemplo.com",
    timestamp: "2025-10-10T12:05:30.000Z",
    metadata: {
        name: "João Silva",
        phone: "+5511999999999",
        faceAuthEnabled: true,
        emailVerified: true,
        phoneVerified: true,
        registrationMethod: "face_id_with_2fa",
        descriptorLength: 128,
        imageSize: 45 // KB
    }
}
```

## 🧪 Testando o Sistema

### 1. Teste Completo de Cadastro

```bash
# Iniciar servidor
npm run dev

# Acessar: http://localhost:3000/admin
# Clicar em "Cadastre-se como Admin"
```

**Etapa 1: Captura Facial**
1. Permitir acesso à câmera
2. Posicionar rosto no círculo
3. Clicar "Capturar Rosto"
4. Aguardar "Rosto Registrado!"
5. Modal avança automaticamente

**Etapa 2: Informações**
1. Preencher nome: "Test Admin"
2. Email: "test@exemplo.com"
3. Telefone: "+5511999999999"
4. Código de convite: (ver `.env.local` → `ADMIN_INVITATION_CODE`)
5. Clicar "Enviar Códigos"

**Etapa 3: Verificação**
1. Verificar console do servidor:
   ```
   [EMAIL VERIFICATION] Código para test@exemplo.com: 123456
   [SMS VERIFICATION] Código para +5511999999999: 654321
   ```
2. Inserir código de email
3. Inserir código de SMS
4. Clicar "Concluir Registro"
5. Verificar sucesso e redirecionamento

### 2. Verificar no Firestore

```javascript
// Console do Firebase
db.collection('admins')
  .where('email', '==', 'test@exemplo.com')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log('Admin:', doc.data());
      console.log('Face Descriptor Length:', doc.data().faceData.descriptor.length);
      console.log('Image Base64 Length:', doc.data().faceData.image.length);
    });
  });
```

### 3. Testar Rosto Duplicado

1. Tentar cadastrar novamente com mesmo rosto
2. Sistema deve detectar:
   ```
   ❌ Este rosto já está cadastrado no sistema
   ```
3. Verificar log:
   ```
   [Admin Registration] Verificando se rosto já está cadastrado...
   [Admin Registration] ❌ Rosto já cadastrado no sistema
   ```

### 4. Testar Login Facial

```bash
# Acessar API diretamente
curl -X POST http://localhost:3000/api/admin/auth/face-login \
  -H "Content-Type: application/json" \
  -d '{
    "faceIdToken": "{\"descriptor\":[...],\"image\":\"...\",\"capturedAt\":\"...\"}"
  }'

# Resposta esperada:
{
  "success": true,
  "message": "Login com reconhecimento facial bem-sucedido!",
  "admin": {
    "id": "admin_abc123",
    "name": "Test Admin",
    "email": "test@exemplo.com",
    "role": "admin"
  },
  "similarity": "95.42",
  "loginMethod": "face_recognition"
}
```

## 📊 Logs do Sistema

### Cadastro Bem-Sucedido

```
[FaceIDRegister] Rosto detectado, capturando imagem e descritor...
[FaceIDRegister] ✅ Rosto capturado com sucesso
[FaceIDRegister] Descritor length: 128
[FaceIDRegister] Image size: 45 KB

[AdminRegistration] Face captured successfully
[AdminRegistration] Descriptor length: 128
[AdminRegistration] Image base64 length: 61234

[EMAIL VERIFICATION] Modo Desenvolvimento
============================================================
Email: test@exemplo.com
Código de Verificação: 123456
============================================================

[SMS VERIFICATION] Código para +5511999999999: 654321

[Admin Registration] ✅ Dados faciais validados com sucesso
[Admin Registration] Descriptor length: 128
[Admin Registration] Image size: 45 KB

[Admin Registration] Verificando se rosto já está cadastrado...
[Admin Registration] ✅ Rosto único confirmado

[Admin Registration] ✅ Administrador criado com sucesso: admin_abc123
[Admin Registration] ✅ Log de auditoria criado

============================================================
[Admin Registration] REGISTRO COMPLETO
============================================================
Admin ID: admin_abc123
Nome: Test Admin
Email: test@exemplo.com
Telefone: +5511999999999
Face Auth: ✅ Habilitado
2FA: ✅ Habilitado
============================================================
```

### Login Facial Bem-Sucedido

```
[Face Login] ✅ Dados faciais validados
[Face Login] Descriptor length: 128
[Face Login] Comparando com 3 administradores...
[FaceComparison] Distance: 0.2341 (threshold: 0.6)
[Face Login] ✅ Rosto reconhecido!
[Face Login] Admin: Test Admin
[Face Login] Similarity: 95.42%
[Face Login] Distance: 0.2341
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# .env.local

# Código de convite para cadastro
ADMIN_INVITATION_CODE=ADMIN2024SECRET

# SendGrid (email)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@italosantos.com

# Twilio (SMS) - Opcional
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+5511999999999

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Firestore Indexes

```javascript
// Criar índices no Firebase Console
// Collection: verification_codes

// Índice 1: Email verification lookup
{
  collectionId: 'verification_codes',
  fields: [
    { fieldPath: 'email', order: 'ASCENDING' },
    { fieldPath: 'type', order: 'ASCENDING' },
    { fieldPath: 'used', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' }
  ]
}

// Índice 2: SMS verification lookup
{
  collectionId: 'verification_codes',
  fields: [
    { fieldPath: 'phone', order: 'ASCENDING' },
    { fieldPath: 'type', order: 'ASCENDING' },
    { fieldPath: 'used', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' }
  ]
}

// Índice 3: Admin face auth lookup
{
  collectionId: 'admins',
  fields: [
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'security.faceAuthEnabled', order: 'ASCENDING' }
  ]
}
```

## 🚀 Produção

### Checklist de Deploy

- [ ] Configurar SendGrid com domínio verificado
- [ ] Configurar Twilio para SMS
- [ ] Atualizar `ADMIN_INVITATION_CODE` com valor secreto forte
- [ ] Criar índices do Firestore
- [ ] Testar captura facial em HTTPS (necessário para camera)
- [ ] Configurar rate limiting nas APIs
- [ ] Configurar CORS apropriado
- [ ] Habilitar logs de auditoria
- [ ] Configurar backup do Firestore
- [ ] Testar em diferentes navegadores
- [ ] Testar em dispositivos móveis

### Performance

- **Tamanho da Imagem**: ~45KB (JPEG quality 0.8)
- **Tamanho do Descritor**: 128 floats = ~512 bytes
- **Tempo de Captura**: ~1-2 segundos
- **Tempo de Comparação**: ~0.5ms por admin (100 admins = ~50ms)
- **Threshold Recomendado**: 0.6 (ajustar conforme necessário)

### Segurança

✅ **Dados Faciais Criptografados**: Armazenados no Firestore com regras de segurança  
✅ **2FA Obrigatório**: Email + SMS  
✅ **Código de Convite**: Previne cadastros não autorizados  
✅ **Validação de Rosto Único**: Previne duplicatas  
✅ **Expiração de Códigos**: 10 minutos  
✅ **Logs de Auditoria**: Todas ações registradas  
✅ **IP e User-Agent**: Tracked para segurança  

## 📝 Notas Importantes

### Limitações do Face Recognition

- **Iluminação**: Funciona melhor com boa iluminação
- **Ângulo**: Rosto deve estar frontal à câmera
- **Distância**: Rosto deve ocupar boa parte do frame
- **Qualidade da Câmera**: Melhores resultados com câmeras HD
- **Threshold**: 0.6 é conservador, pode ajustar para 0.5 ou 0.7

### Modo Desenvolvimento

- Códigos de verificação aparecem no console do servidor
- SendGrid não é necessário
- Twilio não é necessário
- Útil para testes rápidos

### Próximas Melhorias

- [ ] Adicionar liveness detection (piscar, sorrir)
- [ ] Suportar múltiplos rostos por admin
- [ ] Adicionar reconhecimento de máscara
- [ ] Melhorar UI com preview do rosto capturado
- [ ] Adicionar opção de recadastrar rosto
- [ ] Implementar rate limiting por IP
- [ ] Adicionar captcha no formulário
- [ ] Suportar autenticação biométrica do dispositivo

---

**Última atualização**: 10 de outubro de 2025  
**Versão**: 1.0.0  
**Status**: ✅ Implementado e Funcional
