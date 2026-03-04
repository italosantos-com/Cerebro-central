# 🔍 RELATÓRIO DE AUDITORIA - APPLE PAY

**Data:** 12 de novembro de 2025  
**Objetivo:** Verificar configuração e implementação do Apple Pay com PayPal/Braintree como gateway em modo de produção

---

## 📋 RESUMO EXECUTIVO

### ❌ PROBLEMAS CRÍTICOS ENCONTRADOS

1. **Botão Apple Pay NÃO está implementado na página da loja (`/src/app/loja/page.tsx`)**
2. **Certificados Apple Pay AUSENTES** (apple-pay-cert.pem e apple-pay-key.pem não existem em `/certs`)
3. **Credenciais Braintree NÃO configuradas** nos arquivos `.env`
4. **Componente Apple Pay Modal está INCOMPLETO** - apenas mockup visual sem integração real

---

## 🔍 ANÁLISE DETALHADA

### 1. ✅ Componentes Encontrados

#### A. ApplePayButton Component
- **Localização:** `/src/components/payments/ApplePayButton.tsx`
- **Status:** ✅ Implementado e funcional
- **Recursos:**
  - Verificação de disponibilidade do Apple Pay
  - PaymentRequest API completa
  - Validação de merchant
  - Suporte a pagamentos recorrentes
  - Handlers para mudança de endereço e frete
  - Integração com APIs `/api/payments/apple-pay/*`

#### B. ApplePayPaymentModal
- **Localização:** `/src/components/applepay-payment-modal.tsx`
- **Status:** ❌ INCOMPLETO
- **Problemas:**
  - É apenas um modal visual estático
  - Não tem integração com PaymentRequest API
  - Não processa pagamentos reais
  - Apenas chama `onPaymentSuccess()` sem validação

#### C. APIs Backend
**Localização:** `/src/app/api/payments/apple-pay/`
- ✅ `validate-merchant/route.ts` - Implementado
- ✅ `process/route.ts` - Implementado
- ⚠️ Dependem de certificados que NÃO existem

#### D. Braintree Gateway
- **Localização:** `/src/lib/braintree-gateway.ts`
- **Status:** ✅ Código implementado
- **Problema:** ❌ Credenciais NÃO configuradas

---

### 2. ❌ Problemas na Página da Loja

**Arquivo:** `/src/app/loja/page.tsx`

```tsx
// ❌ AUSENTE: Não há importação do ApplePayButton
// ❌ AUSENTE: Não há ApplePayPaymentModal funcional
// ✅ PRESENTE: Apenas PayPalButtons
```

**O que está implementado:**
- ✅ PayPal Buttons com PayPalScriptProvider
- ✅ Grid de produtos
- ✅ Feed Instagram
- ✅ Feed Facebook

**O que está FALTANDO:**
- ❌ Botão Apple Pay ao lado do PayPal
- ❌ Integração com Braintree Drop-in
- ❌ Lógica para processar pagamento Apple Pay

---

### 3. ❌ Configurações de Ambiente

#### A. Variáveis Apple Pay
**Arquivo:** `.env.private`

```bash
# ✅ Configuradas
APPLE_PAY_ENVIRONMENT=production
APPLE_PAY_DEBUG=false
APPLE_PAY_SIMULATE=false
APPLE_PAY_VALIDATION_TIMEOUT=10000

# ❌ AUSENTES - Críticas
APPLE_PAY_MERCHANT_ID=❌ NÃO CONFIGURADO
APPLE_PAY_DOMAIN_NAME=❌ NÃO CONFIGURADO (fallback: italosantos.com)
APPLE_PAY_DISPLAY_NAME=❌ NÃO CONFIGURADO (fallback: Italo Santos)
NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID=❌ NÃO CONFIGURADO
```

#### B. Variáveis Braintree
```bash
# ❌ COMPLETAMENTE AUSENTES
BRAINTREE_MERCHANT_ID=❌ NÃO CONFIGURADO
BRAINTREE_PUBLIC_KEY=❌ NÃO CONFIGURADO
BRAINTREE_PRIVATE_KEY=❌ NÃO CONFIGURADO
BRAINTREE_ENV=production ✅ (mas sem credenciais)
```

---

### 4. ❌ Certificados Apple Pay

**Diretório esperado:** `/certs/`
**Status:** ❌ Diretório NÃO existe

**Arquivos necessários:**
- ❌ `apple-pay-cert.pem` - Certificado de Merchant
- ❌ `apple-pay-key.pem` - Chave privada

**Impacto:**
- API `/api/payments/apple-pay/validate-merchant` falhará
- Impossível validar com servidores Apple Pay
- Botão Apple Pay não funcionará mesmo se implementado

---

## 🛠️ O QUE PRECISA SER FEITO

### PRIORIDADE CRÍTICA 🔴

