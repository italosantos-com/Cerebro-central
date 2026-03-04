# 💳 Braintree Payment Integration - Apple Pay & Google Pay

## ✅ Implementação Completa

Integração completa do Braintree para processar pagamentos com **Apple Pay** e **Google Pay** no Next.js 14 (App Router).

> **🍎 Apple Pay Fix:** Se o botão Apple Pay não aparecer no Safari, veja [APPLE_PAY_SAFARI_FIX.md](./APPLE_PAY_SAFARI_FIX.md) para a solução com API nativa.

---

## 📦 Instalação de Dependências

```bash
# Parar servidor se estiver rodando (Ctrl+C)

# Instalar pacotes Braintree
npm install braintree braintree-web

# Reiniciar servidor
npm run dev
```

---

## 🔧 Configuração

### 1. Variáveis de Ambiente (`.env.local`)

Já foram adicionadas as seguintes variáveis:

```bash
# Braintree Credentials
BRAINTREE_MERCHANT_ID=75tzy2qyrkv9hfwj
BRAINTREE_PUBLIC_KEY=vkvp26rxfb4wd4qx
BRAINTREE_PRIVATE_KEY=7eefa5f69c77f009e83281a9491a6c4d
BRAINTREE_ENV=sandbox

# Google Pay (obter no painel Braintree)
NEXT_PUBLIC_GOOGLE_MERCHANT_ID=x

# Apple Pay domain
NEXT_PUBLIC_APPLE_PAY_DOMAIN=italosantos.com
```

⚠️ **IMPORTANTE:** Em produção, altere `BRAINTREE_ENV=production`

---

## 📁 Arquivos Criados

### API Routes (Backend)

| Arquivo | Descrição |
|---------|-----------|
| `/src/app/api/braintree/token/route.ts` | Gera client token para inicializar Braintree no cliente |
| `/src/app/api/braintree/validate-apple/route.ts` | Valida merchant Apple Pay |
| `/src/app/api/braintree/checkout/route.ts` | Processa pagamento com nonce |

### Componentes (Frontend)

| Arquivo | Descrição |
|---------|-----------|
| `/src/components/PaymentWallets.tsx` | Componente de pagamento com Apple Pay e Google Pay |
| `/src/app/checkout/page.tsx` | Página de exemplo de checkout |

---

## 🚀 Como Usar

### 1. Acesse a página de checkout

```
http://localhost:3000/checkout
```

### 2. Teste os botões de pagamento

- **Google Pay**: Funciona em Chrome/Edge com Google Pay configurado
- **Apple Pay**: Funciona em Safari (macOS/iOS) com Apple Pay configurado

### 3. Integrar em suas páginas

```tsx
import PaymentWallets from '@/components/PaymentWallets';

export default function MinhaPageDeCompra() {
  const [transactionId, setTransactionId] = useState<string | null>(null);

  function handleSuccess(txId: string) {
    console.log('Pagamento aprovado:', txId);
    setTransactionId(txId);
    // Atualizar banco de dados, enviar email, etc.
  }

  function handleError(error: string) {
    console.error('Erro no pagamento:', error);
    // Mostrar mensagem de erro ao usuário
  }

  return (
    <div>
      <h1>Finalizar Compra</h1>
      <PaymentWallets 
        amount={99.90} 
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

---

## 🎯 Fluxo de Pagamento

### Google Pay

```
1. Usuário clica "Pagar com Google Pay"
   ↓
2. GET /api/braintree/token → Obtém client token
   ↓
3. Braintree SDK inicializa Google Pay
   ↓
4. Google Pay Sheet aparece (usuário seleciona cartão)
   ↓
5. Google Pay retorna payment data
   ↓
6. Braintree tokeniza → gera nonce
   ↓
7. POST /api/braintree/checkout com nonce
   ↓
8. Braintree processa pagamento
   ↓
9. Retorna resultado (aprovado/recusado)
```

### Apple Pay

```
1. Usuário clica "Pagar com Apple Pay"
   ↓
2. GET /api/braintree/token → Obtém client token
   ↓
3. Braintree SDK inicializa Apple Pay
   ↓
4. ApplePaySession valida merchant
   ↓
5. POST /api/braintree/validate-apple → Valida merchant
   ↓
6. Apple Pay Sheet aparece (usuário autoriza)
   ↓
7. Apple Pay retorna payment token
   ↓
8. Braintree tokeniza → gera nonce
   ↓
9. POST /api/braintree/checkout com nonce
   ↓
10. Braintree processa pagamento
    ↓
