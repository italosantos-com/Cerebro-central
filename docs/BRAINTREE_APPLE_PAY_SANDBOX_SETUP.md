# Configuração Apple Pay com Braintree (Sandbox)

## 📋 Visão Geral

Este projeto está configurado para usar **Apple Pay via Braintree Gateway** em modo **sandbox** para testes.

## 🔧 Variáveis de Ambiente Necessárias

### Backend (`.env.local`)

```bash
# Braintree Credentials (Sandbox)
BRAINTREE_ENV=sandbox
BRAINTREE_MERCHANT_ID=75tzy2qyrkv9hfwj
BRAINTREE_PUBLIC_KEY=vkvp26rxfb4wd4qx
BRAINTREE_PRIVATE_KEY=7eefa5f69c77f009e83281a9491a6c4d

# Apple Pay Configuration
APPLE_PAY_ENVIRONMENT=sandbox
APPLE_PAY_DEBUG=true
NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID=merchant.italosantos.com
```

### Frontend (`.env.local`)

```bash
# Público - Exposto ao cliente
NEXT_PUBLIC_BRAINTREE_ENV=sandbox
NEXT_PUBLIC_BRAINTREE_MERCHANT_ID=75tzy2qyrkv9hfwj
NEXT_PUBLIC_BRAINTREE_PUBLIC_KEY=vkvp26rxfb4wd4qx
NEXT_PUBLIC_BRAINTREE_TOKENIZATION_KEY=sandbox_g42y39zw_348pk9cgf3bgyw2b
NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID=merchant.italosantos.com
```

## 📁 Arquivos de Configuração Criados

### 1. **Configuração Braintree Apple Pay**
- `src/lib/braintree-apple-pay-config.ts`
  - Gerencia configuração do Apple Pay com Braintree
  - Suporta sandbox e produção
  - Validação de configuração

### 2. **API Routes**
- `src/app/api/payments/braintree/apple-pay/route.ts`
  - GET: Gera client token para inicialização
  - POST: Processa pagamento Apple Pay

### 3. **Hook React**
- `src/hooks/useApplePayBraintree.ts`
  - Verifica disponibilidade do Apple Pay
  - Gerencia fluxo de pagamento
  - Integração com Braintree SDK

## 🚀 Como Usar

### 1. **Verificar Credenciais Braintree**

Entre no [Braintree Sandbox Dashboard](https://sandbox.braintreegateway.com/):
- Login: Use suas credenciais PayPal
- Navegue para **Settings** > **API Keys**
- Copie:
  - Merchant ID
  - Public Key
  - Private Key

### 2. **Configurar Apple Pay no Braintree**

1. Acesse **Settings** > **Processing** > **Apple Pay**
2. Clique em **Add a Domain**
3. Adicione seu domínio: `italosantos.com`
4. Baixe o arquivo de verificação
5. Coloque em `public/.well-known/apple-developer-merchantid-domain-association`

### 3. **Implementar no Frontend**

```tsx
import { useApplePayBraintree } from '@/hooks/useApplePayBraintree';

function CheckoutButton() {
  const { isAvailable, isLoading, initiatePayment } = useApplePayBraintree();

  const handleApplePayClick = async () => {
    const result = await initiatePayment({
      amount: 10.00,
      label: 'Assinatura Premium',
      customerId: 'user_123',
    });

    if (result.success) {
      console.log('Pagamento aprovado!', result.transactionId);
    }
  };

  if (isLoading) return <div>Carregando...</div>;
  if (!isAvailable) return <div>Apple Pay não disponível</div>;

  return (
    <button onClick={handleApplePayClick}>
      Pagar com Apple Pay
    </button>
  );
}
```

## 🧪 Testar em Sandbox

### Cartões de Teste Apple Pay (Sandbox)

No **modo sandbox**, use estes cartões no Wallet iOS:

| Número do Cartão | Tipo | Resultado |
|------------------|------|-----------|
| 4111 1111 1111 1111 | Visa | ✅ Aprovado |
| 5555 5555 5555 4444 | Mastercard | ✅ Aprovado |
| 3782 8224 6310 005 | Amex | ✅ Aprovado |
| 6011 1111 1111 1117 | Discover | ✅ Aprovado |

### Requisitos para Testes

1. **Dispositivo Apple** (iPhone, iPad ou Mac com Touch ID/Face ID)
2. **iOS 16+** ou **macOS 13+**
3. **Safari** (Apple Pay só funciona no Safari)
4. **Cartões configurados no Wallet** (use cartões de teste acima)

### Endpoints para Teste

```bash
# Obter client token
GET https://italosantos.com/api/payments/braintree/apple-pay

# Processar pagamento
POST https://italosantos.com/api/payments/braintree/apple-pay
{
  "paymentData": { ... },
  "amount": 10.00,
  "currency": "BRL",
  "description": "Assinatura Premium"
}
```

## 📊 Monitoramento

### Braintree Dashboard (Sandbox)
- URL: https://sandbox.braintreegateway.com/
- Navegue para **Transactions** para ver pagamentos processados
- Filtre por status: Authorized, Settled, Failed

### Logs do Servidor
```bash
npm run dev
# Procure por logs com emojis:
# 🔑 Gerando client token...
# 💳 Processando pagamento...
# ✅ Pagamento aprovado!
```

## 🔄 Migrar para Produção

Quando estiver pronto para produção:

1. **Obter credenciais de produção do Braintree**
2. **Atualizar `.env.local`:**
   ```bash
   BRAINTREE_ENV=production
   BRAINTREE_MERCHANT_ID=<production_merchant_id>
   BRAINTREE_PUBLIC_KEY=<production_public_key>
   BRAINTREE_PRIVATE_KEY=<production_private_key>
   APPLE_PAY_ENVIRONMENT=production
   ```
3. **Configurar domínio de produção no Braintree**
4. **Registrar Merchant ID de produção no Apple Developer**

## ⚠️ Troubleshooting

### Erro: "Apple Pay não disponível"
- ✅ Verifique se está usando Safari
- ✅ Verifique se tem cartões no Wallet
- ✅ Verifique se o dispositivo suporta Apple Pay

### Erro: "Falha na validação do merchant"
- ✅ Verifique se o domínio está registrado no Braintree
- ✅ Verifique se o arquivo de verificação está acessível
- ✅ Verifique se o Merchant ID está correto

### Erro: "Pagamento rejeitado"
- ✅ Use cartões de teste válidos no sandbox
- ✅ Verifique logs do servidor para detalhes
- ✅ Verifique se o valor está no formato correto (decimal com 2 casas)

## 📚 Documentação

- [Braintree Apple Pay Guide](https://developer.paypal.com/braintree/docs/guides/apple-pay/overview)
- [Apple Pay Web Guide](https://developer.apple.com/documentation/apple_pay_on_the_web)
- [Braintree Sandbox Testing](https://developer.paypal.com/braintree/docs/guides/credit-cards/testing-go-live/node)

## 🎯 Status da Configuração

- ✅ Variáveis de ambiente configuradas
- ✅ Arquivos de configuração criados
- ✅ API routes implementadas
- ✅ Hook React criado
- ⏳ Domínio precisa ser verificado no Braintree
- ⏳ Arquivo de verificação Apple Pay precisa ser colocado em `.well-known/`
- ⏳ Testar pagamento em dispositivo Apple real

## 🔗 Links Úteis

- **Braintree Sandbox:** https://sandbox.braintreegateway.com/
- **Apple Developer:** https://developer.apple.com/account/
- **PayPal Developer:** https://developer.paypal.com/braintree/