#### 1. Obter Credenciais Braintree
```bash
# Necessário cadastrar em: https://www.braintreegateway.com/
BRAINTREE_MERCHANT_ID=seu_merchant_id
BRAINTREE_PUBLIC_KEY=sua_public_key
BRAINTREE_PRIVATE_KEY=sua_private_key
```

#### 2. Obter Certificados Apple Pay
**Processo:**
1. Criar Apple Developer Account
2. Criar Merchant ID (ex: `merchant.com.italosantos.payments`)
3. Criar Payment Processing Certificate
4. Gerar CSR (Certificate Signing Request)
5. Download certificados (.cer)
6. Converter para .pem:
   ```bash
   # Certificado
   openssl x509 -inform der -in merchant_id.cer -out apple-pay-cert.pem
   
   # Chave privada
   openssl rsa -in merchant_id.key -out apple-pay-key.pem
   ```
7. Colocar em `/certs/`

#### 3. Configurar Merchant ID
```bash
# .env.private
APPLE_PAY_MERCHANT_ID=merchant.com.italosantos.payments
APPLE_PAY_DOMAIN_NAME=italosantos.com
APPLE_PAY_DISPLAY_NAME=Italo Santos

# .env.public (variáveis públicas)
NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID=merchant.com.italosantos.payments
```

#### 4. Verificar Domínio na Apple
1. Baixar arquivo de verificação da Apple
2. Hospedar em `https://italosantos.com/.well-known/apple-developer-merchantid-domain-association`
3. Registrar domínio no Apple Developer Portal

---

### PRIORIDADE ALTA 🟡

#### 5. Implementar Apple Pay na Página Loja

**Arquivo:** `/src/app/loja/page.tsx`

```tsx
// Adicionar import
import ApplePayButton from '@/components/payments/ApplePayButton';

// Dentro do CardFooter de cada produto, adicionar:
<div className="space-y-2">
  {/* PayPal existente */}
  <PayPalButtons ... />
  
  {/* Novo: Apple Pay */}
  <ApplePayButton
    amount={product.price.toFixed(2)}
    currency="BRL"
    countryCode="BR"
    merchantId={process.env.NEXT_PUBLIC_APPLE_PAY_MERCHANT_ID || ''}
    onPaymentSuccess={async (response) => {
      await handlePurchaseSuccess(product.id, {
        paymentMethod: 'apple_pay',
        transactionId: response.transactionIdentifier
      });
    }}
    onPaymentError={(error) => {
      toast({
        variant: "destructive",
        title: "Erro Apple Pay",
        description: error.message
      });
    }}
    buttonStyle="black"
    buttonType="buy"
    className="w-full"
  />
</div>
```

#### 6. Integrar Braintree com Apple Pay

**Criar:** `/src/components/payments/BraintreeApplePayButton.tsx`

```tsx
import { useEffect, useState } from 'react';
import braintree from 'braintree-web';

const BraintreeApplePayButton = ({ amount, onSuccess }) => {
  const [applePayInstance, setApplePayInstance] = useState(null);
  
  useEffect(() => {
    async function initializeBraintree() {
      // 1. Obter client token
      const response = await fetch('/api/braintree/token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      const { clientToken } = await response.json();
      
      // 2. Criar client instance
      const clientInstance = await braintree.client.create({
        authorization: clientToken
      });
      
      // 3. Criar Apple Pay instance
      const applePayInstance = await braintree.applePay.create({
        client: clientInstance
      });
      
      setApplePayInstance(applePayInstance);
    }
    
    initializeBraintree();
  }, []);
  
  const handlePayment = async () => {
    // Usar Braintree Apple Pay API
    const paymentRequest = applePayInstance.createPaymentRequest({
      total: {
        label: 'Produto',
        amount: amount
      },
      requiredBillingContactFields: ['postalAddress']
    });
    
    const session = new ApplePaySession(3, paymentRequest);
    
    session.onvalidatemerchant = async (event) => {
      const merchantSession = await applePayInstance.performValidation({
        validationURL: event.validationURL,
        displayName: 'Italo Santos'
      });
      session.completeMerchantValidation(merchantSession);
    };
    
    session.onpaymentauthorized = async (event) => {
      const payload = await applePayInstance.tokenize({
        token: event.payment.token
      });
      
      // Processar com Braintree
      const result = await fetch('/api/braintree/checkout', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethodNonce: payload.nonce,
          amount: amount
        })
      });
      
      if (result.success) {
        session.completePayment(ApplePaySession.STATUS_SUCCESS);
        onSuccess(result);
      } else {
        session.completePayment(ApplePaySession.STATUS_FAILURE);
      }
    };
    
    session.begin();
  };
  
  return (
    <button
      onClick={handlePayment}
      className="apple-pay-button apple-pay-button-black"
      style={{ WebkitAppearance: '-apple-pay-button' }}
    />
  );
};
```