11. Retorna resultado (aprovado/recusado)
```

---

## 🔐 Configuração no Painel Braintree

### 1. **Habilitar Apple Pay**

1. Acesse: https://sandbox.braintreegateway.com (ou production)
2. Vá em: **Settings** → **Processing**
3. Clique em **Apple Pay**
4. Adicione seu domínio: `italosantos.com`
5. Baixe o arquivo de verificação: `.well-known/apple-developer-merchantid-domain-association.txt`
6. Coloque na pasta `public/.well-known/`
7. Acesse: https://italosantos.com/.well-known/apple-developer-merchantid-domain-association.txt (deve retornar o arquivo)

### 2. **Habilitar Google Pay**

1. No painel Braintree: **Settings** → **Processing**
2. Clique em **Google Pay**
3. Habilite e obtenha o **Google Merchant ID**
4. Adicione no `.env.local`:
   ```bash
   NEXT_PUBLIC_GOOGLE_MERCHANT_ID=seu_google_merchant_id_aqui
   ```

### 3. **Configurar Webhooks (Opcional)**

Para receber notificações de mudanças de status:

1. Vá em: **Settings** → **Webhooks**
2. Adicione URL: `https://italosantos.com/api/braintree/webhook`
3. Selecione eventos: `transaction_settled`, `transaction_declined`, etc.

---

## 🧪 Testes

### Cartões de Teste (Sandbox)

| Cartão | Número | CVV | Resultado |
|--------|--------|-----|-----------|
| Visa | 4111111111111111 | 123 | Aprovado |
| Mastercard | 5555555555554444 | 123 | Aprovado |
| Amex | 378282246310005 | 1234 | Aprovado |
| Decline | 4000000000000002 | 123 | Recusado |

### Testar Google Pay (Sandbox)

1. Abra Chrome
2. Acesse: chrome://settings/payments
3. Adicione um cartão de teste
4. Vá para: http://localhost:3000/checkout
5. Clique em "Pagar com Google Pay"

### Testar Apple Pay (Sandbox)

1. Use Safari no macOS ou iOS
2. Configure Apple Pay nas configurações do sistema
3. Adicione um cartão de teste na Wallet
4. Acesse: http://localhost:3000/checkout
5. Clique em "Pagar com Apple Pay"

⚠️ **Apple Pay requer HTTPS!** Para testar localmente:
- Use `https://localhost:3000` (configure certificado SSL local)
- OU faça deploy em ambiente staging com HTTPS

---

## 🔒 Segurança

### ✅ Implementado

- **Tokenização**: Nonces são usados (nunca dados sensíveis do cartão)
- **Server-Side Processing**: Pagamentos processados no backend
- **Environment Variables**: Credenciais em `.env.local` (não commitadas)
- **HTTPS Required**: Apple Pay só funciona em HTTPS

### ⚠️ Recomendações Adicionais

1. **3D Secure**: Habilitar no painel Braintree para cartões europeus
2. **Rate Limiting**: Implementar limite de tentativas por IP
3. **Logs de Auditoria**: Salvar todas as transações no banco de dados
4. **Validação de Valores**: Validar `amount` no backend
5. **Webhooks**: Implementar para confirmar pagamentos assincronamente

---

## 📊 Logs e Debug

### Logs Implementados

O componente `PaymentWallets` e as API routes logam todas as ações:

```
[PaymentWallets] ✅ Client token obtido
[PaymentWallets] ✅ Cliente Braintree inicializado
[PaymentWallets] ✅ Google Pay inicializado
[PaymentWallets] ✅ Apple Pay suportado
[PaymentWallets] 💳 Processando pagamento...
[PaymentWallets] ✅ Pagamento aprovado: txn_12345
```

```
[Braintree Token] Gerando client token...
[Braintree Token] ✅ Token gerado com sucesso
[Braintree Checkout] Processando transação: { amount: '10.00', nonce: 'fake-valid...' }
[Braintree Checkout] ✅ Pagamento aprovado: txn_abc123
```

### Ver Logs no Console

**Frontend (Navegador):**
- Abra DevTools (F12)
- Vá em **Console**
- Veja logs do componente `PaymentWallets`

**Backend (Terminal):**
- Veja terminal onde `npm run dev` está rodando
- Logs das API routes aparecem ali

---

## 🐛 Troubleshooting

### ❌ "Google Pay não disponível"

**Causas:**
- Navegador não suporta (use Chrome/Edge)
- Google Pay não configurado no navegador
- `NEXT_PUBLIC_GOOGLE_MERCHANT_ID` não configurado

**Solução:**
```bash
# 1. Verificar variável
grep NEXT_PUBLIC_GOOGLE_MERCHANT_ID .env.local

# 2. Adicionar se não existir
echo "NEXT_PUBLIC_GOOGLE_MERCHANT_ID=seu_merchant_id" >> .env.local

# 3. Reiniciar servidor
npm run dev
```

