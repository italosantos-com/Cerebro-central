# Sistema de Notificações (Email e SMS)

## Configuração

### 1. Instalar dependências
```bash
npm install @sendgrid/mail twilio
```

### 2. Configurar variáveis de ambiente
Copie as variáveis de `.env.notifications.example` para seu `.env.local`:

```bash
# SendGrid
SENDGRID_API_KEY=sua_api_key_aqui
SENDGRID_FROM_EMAIL=noreply@seudominio.com
SENDGRID_FROM_NAME=Seu App

# Twilio
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_PHONE_NUMBER=+5511999999999

# App URL
NEXT_PUBLIC_APP_URL=https://seudominio.com
```

### 3. Obter credenciais

#### SendGrid
1. Acesse https://app.sendgrid.com/settings/api_keys
2. Crie uma nova API Key com permissões de envio
3. Configure domínio verificado em https://app.sendgrid.com/settings/sender_auth

#### Twilio
1. Acesse https://console.twilio.com/
2. Copie Account SID e Auth Token
3. Adquira um número de telefone em https://console.twilio.com/us1/develop/phone-numbers/manage/incoming

## Uso

### Enviar Email

```typescript
// Via API
const response = await fetch('/api/notifications/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer seu_token_aqui'
  },
  body: JSON.stringify({
    to: 'usuario@exemplo.com',
    subject: 'Bem-vindo!',
    html: '<h1>Olá!</h1><p>Bem-vindo ao nosso app.</p>'
  })
});

// Via serviço direto
import { sendEmail } from '@/services/email';
await sendEmail('usuario@exemplo.com', 'Assunto', '<p>Conteúdo</p>');
```

### Enviar SMS

```typescript
// Via API
const response = await fetch('/api/notifications/send-sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer seu_token_aqui'
  },
  body: JSON.stringify({
    to: '+5511999999999',
    body: 'Seu código de verificação é: 123456'
  })
});

// Via serviço direto
import { sendSms } from '@/services/sms';
await sendSms('+5511999999999', 'Mensagem aqui');
```

### Usar Templates de Email

```typescript
import { emailTemplates } from '@/lib/email-templates';

const htmlContent = emailTemplates.welcome('João Silva');
await sendEmail('joao@exemplo.com', 'Bem-vindo!', htmlContent);

// Outros templates disponíveis:
emailTemplates.resetPassword(name, resetLink);
emailTemplates.verifyEmail(name, verificationLink);
emailTemplates.orderConfirmation(name, orderNumber, total);
emailTemplates.paymentReceived(name, amount, date);
```

## Segurança

### Rate Limiting
- **Email**: 10 envios por minuto por IP
- **SMS**: 5 envios por minuto por IP

### Autenticação
As rotas de API requerem token Bearer no header:
```
Authorization: Bearer seu_token_aqui
```

### Validação
- Emails são validados com regex
- Telefones são normalizados para formato internacional (+55...)
- HTML é sanitizado para remover scripts e iframes

## Estrutura de Arquivos

```
src/
├── services/
│   ├── email.ts          # Serviço SendGrid
│   └── sms.ts            # Serviço Twilio
├── types/
│   └── notifications.ts  # Tipos TypeScript
├── lib/
│   ├── validators.ts     # Validadores e helpers
│   └── email-templates.ts # Templates HTML
└── app/api/notifications/
    ├── send-email/
    │   └── route.ts      # API route para email
    └── send-sms/
        └── route.ts      # API route para SMS
```

## Troubleshooting

### Email não enviado
- Verifique se `SENDGRID_API_KEY` está correto
- Confirme que o domínio está verificado no SendGrid
- Verifique os logs do SendGrid: https://app.sendgrid.com/email_activity

### SMS não enviado
- Verifique credenciais Twilio
- Confirme que o número está no formato internacional (+55...)
- Para números de teste, configure em: https://console.twilio.com/us1/develop/phone-numbers/manage/verified

### Rate limit atingido
- Aguarde 1 minuto antes de tentar novamente
- Em produção, use Redis para rate limiting distribuído

## Custos

### SendGrid
- 100 emails/dia grátis
- Plano Essentials: $19.95/mês (50k emails)

### Twilio
- SMS nacional: ~$0.02 por mensagem
- Créditos de teste disponíveis para desenvolvimento

## Próximos Passos

1. Implementar fila de mensagens (Bull/BullMQ)
2. Adicionar retry automático para falhas
3. Implementar tracking de abertura/clique (SendGrid)
4. Adicionar notificações push (Firebase Cloud Messaging)
5. Dashboard de analytics de notificações
