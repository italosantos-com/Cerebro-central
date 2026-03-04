# Integração Mercado Pago OAuth + PIX

## 📋 Visão Geral

Sistema completo de integração OAuth com Mercado Pago, incluindo:
- ✅ Autenticação OAuth 2.0 com PKCE
- ✅ Geração de QR Code PIX
- ✅ Verificação automática de pagamento
- ✅ Painel admin para conectar conta

## 🔐 Configuração OAuth

### 1. Variáveis de Ambiente

Adicione ao seu `.env.local`:

```env
# Mercado Pago OAuth
NEXT_PUBLIC_MERCADOPAGO_CLIENT_ID=seu_client_id
MERCADOPAGO_CLIENT_SECRET=seu_client_secret
NEXT_PUBLIC_MERCADOPAGO_REDIRECT_URI=https://seusite.com/auth/mercadopago/callback

# Mercado Pago Access Token (opcional, usado como fallback)
MERCADOPAGO_ACCESS_TOKEN=seu_access_token
```

### 2. Configurar Aplicação no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Crie uma aplicação ou use uma existente
3. Configure:
   - **Redirect URI**: `https://seusite.com/auth/mercadopago/callback`
   - **Habilitar PKCE**: Sim (recomendado)
   - **Scopes necessários**: `read`, `write`, `offline_access`

## 🎯 Fluxos de Autenticação

### Authorization Code (OAuth com usuário)

```typescript
import { mercadoPagoOAuth } from '@/services/mercadopago-oauth-integration';

// Abrir popup de autenticação
const result = await mercadoPagoOAuth.openAuthorizationPopup(true); // true = usar PKCE

if (result.success) {
  console.log('Access Token:', result.accessToken);
  console.log('Refresh Token:', result.refreshToken);
  console.log('Usuário:', result.user);
}
```

### Client Credentials (Backend)

```typescript
import { mercadoPagoOAuth } from '@/services/mercadopago-oauth-integration';

// Obter token sem interação do usuário
const result = await mercadoPagoOAuth.getClientCredentialsToken();

if (result.success) {
  console.log('Access Token:', result.accessToken);
  // Token válido por 6 horas
}
```

## 💳 Componente de Pagamento PIX

### Uso Básico

```tsx
import { MercadoPagoPixPayment } from '@/components/MercadoPagoPixPayment';

export default function PaymentPage() {
  return (
    <MercadoPagoPixPayment
      amount={99.90}
      description="Assinatura VIP"
      onSuccess={(paymentId) => {
        console.log('Pagamento aprovado:', paymentId);
        // Redirecionar ou atualizar UI
      }}
      onError={(error) => {
        console.error('Erro:', error);
      }}
    />
  );
}
```

### Seção de Planos (Exemplo Completo)

```tsx
import { PixPaymentSection } from '@/components/PixPaymentSection';

export default function HomePage() {
  return (
    <div>
      {/* Outros componentes */}
      <PixPaymentSection />
    </div>
  );
}
```

## 🎨 Componente de Autenticação Admin

### Botão no Painel de Integrações

O botão já está integrado em `/admin/integrations`:

```tsx
import { MercadoPagoAuthButton } from '@/components/MercadoPagoAuthButton';

<MercadoPagoAuthButton
  mode="authorization_code"
  usePKCE={true}
  onSuccess={(data) => {
    // Salvar dados no banco
  }}
  onError={(error) => {
    console.error(error);
  }}
/>
```

## 🔄 Fluxo Completo de Pagamento

1. **Admin conecta conta** (`/admin/integrations`)
   - Click em "Conectar com Mercado Pago"
   - Autoriza acesso
   - Access Token salvo no Firebase

2. **Usuário seleciona plano** (página inicial)
   - Escolhe plano
   - Preenche dados (nome, email, CPF)
   - Gera QR Code PIX

3. **Sistema gera pagamento**
   - POST `/api/payments/mercadopago/create-pix`
   - Usa Access Token do admin
   - Retorna QR Code

4. **Usuário paga**
   - Escaneia QR Code
   - Ou copia código PIX

5. **Sistema verifica pagamento**
   - Polling a cada 5 segundos
   - GET `/api/payments/mercadopago/status/[paymentId]`
   - Notifica quando aprovado

## 📁 Estrutura de Arquivos

