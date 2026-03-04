# Configuração dos Métodos de Pagamento

## 🎯 Visão Geral

Este sistema integra múltiplos métodos de pagamento:

- **Apple Pay** → via PayPal (cartões internacionais)
- **Google Pay** → via PayPal (cartões internacionais)
- **PIX** → via Mercado Pago (Brasil, instantâneo)
- **Cartões** → PayPal direto ou Mercado Pago

## 📋 Arquivos Criados

### Configuração
- `src/config/payment-methods.config.ts` - Configuração centralizada

### Hooks
- `src/hooks/useApplePayWithPayPal.ts` - Hook para Apple Pay
- `src/hooks/useGooglePayWithPayPal.ts` - Hook para Google Pay

### APIs
- `src/app/api/payments/apple-pay/validate-merchant/route.ts`
- `src/app/api/payments/apple-pay/process-paypal/route.ts`
- `src/app/api/payments/google-pay/process-paypal/route.ts`

### Componentes
- `src/components/UnifiedPaymentButtons.tsx` - Botões unificados

## ⚙️ Variáveis de Ambiente Necessárias

Adicione ao seu `.env.local`:

```env
# PayPal (Gateway para Apple Pay e Google Pay)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_PAYPAL_MODE=sandbox # ou 'live'

# Apple Pay
NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID=merchant.your-domain.com
NEXT_PUBLIC_APPLE_PAY_MERCHANT_NAME="Studio VIP"
APPLE_PAY_MERCHANT_CERT_PATH=./certs/merchant_id.pem
APPLE_PAY_MERCHANT_KEY_PATH=./certs/merchant_id.key

# Google Pay
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=your_merchant_id
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME="Studio VIP"

# Mercado Pago (PIX)
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=your_public_key
MERCADOPAGO_ACCESS_TOKEN=your_access_token

# Base URL
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 🚀 Como Usar

### 1. Importar o Componente

```tsx
import UnifiedPaymentButtons from '@/components/UnifiedPaymentButtons';

export default function CheckoutPage() {
  const handlePaymentSuccess = (payment: any) => {
    console.log('Pagamento aprovado:', payment);
    // Redirecionar para página de sucesso
  };

  return (
    <div>
      <h1>Checkout</h1>
      <UnifiedPaymentButtons
        amount="99.00"
        currency="USD"
        onPaymentSuccess={handlePaymentSuccess}
        showPixOption={true}
      />
    </div>
  );
}
```

### 2. Validar Configuração

```typescript
import { validatePaymentConfig } from '@/config/payment-methods.config';

const validation = validatePaymentConfig();
if (!validation.valid) {
  console.error('Erros de configuração:', validation.errors);
}
```

### 3. Verificar Disponibilidade

```typescript
import { checkPaymentMethodAvailability } from '@/config/payment-methods.config';

const available = await checkPaymentMethodAvailability();
console.log('Métodos disponíveis:', available);
```

## 📱 Fluxo de Pagamento

### Apple Pay via PayPal
1. Usuário clica em "Pagar com Apple Pay"
2. Sistema cria ordem no PayPal
3. Apple Pay valida merchant
4. Usuário autoriza pagamento
5. Token é enviado ao PayPal
6. PayPal processa e captura pagamento
7. Confirmação ao usuário

### Google Pay via PayPal
1. Usuário clica em "Pagar com Google Pay"
2. Sistema cria ordem no PayPal
3. Google Pay exibe opções de cartão
4. Usuário seleciona e autoriza
5. Token é enviado ao PayPal
6. PayPal processa e captura pagamento
7. Confirmação ao usuário

### PIX via Mercado Pago
1. Usuário clica em "Pagar com PIX"
2. Sistema gera QR Code via Mercado Pago
3. Usuário escaneia ou copia código
4. Pagamento é processado instantaneamente
5. Webhook confirma pagamento
6. Confirmação ao usuário

## 🔐 Certificados Apple Pay (Produção)

Para produção, você precisa:

1. Criar Merchant ID no Apple Developer
2. Gerar Certificate Signing Request (CSR)
3. Baixar certificado e convertê-lo
4. Configurar domínio verificado

Comandos para converter certificado:
```bash
# Converter .cer para .pem
openssl x509 -inform der -in merchant_id.cer -out merchant_id.pem

# Converter .p12 para .key
openssl pkcs12 -in merchant_id.p12 -nocerts -out merchant_id.key -nodes
```

## 🧪 Testes

### Testar Apple Pay (Sandbox)
- Use iPhone/iPad ou Safari no Mac
- Configure cartão de teste no Wallet
- Certifique-se de estar em HTTPS

### Testar Google Pay (Test)
- Use cartões de teste do Google Pay
- Ambiente TEST detecta automaticamente
- Funciona em Chrome e Edge

### Testar PIX
- Use valores de teste do Mercado Pago
- Sandbox retorna QR Code simulado
- Webhook pode ser testado localmente com ngrok

## ⚠️ Troubleshooting

### Apple Pay não aparece
- Verifique se está em HTTPS
- Confirme APPLE_PAY_MERCHANT_ID
- Teste em dispositivo/navegador compatível

### Google Pay não aparece
- Verifique GOOGLE_PAY_MERCHANT_ID
- Confirme que está em Chrome/Edge
- Verifique console para erros

### Erro ao processar via PayPal
- Confirme PAYPAL_CLIENT_ID e SECRET
- Verifique se ordem foi criada
- Veja logs do PayPal

### PIX não gera QR Code
- Verifique MERCADOPAGO_ACCESS_TOKEN
- Confirme CPF válido
- Veja resposta da API

## 📊 Logs e Monitoramento

Os logs importantes estão em:
- Console do navegador (client-side)
- Terminal do servidor (server-side)
- PayPal Dashboard (transações)
- Mercado Pago Dashboard (PIX)

## 🔄 Webhooks

Configure webhooks para receber confirmações:

**PayPal:** `/api/webhook/paypal`
**Mercado Pago:** `/api/webhook/mercadopago`

## 📚 Recursos Adicionais

- [PayPal Developer Docs](https://developer.paypal.com/docs/)
- [Apple Pay JS API](https://developer.apple.com/documentation/apple_pay_on_the_web)
- [Google Pay Web Integration](https://developers.google.com/pay/api/web)
- [Mercado Pago API](https://www.mercadopago.com.br/developers)

---

**Pronto para produção após configurar certificados e chaves de API!** 🚀
