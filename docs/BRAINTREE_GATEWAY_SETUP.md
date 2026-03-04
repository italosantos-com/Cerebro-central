# Braintree Gateway Configuration

## 🎯 Status

✅ **Configurado e Pronto para Uso**

## 📋 Credenciais do Sandbox

### Server-side (Backend)
```
Merchant ID:    75tzy2qyrkv9hfwj
Public Key:     vkvp26rxfb4wd4qx
Private Key:    7eefa5f69c77f009e83281a9491a6c4d
Environment:    sandbox
```

### Client-side (Tokenização)
```
Tokenization Key:  sandbox_44sj35kb_75tzy2qyrkv9hfwj
CSE Key (Legacy):  MIIBCgKCAQEAyQLDjvPtHUouNHwJMohcKjHykHhNOqKY5G4tgZGoNnA4GYsD5AE5zKYApURmKXQqkh8FcExlMyXr0/hD9OHwANf5d9XE/62zSb/hwAlpWjztGlF95bNsewDOTmL7VCungqgHZYvf9yDHuzIV7JBIxjRiBugxfiE8AA8yIgjIWohYER8PdiMCz6d2RDk1qSN8vHanmFESXRnp8djoj4YaoVArgd59VkIwfu8Wo9ZDdgCWAFwL7NW25xu+QEOGuy3/vEVN46xE13ZMrw1/tsaaOO8zz1+fsqyjrkJm6Kt5ukmWbzCdUqHgqQEwC2CvsqvMx2AlRtlvPwILk0/Li/0NLQIDAQAB
Status:            ativo
```

## 🔧 Estrutura da Configuração

### Arquivos de Configuração

```
src/lib/
├── braintree-gateway.ts                    # Gateway principal
├── braintree-tokenization-keys.ts          # Chaves de tokenização (NEW)
├── braintree-apple-pay-config.ts          # Configuração Apple Pay
└── google-pay-config.ts                   # Configuração Google Pay

src/app/api/payments/
└── braintree/
    ├── apple-pay/route.ts           # API: Apple Pay
    ├── google-pay/route.ts          # API: Google Pay
    └── transactions/route.ts        # API: Transações gerais

src/hooks/
├── useApplePayBraintree.ts          # Hook: Apple Pay
└── useGooglePayBraintree.ts         # Hook: Google Pay (se aplicável)
```

## 🚀 Como Usar

### 1. Verificar Configuração

```bash
# Executar script de verificação
bash scripts/test-braintree-config.sh

# Ou testar conexão
npx ts-node scripts/test-braintree-connection.ts
```

### 2. Usar no Backend

```typescript
import { getBraintreeGateway } from '@/lib/braintree-gateway';

// Obter instância do gateway
const gateway = getBraintreeGateway();

// Gerar client token
const result = await gateway.clientToken.generate({
  merchantAccountId: '75tzy2qyrkv9hfwj',
});

const clientToken = result.clientToken;

// Processar transação
const saleResult = await gateway.transaction.sale({
  amount: '10.00',
  paymentMethodNonce: nonce,
  merchantAccountId: '75tzy2qyrkv9hfwj',
  options: {
    submitForSettlement: true,
  },
});
```

### 3. Usar no Frontend (React)

```tsx
import { useApplePayBraintree } from '@/hooks/useApplePayBraintree';

export function CheckoutButton() {
  const { isAvailable, initiatePayment } = useApplePayBraintree();

  const handleApplePayClick = async () => {
    const result = await initiatePayment({
      amount: 10.00,
      label: 'Assinatura Premium',
      customerId: 'user_123',
    });

    if (result.success) {
      console.log('✅ Pagamento aprovado!', result.transactionId);
    } else {
      console.error('❌ Pagamento falhou:', result.error);
    }
  };

  if (!isAvailable) return null;

  return (
    <button onClick={handleApplePayClick}>
      Pagar com Apple Pay
    </button>
  );
}
```

## 🧪 Testar com Cartões

### Cartões de Teste Válidos (Sandbox)

| Rede | Número | CVV | Exp | Resultado |
|------|--------|-----|-----|-----------|
| Visa | 4111 1111 1111 1111 | Qualquer | Futura | ✅ Aprovado |
| Mastercard | 5555 5555 5555 4444 | Qualquer | Futura | ✅ Aprovado |
| Amex | 3782 8224 6310 005 | Qualquer | Futura | ✅ Aprovado |
| Discover | 6011 1111 1111 1117 | Qualquer | Futura | ✅ Aprovado |

### Para Testes Específicos