### ❌ "Apple Pay não disponível"

**Causas:**
- Não está usando Safari
- Dispositivo não suporta Apple Pay
- Não está em HTTPS
- Domínio não registrado no Braintree

**Solução:**
1. Use Safari (macOS/iOS)
2. Acesse via HTTPS
3. Registre domínio no painel Braintree
4. Coloque arquivo de verificação em `public/.well-known/`

### ❌ "Erro ao gerar token"

**Causas:**
- Credenciais Braintree incorretas
- Ambiente (sandbox vs production) errado

**Solução:**
```bash
# Verificar credenciais
grep BRAINTREE .env.local

# Testar API manualmente
curl http://localhost:3000/api/braintree/token

# Deve retornar: {"success":true,"clientToken":"..."}
```

### ❌ "Pagamento recusado"

**Causas:**
- Cartão de teste inválido
- Valor muito baixo (< R$ 0,01)
- Conta Braintree suspensa

**Solução:**
1. Use cartões de teste válidos (ver tabela acima)
2. Valor mínimo: R$ 0,01
3. Verificar status da conta no painel Braintree

---

## 🔄 Migração para Produção

### Checklist

- [ ] Obter credenciais de produção no Braintree
- [ ] Atualizar `.env.local`:
  ```bash
  BRAINTREE_ENV=production
  BRAINTREE_MERCHANT_ID=seu_merchant_id_producao
  BRAINTREE_PUBLIC_KEY=sua_public_key_producao
  BRAINTREE_PRIVATE_KEY=sua_private_key_producao
  ```
- [ ] Configurar Apple Pay para domínio de produção
- [ ] Configurar Google Pay para merchant de produção
- [ ] Subir arquivo `.well-known/apple-developer-merchantid-domain-association.txt`
- [ ] Testar com cartões reais (pequenos valores)
- [ ] Configurar webhooks
- [ ] Implementar logs de auditoria
- [ ] Configurar 3D Secure (se necessário)
- [ ] Adicionar rate limiting
- [ ] Revisar políticas de privacidade e termos de uso

---

## 📚 Documentação Oficial

- **Braintree Docs**: https://developer.paypal.com/braintree/docs
- **Apple Pay Integration**: https://developer.paypal.com/braintree/docs/guides/apple-pay/overview
- **Google Pay Integration**: https://developer.paypal.com/braintree/docs/guides/google-pay/overview
- **Braintree SDK Reference**: https://braintree.github.io/braintree-web/current/

---

## 📞 Suporte

### Problemas com Braintree

- Suporte Braintree: https://developer.paypal.com/braintree/help
- Sandbox: https://sandbox.braintreegateway.com
- Production: https://braintreegateway.com

### Problemas com Implementação

1. Verificar logs no console (frontend e backend)
2. Testar endpoints da API manualmente:
   ```bash
   # Token
   curl http://localhost:3000/api/braintree/token
   
   # Checkout (teste)
   curl -X POST http://localhost:3000/api/braintree/checkout \
     -H "Content-Type: application/json" \
     -d '{"nonce":"fake-valid-nonce","amount":10.00}'
   ```
3. Consultar docs: `/docs/BRAINTREE_INTEGRATION.md` (este arquivo)

---

## ✅ Status

| Item | Status |
|------|--------|
| API Routes criadas | ✅ Completo |
| Componente PaymentWallets | ✅ Completo |
| Página de exemplo (checkout) | ✅ Completo |
| Credenciais configuradas | ✅ Completo |
| Dependências | ⚠️ Pendente instalação |
| Testes Sandbox | ⚠️ Aguardando instalação |
| Produção | ❌ Não configurado |

---

## 🚀 Próximos Passos

1. **Instalar dependências:**
   ```bash
   npm install braintree braintree-web
   ```

2. **Configurar Google Merchant ID:**
   - Obter no painel Braintree
   - Adicionar em `.env.local`

3. **Testar em Sandbox:**
   - Acessar http://localhost:3000/checkout
   - Testar Google Pay e Apple Pay

4. **Configurar Apple Pay:**
   - Registrar domínio no Braintree
   - Subir arquivo de verificação
   - Testar em Safari com HTTPS

5. **Integrar no fluxo de compra:**
   - Usar `<PaymentWallets />` nas páginas de checkout
   - Implementar lógica pós-pagamento (salvar no banco, enviar email, etc.)

---

**Criado:** 10 de outubro de 2025  
**Versão:** 1.0  
**Ambiente:** Sandbox  
**Status:** ✅ **PRONTO PARA INSTALAÇÃO**
