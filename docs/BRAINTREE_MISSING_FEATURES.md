# 📋 Checklist de Configuração Braintree - Itens Faltantes

## ✅ Já Implementado

- ✅ Apple Pay com API nativa (ApplePaySession)
- ✅ Google Pay com Braintree SDK
- ✅ Client token generation endpoint
- ✅ Merchant validation endpoint (Apple Pay)
- ✅ Checkout/payment processing endpoint
- ✅ Tokenization com Braintree
- ✅ Error handling completo
- ✅ Loading states
- ✅ Toast notifications
- ✅ CSE Key configurada

---

## ⚠️ Configurações Pendentes no Painel Braintree

### 1. **Registrar Domínio para Apple Pay** (CRÍTICO)

**Status:** ⚠️ Pendente

**Onde configurar:**
1. Acesse: https://sandbox.braintreegateway.com (ou production)
2. Clique no **ícone de engrenagem** (gear icon) no canto superior direito
3. Clique em **Account Settings** no menu dropdown
4. Role até a seção **Payment Methods**
5. Ao lado de **Apple Pay**, clique no link **Options**
6. Clique no botão **View Domain Names**
7. Na seção **Specify Your Domain Names**, insira: `italosantos.com`
8. Clique no botão **Add Domain Names**

**Arquivo de verificação:**
- Baixe: `apple-developer-merchantid-domain-association`
- Coloque em: `public/.well-known/apple-developer-merchantid-domain-association`
- Teste URL: `https://italosantos.com/.well-known/apple-developer-merchantid-domain-association`

---

### 2. **Obter Google Merchant ID** (IMPORTANTE)

**Status:** ⚠️ Pendente (atualmente usando placeholder)

**Onde configurar:**
1. Painel Braintree → **Settings** → **Processing**
2. Clique em **Google Pay**
3. Habilite e copie o **Google Merchant ID**
4. Atualize `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_MERCHANT_ID=BCR2DN4T5EXAMPLE
   ```

---

### 3. **Configurar Webhooks** (RECOMENDADO)

**Status:** ❌ Não implementado

**Por que é importante:**
- Receber notificações quando pagamentos são confirmados
- Processar pagamentos assíncronos (Local Payment Methods como iDEAL, SOFORT)
- Detectar disputas, chargebacks, reembolsos

**Onde configurar:**
1. Painel Braintree → **Settings** → **Webhooks**
2. Adicione URL: `https://italosantos.com/api/braintree/webhook`
3. Selecione eventos:
   - `transaction_settled` (pagamento confirmado)
   - `transaction_declined` (pagamento recusado)
   - `transaction_disbursed` (fundos transferidos)
   - `subscription_charged_successfully` (para assinaturas)
   - `local_payment_completed` (para iDEAL, SOFORT, etc.)

**Implementação necessária:**
```typescript
// /src/app/api/braintree/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import braintree from 'braintree';

const gateway = new braintree.BraintreeGateway({
    environment: process.env.BRAINTREE_ENV === 'production'
        ? braintree.Environment.Production
        : braintree.Environment.Sandbox,
    merchantId: process.env.BRAINTREE_MERCHANT_ID!,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY!,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY!,
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const params = new URLSearchParams(body);
        
        const btSignature = params.get('bt_signature');
        const btPayload = params.get('bt_payload');

        if (!btSignature || !btPayload) {
            return NextResponse.json(
                { error: 'Missing signature or payload' },
                { status: 400 }
            );
        }

        const webhookNotification = await gateway.webhookNotification.parse(
            btSignature,
            btPayload
        );

        console.log('[Webhook] Tipo:', webhookNotification.kind);
        console.log('[Webhook] Timestamp:', webhookNotification.timestamp);

        switch (webhookNotification.kind) {
            case 'transaction_settled':
                // Pagamento confirmado - atualizar banco de dados
                const transaction = webhookNotification.transaction;
                console.log('[Webhook] Transação confirmada:', transaction.id);
                // TODO: Atualizar status no banco de dados
                break;

            case 'transaction_declined':
                // Pagamento recusado
                console.log('[Webhook] Transação recusada:', webhookNotification.transaction?.id);
                break;

            case 'local_payment_completed':
                // Pagamento local (iDEAL, SOFORT) completado
                const localPayment = webhookNotification.localPaymentCompleted?.payment;
                console.log('[Webhook] Local Payment ID:', localPayment?.paymentId);
                // TODO: Processar pagamento local
                break;

            default:
                console.log('[Webhook] Evento não tratado:', webhookNotification.kind);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[Webhook] Erro:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}
```