---

### PRIORIDADE MÉDIA 🟢

#### 7. Criar Página de Teste
**Arquivo:** `/src/app/teste-apple-pay/page.tsx`

Usar como modelo: `/src/app/demo/apple-pay/page.tsx` (já existe)

#### 8. Adicionar Logs e Monitoramento
```typescript
// Em cada endpoint Apple Pay, adicionar:
console.log('[Apple Pay] Validação iniciada', { validationURL, merchantId });
console.log('[Apple Pay] Pagamento processado', { amount, transactionId });
```

#### 9. Testar em Ambiente Sandbox
Antes de produção:
1. Usar `BRAINTREE_ENV=sandbox`
2. Usar `APPLE_PAY_ENVIRONMENT=sandbox`
3. Testar com cartões de teste

---

## 📊 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Configuração (Crítico)
- [ ] Obter conta Braintree (https://www.braintreegateway.com/)
- [ ] Obter credenciais Braintree (Merchant ID, Public Key, Private Key)
- [ ] Adicionar credenciais ao `.env.private`
- [ ] Criar Apple Developer Account
- [ ] Criar Merchant ID na Apple
- [ ] Gerar certificados Apple Pay
- [ ] Converter certificados para .pem
- [ ] Criar diretório `/certs/` e adicionar certificados
- [ ] Verificar domínio italosantos.com na Apple
- [ ] Configurar variáveis APPLE_PAY_* no .env

### Fase 2: Implementação (Alto)
- [ ] Adicionar ApplePayButton em `/src/app/loja/page.tsx`
- [ ] Criar componente BraintreeApplePayButton
- [ ] Atualizar handlePurchaseSuccess para suportar Apple Pay
- [ ] Adicionar fallback visual caso Apple Pay não disponível
- [ ] Testar integração Braintree + Apple Pay

### Fase 3: Testes (Médio)
- [ ] Testar em Safari (Mac/iPhone)
- [ ] Testar validação de merchant
- [ ] Testar processamento de pagamento
- [ ] Testar salvamento de transação no Firestore
- [ ] Verificar atualização de status do usuário
- [ ] Testar cenários de erro

### Fase 4: Produção (Baixo)
- [ ] Migrar para `BRAINTREE_ENV=production`
- [ ] Migrar para `APPLE_PAY_ENVIRONMENT=production`
- [ ] Adicionar monitoramento de erros
- [ ] Configurar webhook Braintree
- [ ] Documentar processo para equipe

---

## 🚨 OBSERVAÇÕES IMPORTANTES

### Compatibilidade
- Apple Pay funciona APENAS em:
  - Safari (Mac/iPhone/iPad)
  - Apps nativos iOS/macOS
  - Chrome/Edge em dispositivos Apple com Apple Pay habilitado
  
### Requisitos Técnicos
- Domínio deve usar HTTPS (✅ italosantos.com já usa)
- Certificados devem ser renovados periodicamente
- Braintree cobra taxas por transação (verificar pricing)

### Limitações Atuais
- ❌ Não funcionará até certificados serem configurados
- ❌ Não funcionará até credenciais Braintree serem adicionadas
- ⚠️ Modal atual (`applepay-payment-modal.tsx`) é apenas visual

### Alternativas Temporárias
Enquanto Apple Pay não está configurado:
- ✅ PayPal está funcionando
- ✅ Google Pay pode ser adicionado (mais simples que Apple Pay)
- ✅ Pix já existe como opção

---

## 💰 CUSTOS ESTIMADOS

### Apple Developer Program
- **$99/ano** - Necessário para criar Merchant ID

### Braintree Fees
- **2.9% + $0.30 por transação** (cartões de crédito)
- **Grátis** para PayPal (já está usando)
- Sem taxa mensal fixa

### Tempo de Implementação
- Configuração: **2-4 horas**
- Desenvolvimento: **4-8 horas**
- Testes: **2-4 horas**
- **Total: 8-16 horas** (1-2 dias úteis)

---

## 📝 CONCLUSÃO

**Status Atual:** ❌ **APPLE PAY NÃO ESTÁ FUNCIONAL**

**Motivos:**
1. Certificados ausentes
2. Credenciais Braintree não configuradas
3. Botão não implementado na página da loja
4. Domínio não verificado com Apple

**Próximo Passo Recomendado:**
1. Obter credenciais Braintree (1-2 dias)
2. Criar conta Apple Developer ($99)
3. Gerar e configurar certificados (2-3 horas)
4. Implementar botão na página loja (2-4 horas)

**Alternativa Imediata:**
Implementar Google Pay (mais simples, sem certificados, já tem merchant ID configurado)

---

**Relatório gerado por:** GitHub Copilot  
**Última atualização:** 12/11/2025