```
src/
├── services/
│   └── mercadopago-oauth-integration.ts  # Serviço OAuth completo
├── utils/
│   └── crypto-helpers.ts                 # Helpers PKCE (SHA256, Base64)
├── components/
│   ├── MercadoPagoAuthButton.tsx         # Botão Login/Logout
│   ├── MercadoPagoPixPayment.tsx         # Componente pagamento PIX
│   └── PixPaymentSection.tsx             # Seção de planos
├── app/
│   ├── api/
│   │   └── payments/mercadopago/
│   │       ├── create-pix/route.ts       # Criar pagamento
│   │       └── status/[id]/route.ts      # Verificar status
│   ├── auth/mercadopago/callback/
│   │   └── page.tsx                      # Página de callback OAuth
│   └── admin/integrations/
│       └── page.tsx                      # Painel de integrações
└── lib/
    └── mercadopago-client.ts             # Cliente SDK oficial
```

## 🔒 Segurança

### PKCE (Proof Key for Code Exchange)

O sistema usa PKCE para proteção adicional:

1. Gera `code_verifier` aleatório (128 chars)
2. Cria `code_challenge` com SHA256 + Base64URL
3. Envia `code_challenge` na autorização
4. Envia `code_verifier` na troca do token
5. Mercado Pago valida a correspondência

### Validação de Dados

- CPF validado (11 dígitos)
- Email validado (formato correto)
- Valores validados (> 0)
- CSRF protection com `state`

## 🧪 Testando

### 1. Conectar Conta Admin

```
1. Acesse: http://localhost:3000/admin/integrations
2. Click em "Conectar com Mercado Pago"
3. Faça login no Mercado Pago
4. Autorize o acesso
```

### 2. Testar Pagamento PIX

```
1. Acesse a página inicial
2. Selecione um plano
3. Preencha os dados de teste:
   - Nome: João Silva
   - Email: teste@email.com
   - CPF: 12345678909
4. Gere o QR Code
5. Use app de teste do Mercado Pago
```

### Dados de Teste (Sandbox)

```
CPF: 12345678909
Email: test_user_123456789@testuser.com
```

## 📊 Monitoramento

### Logs

```typescript
// Verificar tokens salvos
console.log(sessionStorage.getItem('mercadopago_access_token'));
console.log(sessionStorage.getItem('mercadopago_refresh_token'));

// Verificar PKCE
console.log(sessionStorage.getItem('mercadopago_pkce'));
console.log(sessionStorage.getItem('mercadopago_state'));
```

### Firebase Realtime Database

```
admin/integrations/mercadopago/
  ├── connected: true
  ├── access_token: "APP_USR-..."
  ├── refresh_token: "TG-..."
  ├── public_key: "APP_USR-..."
  ├── user_id: 123456789
  └── connected_at: "2025-11-13T..."
```

## 🚀 Deploy

### Variáveis no Vercel/Firebase

```bash
# Adicionar no Vercel
vercel env add MERCADOPAGO_CLIENT_SECRET
vercel env add NEXT_PUBLIC_MERCADOPAGO_CLIENT_ID

# Ou Firebase
firebase functions:config:set mercadopago.client_secret="xxx"
firebase functions:config:set mercadopago.client_id="xxx"
```

### URLs de Callback

Produção: `https://seusite.com/auth/mercadopago/callback`
Local: `http://localhost:3000/auth/mercadopago/callback`

⚠️ **Importante**: Configure ambas as URLs no painel do Mercado Pago

## 🆘 Troubleshooting

### Erro: "Client ID não configurado"

Verifique se `NEXT_PUBLIC_MERCADOPAGO_CLIENT_ID` está definido

### Erro: "Popup bloqueado"

Configure o navegador para permitir popups do seu site

### Erro: "Invalid state"

Possível ataque CSRF ou cookies bloqueados. Verifique:
- Cookies habilitados
- HTTPS em produção
- `SameSite=Lax` configurado

### QR Code não aparece

1. Verifique se a conta está conectada em `/admin/integrations`
2. Confirme que `access_token` está no Firebase
3. Valide CPF (11 dígitos sem formatação)

## 📚 Documentação Oficial

- [Mercado Pago OAuth](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/introduction)
- [Pagamentos PIX](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/pix)
- [SDK Node.js](https://github.com/mercadopago/sdk-nodejs)