---

## 🌍 Local Payment Methods (iDEAL, SOFORT, etc.) - NÃO IMPLEMENTADO

**Status:** ❌ Não implementado

**Métodos disponíveis:**
- iDEAL (Holanda)
- SOFORT (Alemanha, Áustria)
- Bancontact (Bélgica)
- MyBank (Itália)
- Przelewy24 (Polônia)
- EPS (Áustria)
- giropay (Alemanha)

**Quando implementar:**
- Se você vende para clientes europeus
- Requer suporte a webhooks (obrigatório)

**Implementação necessária:**
```typescript
// Adicionar ao PaymentWallets.tsx
import { useState } from 'react';

// Dentro do componente:
const [localPaymentInstance, setLocalPaymentInstance] = useState<any>(null);

// No useEffect, adicionar:
const braintreeLocalPayment = await import('braintree-web/local-payment');
const localInst = await braintreeLocalPayment.create({
    client: clientInst,
    merchantAccountId: process.env.BRAINTREE_MERCHANT_ID,
    redirectUrl: 'https://italosantos.com/payment-return'
});
setLocalPaymentInstance(localInst);

// Função para iniciar pagamento local:
async function handleLocalPayment(paymentType: 'ideal' | 'sofort' | 'bancontact') {
    if (!localPaymentInstance) return;

    try {
        await localPaymentInstance.startPayment({
            paymentType,
            amount: amount.toFixed(2),
            currencyCode: 'EUR',
            givenName: 'Cliente',
            surname: 'Nome',
            address: {
                countryCode: 'NL' // ou DE, BE, etc
            },
            fallback: {
                url: 'https://italosantos.com/payment-return',
                buttonText: 'Complete Payment'
            },
            onPaymentStart: function(data, start) {
                // CRÍTICO: Salvar data.paymentId no servidor
                console.log('Payment ID:', data.paymentId);
                // TODO: Salvar paymentId no banco de dados
                start();
            }
        }, function(err, payload) {
            if (err) {
                if (err.code === 'LOCAL_PAYMENT_POPUP_CLOSED') {
                    console.log('Usuário cancelou');
                } else {
                    console.error('Erro:', err);
                }
            } else {
                // Enviar nonce para servidor
                processPayment(payload.nonce);
            }
        });
    } catch (error) {
        console.error('Erro Local Payment:', error);
    }
}
```

**Página de retorno necessária:**
```typescript
// /src/app/payment-return/page.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentReturn() {
    const searchParams = useSearchParams();

    useEffect(() => {
        async function tokenizeLocalPayment() {
            // Carregar Braintree SDK
            const braintreeClient = await import('braintree-web/client');
            const braintreeLocalPayment = await import('braintree-web/local-payment');

            const clientToken = await fetch('/api/braintree/token').then(r => r.json());
            const client = await braintreeClient.create({ authorization: clientToken.clientToken });
            const localPaymentInstance = await braintreeLocalPayment.create({ client });

            if (localPaymentInstance.hasTokenizationParams()) {
                const payload = await localPaymentInstance.tokenize();
                // Enviar payload.nonce para servidor
                await fetch('/api/braintree/checkout', {
                    method: 'POST',
                    body: JSON.stringify({ nonce: payload.nonce, amount: '10.00' })
                });
            }
        }

        tokenizeLocalPayment();
    }, []);

    return <div>Processando pagamento...</div>;
}
```

---

## 🔐 3D Secure (Autenticação Extra) - NÃO IMPLEMENTADO

