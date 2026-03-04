# Sistema de Registro de Administradores

## 📋 Visão Geral

Sistema completo de registro de administradores com autenticação facial, verificação em dois fatores (2FA) via email e SMS, e auditoria completa.

## 🏗️ Arquitetura

### Fluxo de Registro

```
1. Usuário acessa tela de login admin
2. Clica em "Cadastre-se como Admin"
3. Modal abre com wizard de 3 etapas:
   
   ETAPA 1: Registro Facial
   - Captura imagem do rosto via webcam
   - Extrai descriptor facial usando face-api.js
   - Gera token único do rosto
   
   ETAPA 2: Informações Pessoais
   - Nome completo
   - Email
   - Telefone (com código do país)
   - Código de convite secreto
   
   ETAPA 3: Verificação 2FA
   - Código enviado por email (6 dígitos)
   - Código enviado por SMS (6 dígitos)
   
4. Após validação completa, admin é criado
5. Registro é auditado no Firestore
```

## 📁 Estrutura de Arquivos

### Componentes Frontend

```
src/components/
├── auth/
│   ├── face-id-register.tsx       # Componente de captura facial para registro
│   └── face-id-auth.tsx            # Componente de autenticação facial (login)
└── admin/
    └── admin-registration-wizard.tsx  # Wizard completo de registro
```

### APIs Backend

```
src/app/api/
├── admin/auth/
│   ├── start-registration/route.ts    # Inicia processo de registro
│   └── complete-registration/route.ts # Finaliza registro após verificações
└── production/admin/auth/
    ├── send-email-code/route.ts        # Envia código de verificação por email
    └── send-sms-code/route.ts          # Envia código de verificação por SMS
```

## 🗄️ Estrutura do Firestore

### Collections

#### `admins`
```typescript
{
  id: string,                    // ID único do admin
  name: string,                  // Nome completo
  email: string,                 // Email (único)
  phone: string,                 // Telefone com código do país
  faceIdToken: string,           // Token do descriptor facial
  role: 'admin',                 // Papel do usuário
  status: 'active' | 'inactive', // Status da conta
  twoFactorEnabled: boolean,     // 2FA habilitado
  createdAt: string,             // Data de criação (ISO)
  lastLogin: string | null       // Último login (ISO)
}
```

#### `pending_admin_registrations`
```typescript
{
  name: string,
  email: string,
  phone: string,
  status: 'pending_verification',
  createdAt: string,             // ISO timestamp
  expiresAt: string              // ISO timestamp (30 min após criação)
}
```

#### `verification_codes`
```typescript
{
  email?: string,                // Para códigos de email
  phone?: string,                // Para códigos de SMS
  code: string,                  // Código de 6 dígitos
  type: 'email' | 'sms',         // Tipo de verificação
  used: boolean,                 // Se foi usado
  usedAt?: string,               // Quando foi usado (ISO)
  createdAt: string,             // ISO timestamp
  expiresAt: string              // ISO timestamp (10 min após criação)
}
```

#### `admin_audit_log`
```typescript
{
  action: string,                // Ex: 'admin_registered', 'admin_login'
  adminId: string,               // ID do admin
  email: string,                 // Email do admin
  timestamp: string,             // ISO timestamp
  metadata: object               // Dados adicionais da ação
}
```

## 🔐 Segurança

### Código de Convite

O código de convite é obrigatório e deve ser mantido secreto. Configure em `.env`:

```env
ADMIN_INVITATION_CODE=SeuCodigoSecretoAqui123
```

### Verificação em Dois Fatores (2FA)

Todos os administradores devem passar por verificação via:
1. **Email**: Código de 6 dígitos enviado para o email
2. **SMS**: Código de 6 dígitos enviado para o telefone

### Expiração

- **Registro Pendente**: 30 minutos
- **Códigos de Verificação**: 10 minutos
- **Sessão de Admin**: 24 horas (configurável)

### Auditoria

Todas as ações relacionadas a administradores são registradas em `admin_audit_log`:
- Registros
- Logins
- Alterações de perfil
- Ações administrativas

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Copie o arquivo de exemplo:
```bash
cp .env.admin-auth.example .env.local
```

Configure as variáveis necessárias:

```env
# Obrigatório
ADMIN_INVITATION_CODE=seu_codigo_secreto

# Para produção - escolha um serviço de email
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=no-reply@seudominio.com

# Para produção - escolha um serviço de SMS
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

### 2. Modelos Face-API

Certifique-se de que os modelos do face-api.js estão em `public/models/`:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`
- `face_expression_model-weights_manifest.json`
- `face_expression_model-shard1`

### 3. Firebase Admin

Configure o Firebase Admin SDK seguindo `docs/FIREBASE_ADMIN_DIAGNOSIS.md`.

## 🚀 Deploy em Produção

### Pré-requisitos

1. **Serviço de Email** configurado (SendGrid, AWS SES, etc.)
2. **Serviço de SMS** configurado (Twilio, AWS SNS, etc.)
3. **Firebase Admin SDK** configurado
4. **Variáveis de ambiente** de produção configuradas

### Checklist de Deploy

- [ ] Alterar `ADMIN_INVITATION_CODE` para valor secreto único
- [ ] Configurar serviço de email (remover modo development)
- [ ] Configurar serviço de SMS (remover modo development)
- [ ] Testar fluxo completo em staging
- [ ] Configurar rate limiting
- [ ] Configurar monitoramento de logs
- [ ] Documentar código de convite para administradores autorizados

### Implementação de Email (Produção)

Edite `src/app/api/production/admin/auth/send-email-code/route.ts`:

```typescript
// Remover código de desenvolvimento
// Adicionar integração real, exemplo com SendGrid:
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

await sgMail.send({
  to: email,
  from: process.env.SENDGRID_FROM_EMAIL!,
  subject: 'Código de Verificação - Admin',
  text: `Seu código de verificação é: ${code}`,
  html: `
    <h2>Código de Verificação</h2>
    <p>Seu código de verificação é: <strong>${code}</strong></p>
    <p>Este código expira em 10 minutos.</p>
  `,
});
```

### Implementação de SMS (Produção)

Edite `src/app/api/production/admin/auth/send-sms-code/route.ts`:

```typescript
// Remover código de desenvolvimento
// Adicionar integração real, exemplo com Twilio:
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

await client.messages.create({
  body: `Seu código de verificação é: ${code}`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: phoneNumber,
});
```

## 🧪 Modo de Desenvolvimento

No modo de desenvolvimento (`NODE_ENV=development`), os códigos de verificação são retornados na resposta da API para facilitar testes:

```json
{
  "message": "Código enviado (development mode)",
  "code": "123456"
}
```

**IMPORTANTE**: Remova esta funcionalidade em produção!

## 📊 Monitoramento

### Logs Importantes

Monitore os seguintes eventos:
- Tentativas de registro com código de convite inválido
- Falhas na verificação de email/SMS
- Registros expirados
- Múltiplas tentativas do mesmo IP

### Alertas Recomendados

1. Mais de 5 tentativas falhadas de código de convite em 1 hora
2. Mais de 10 solicitações de código de verificação do mesmo email/telefone em 1 hora
3. Taxa de falha de registro > 50%

## 🔧 Troubleshooting

### "Código de convite inválido"

- Verifique se `ADMIN_INVITATION_CODE` está configurado corretamente
- Certifique-se de que o código é case-sensitive

### "Registro não encontrado ou expirado"

- O registro pendente expira em 30 minutos
- Inicie o processo novamente

### "Código de email/SMS inválido"

- Códigos expiram em 10 minutos
- Solicite um novo código
- Verifique se não há espaços extras no código

### Câmera não funciona

- Permissão negada: usuário deve permitir acesso à câmera
- HTTPS obrigatório: face-api.js requer conexão segura
- Navegador incompatível: use Chrome, Firefox ou Safari moderno

## 📝 Próximos Passos

- [ ] Implementar rate limiting no nível de aplicação
- [ ] Adicionar captcha no formulário de registro
- [ ] Implementar notificações de novos registros para admin principal
- [ ] Adicionar dashboard de gerenciamento de admins
- [ ] Implementar sistema de permissões granulares
- [ ] Adicionar backup e recuperação de Face ID

## 📞 Suporte

Para problemas ou dúvidas, consulte a documentação em `/docs/` ou entre em contato com o desenvolvedor.