```
CVV: Qualquer número de 3-4 dígitos
Data de Expiração: Qualquer data futura
Endereço: Qualquer endereço válido

Para testar rejeição, use:
- Número: 4000 1111 1111 1115
- CVV/Exp: Qualquer
```

## 📊 Endpoints API

### GET `/api/payments/braintree/apple-pay`
Gera um client token para inicializar Apple Pay no cliente.

**Resposta:**
```json
{
  "success": true,
  "clientToken": "eyJ2ZXJzaW9uIjoyLCJhdXRob3JpemF0aW9u...",
  "config": {
    "merchantId": "merchant.italosantos.com",
    "merchantName": "Italo Santos",
    "environment": "sandbox",
    "countryCode": "BR",
    "currencyCode": "BRL"
  }
}
```

### POST `/api/payments/braintree/apple-pay`
Processa um pagamento com Apple Pay via Braintree.

**Request:**
```json
{
  "paymentData": { ... },
  "amount": 10.00,
  "currency": "BRL",
  "description": "Assinatura Premium",
  "customerId": "user_123"
}
```

**Resposta:**
```json
{
  "success": true,
  "transactionId": "abc123def456",
  "status": "settling",
  "amount": "10.00",
  "currencyIsoCode": "BRL"
}
```

## 🔍 Monitorar Transações

### Dashboard Braintree
- **URL:** https://sandbox.braintreegateway.com/
- **Login:** Use credenciais PayPal
- **Seção:** Transactions → Procure por transações recentes

### Logs Locais
```bash
npm run dev

# Procure por logs como:
# [Braintree] ✅ Gateway configurado com sucesso
# 🔑 Gerando client token...
# ✅ Pagamento processado com sucesso
```

## 🚨 Troubleshooting

### Erro: "Braintree credentials not configured"
- ✅ Verifique se `.env.local` tem as variáveis:
  ```
  BRAINTREE_MERCHANT_ID=75tzy2qyrkv9hfwj
  BRAINTREE_PUBLIC_KEY=vkvp26rxfb4wd4qx
  BRAINTREE_PRIVATE_KEY=7eefa5f69c77f009e83281a9491a6c4d
  BRAINTREE_ENV=sandbox
  ```

### Erro: "Connection refused"
- ✅ Verifique se a internet está funcionando
- ✅ Verifique se as credenciais estão corretas
- ✅ Tente novamente em alguns instantes (rate limiting)

### Erro: "Unauthorized"
- ✅ Verifique as credenciais no dashboard Braintree
- ✅ Certifique-se de que as chaves não foram alteradas

### Apple Pay não aparece
- ✅ Verifique se está usando Safari em dispositivo Apple
- ✅ Verifique se tem cartões no Wallet
- ✅ Verifique os logs do console do navegador

## 📚 Documentação

- **Braintree Node.js SDK:** https://github.com/braintree/braintree_node
- **Braintree Docs:** https://developer.paypal.com/braintree/docs
- **Apple Pay on the Web:** https://developer.apple.com/apple-pay/
- **Google Pay Integration:** https://developers.google.com/pay

## 🔄 Migrar para Produção

1. **Obter credenciais de produção do Braintree**
2. **Atualizar `.env.local` (ou `.env.production`):**
   ```
   BRAINTREE_ENV=production
   BRAINTREE_MERCHANT_ID=<seu_merchant_id_prod>
   BRAINTREE_PUBLIC_KEY=<sua_public_key_prod>
   BRAINTREE_PRIVATE_KEY=<sua_private_key_prod>
   ```
3. **Registrar domínio de produção no Braintree**
4. **Deploy:**
   ```bash
   npm run build
   npm start
   ```

## ✅ Checklist de Configuração

- [x] Braintree package instalado (`npm install braintree`)
- [x] Credenciais configuradas em `.env.local`
- [x] Arquivo de gateway criado (`src/lib/braintree-gateway.ts`)
- [x] API routes criadas (`src/app/api/payments/braintree/`)
- [x] Hooks React criados (`src/hooks/useApplePayBraintree.ts`)
- [x] Scripts de teste criados (`scripts/test-braintree-*`)
- [ ] Domínio registrado no Braintree (para produção)
- [ ] Cartões de teste validados manualmente
- [ ] Transações verificadas no dashboard

## 🆘 Suporte

Para questões sobre:
- **Braintree:** https://support.braintreepayments.com/
- **Apple Pay:** https://developer.apple.com/support/
- **Projeto:** Entre em contato com o desenvolvedor principal

---

**Última atualização:** 20 de Novembro de 2025
**Status:** ✅ Operacional em Sandbox