**Status:** ❌ Não implementado

**O que é:**
- Verificação adicional de segurança (senha/código)
- Obrigatório na Europa (PSD2/SCA)
- Reduz fraude e chargebacks

**Quando implementar:**
- Vendas para clientes europeus
- Transações de alto valor
- Reduzir fraude

**Implementação necessária:**
```typescript
// Adicionar ao PaymentWallets.tsx
const braintreeThreeDSecure = await import('braintree-web/three-d-secure');
const threeDSecureInstance = await braintreeThreeDSecure.create({
    client: clientInst,
    version: 2
});

// Ao processar pagamento:
const verificationData = await threeDSecureInstance.verifyCard({
    amount: amount.toFixed(2),
    nonce: originalNonce,
    bin: cardBin, // Primeiros 6 dígitos do cartão
    email: 'customer@example.com',
    billingAddress: {
        givenName: 'Nome',
        surname: 'Sobrenome',
        phoneNumber: '5511999999999',
        streetAddress: 'Rua Exemplo, 123',
        locality: 'São Paulo',
        region: 'SP',
        postalCode: '01000-000',
        countryCodeAlpha2: 'BR'
    },
    onLookupComplete: function(data, next) {
        // Lookup completado
        next();
    }
});

// Usar verificationData.nonce ao invés do nonce original
await processPayment(verificationData.nonce);
```

---

## 💳 Vault (Salvar Cartões) - NÃO IMPLEMENTADO

**Status:** ❌ Não implementado

**O que é:**
- Salvar métodos de pagamento do cliente
- Cobranças recorrentes sem re-inserir cartão
- Melhor experiência para clientes frequentes

**Quando implementar:**
- Assinaturas/pagamentos recorrentes
- Clientes frequentes
- One-click checkout

**Implementação necessária:**
```typescript
// No backend (/api/braintree/checkout):
const result = await gateway.transaction.sale({
    amount: '10.00',
    paymentMethodNonce: nonce,
    options: {
        storeInVaultOnSuccess: true // Salvar no vault
    },
    customer: {
        id: 'customer_123', // ID único do cliente
        email: 'customer@example.com'
    }
});

// Token do cartão salvo:
const paymentMethodToken = result.transaction.creditCard.token;

// Em compras futuras, usar token ao invés de nonce:
const result = await gateway.transaction.sale({
    amount: '20.00',
    paymentMethodToken: paymentMethodToken // Usar token salvo
});
```

---

## 🔄 Recurring Billing (Assinaturas) - NÃO IMPLEMENTADO

**Status:** ❌ Não implementado

**O que é:**
- Cobranças automáticas recorrentes
- Planos de assinatura (mensal/anual)
- Gerenciamento de ciclos de faturamento

**Quando implementar:**
- Modelo de negócio baseado em assinaturas
- Memberships
- SaaS

**Implementação necessária:**
```typescript
// Criar plano no Braintree (via painel ou API):
const plan = await gateway.plan.create({
    id: 'plano_premium',
    name: 'Premium',
    price: '29.90',
    billingFrequency: 1, // 1 mês
    currencyIsoCode: 'BRL'
});

// Criar assinatura:
const subscription = await gateway.subscription.create({
    paymentMethodToken: customerToken,
    planId: 'plano_premium',
    price: '29.90'
});

// Cancelar assinatura:
await gateway.subscription.cancel(subscription.id);
```

---

## 🛡️ Fraud Tools (Detecção de Fraude) - NÃO CONFIGURADO

**Status:** ❌ Não configurado

**Ferramentas disponíveis:**
- Braintree Advanced Fraud Tools
- Kount
- AVS (Address Verification Service)
- CVV verification

**Onde configurar:**
1. Painel Braintree → **Settings** → **Processing**
2. **Fraud Tools**
3. Habilitar regras:
   - Bloquear transações de países específicos
   - Limite de tentativas por IP
   - Verificação de CVV obrigatória
   - AVS obrigatório

---

## 📊 Relatórios e Analytics - NÃO IMPLEMENTADO

**Status:** ❌ Não implementado

**O que adicionar:**
- Logs de transações no banco de dados
- Dashboard de vendas
- Métricas de conversão
- Taxa de aprovação/recusa

**Implementação sugerida:**
```typescript
// Salvar transação no banco de dados após aprovação:
await prisma.transaction.create({
    data: {
        braintreeId: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        paymentMethod: transaction.paymentInstrumentType,
        customerId: userId,
        createdAt: transaction.createdAt,
        metadata: JSON.stringify(transaction)
    }
});
```

---

## 🧪 Testing Checklist

### ✅ Testes Já Possíveis

- ✅ Obter client token
- ✅ Inicializar Braintree client
- ✅ Tokenizar pagamento (nonce)
- ✅ Processar transação sandbox
- ✅ Error handling

### ⚠️ Testes Pendentes

- ⚠️ Apple Pay em Safari (requer domínio registrado + HTTPS)
- ⚠️ Google Pay em Chrome (requer Google Merchant ID válido)
- ⚠️ Webhooks (requer endpoint público + configuração)
- ⚠️ 3D Secure (não implementado)
- ⚠️ Local Payment Methods (não implementado)

---

## 🚀 Prioridades de Implementação

### ALTA PRIORIDADE (Fazer Agora)

1. **Registrar domínio Apple Pay no Braintree**
   - Tempo: 10 minutos
   - Impacto: Apple Pay funcionará no Safari

2. **Obter Google Merchant ID**
   - Tempo: 5 minutos
   - Impacto: Google Pay funcionará corretamente

3. **Adicionar arquivo de verificação Apple Pay**
   - Tempo: 2 minutos
   - Impacto: Domínio será verificado

### MÉDIA PRIORIDADE (Próximas 2 Semanas)

4. **Implementar webhooks**
   - Tempo: 1 hora
   - Impacto: Pagamentos assíncronos funcionarão

5. **Salvar transações no banco de dados**
   - Tempo: 2 horas
   - Impacto: Histórico e relatórios

6. **Adicionar 3D Secure (se vender para Europa)**
   - Tempo: 3 horas
   - Impacto: Compliance PSD2/SCA

### BAIXA PRIORIDADE (Opcional)

7. **Local Payment Methods (iDEAL, SOFORT)**
   - Tempo: 4 horas
   - Impacto: Vendas para Europa

8. **Vault (salvar cartões)**
   - Tempo: 2 horas
   - Impacto: Melhor UX para clientes recorrentes

9. **Recurring Billing**
   - Tempo: 5 horas
   - Impacto: Assinaturas automatizadas

---

## 📝 Comandos Úteis

### Testar Endpoint de Token
```bash
curl http://localhost:3000/api/braintree/token
```

### Testar Checkout com Nonce Fake
```bash
curl -X POST http://localhost:3000/api/braintree/checkout \
  -H "Content-Type: application/json" \
  -d '{"nonce":"fake-valid-nonce","amount":"10.00"}'
```

### Ver Logs do Servidor
```bash
npm run dev
# Terminal mostrará logs de [PaymentWallets] e [Braintree]
```

---

## 🎯 Resumo

### ✅ O Que Você Tem:
- Integração Apple Pay funcional (API nativa)
- Integração Google Pay funcional
- Backend Braintree completo
- Error handling robusto
- UI/UX pronta

### ⚠️ O Que Falta Para Produção:
1. Registrar domínio Apple Pay (5 min)
2. Obter Google Merchant ID (5 min)
3. Adicionar arquivo verificação (2 min)
4. Implementar webhooks (1 hora)
5. Migrar para credenciais de produção
6. Testar end-to-end

### 🚫 Recursos Não Implementados (Opcionais):
- Local Payment Methods (iDEAL, SOFORT)
- 3D Secure
- Vault (salvar cartões)
- Recurring Billing
- Fraud detection avançada

---

**Data:** 10 de outubro de 2025  
**Status:** 🟡 80% Completo - Faltam configurações do painel Braintree
