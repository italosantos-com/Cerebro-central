# 🚀 Guia Rápido - Ativar Apple Pay e Google Pay

## ⏱️ Tempo Total: ~15 minutos

---

## 1️⃣ Registrar Domínio Apple Pay (5 min)

### Passo 1: Acessar Painel Braintree
```
https://sandbox.braintreegateway.com
```
(Ou https://www.braintreegateway.com para produção)

### Passo 2: Configurar Domínio
1. Clique no **ícone de engrenagem ⚙️** (canto superior direito)
2. Clique em **Account Settings**
3. Role até **Payment Methods**
4. Ao lado de **Apple Pay**, clique em **Options**
5. Clique em **View Domain Names**
6. Digite: `italosantos.com`
7. Clique em **Add Domain Names**

### Passo 3: Baixar Arquivo de Verificação
1. Clique em **Download** ao lado do domínio
2. Arquivo: `apple-developer-merchantid-domain-association`

### Passo 4: Adicionar ao Projeto
```bash
# Criar diretório
mkdir -p public/.well-known

# Mover arquivo baixado
mv ~/Downloads/apple-developer-merchantid-domain-association public/.well-known/

# Verificar
ls -la public/.well-known/
```

### Passo 5: Fazer Deploy
```bash
# Commit e push
git add public/.well-known/
git commit -m "Add Apple Pay domain verification file"
git push

# OU se estiver usando Vercel/Netlify, fazer deploy manual
```

### Passo 6: Verificar no Braintree
- Volte ao painel Braintree
- Status do domínio deve mudar para **✅ Verified**
- Pode levar alguns minutos

---

## 2️⃣ Obter Google Merchant ID (5 min)

### Passo 1: Acessar Configurações Google Pay
1. Painel Braintree → **Settings** → **Processing**
2. Clique em **Google Pay**
3. Se não estiver habilitado, clique em **Enable Google Pay**

### Passo 2: Copiar Merchant ID
- Copie o **Google Merchant ID** (formato: `BCR2DN4TXYZ...`)

### Passo 3: Atualizar .env.local
```bash
# Abrir arquivo
nano .env.local

# Encontrar linha:
NEXT_PUBLIC_GOOGLE_MERCHANT_ID=your_google_merchant_id_here

# Substituir por:
NEXT_PUBLIC_GOOGLE_MERCHANT_ID=BCR2DN4TXYZ... # Cole o ID real

# Salvar: Ctrl+O, Enter, Ctrl+X
```

### Passo 4: Reiniciar Servidor
```bash
# Parar servidor (Ctrl+C)

# Reiniciar
npm run dev
```

---

## 3️⃣ Configurar Webhooks (5 min - OPCIONAL)

### Por que?
- Receber notificações de pagamentos completados
- Essencial para Local Payment Methods (iDEAL, SOFORT)
- Detectar chargebacks e disputas

### Passo 1: Criar Endpoint
Arquivo já criado: `/src/app/api/braintree/webhook/route.ts` (ver BRAINTREE_MISSING_FEATURES.md)

### Passo 2: Configurar no Braintree
1. Painel Braintree → **Settings** → **Webhooks**
2. Clique em **New Webhook**
3. **Destination URL:** `https://italosantos.com/api/braintree/webhook`
4. Selecione eventos:
   - ✅ `transaction_settled`
   - ✅ `transaction_declined`
   - ✅ `local_payment_completed`
   - ✅ `dispute_opened`
5. Clique em **Create Webhook**

### Passo 3: Testar
1. Fazer uma transação de teste
2. Verificar logs do servidor:
   ```bash
   npm run dev
   # Aguardar webhook ser recebido
   ```

---

## 4️⃣ Testar Apple Pay

### Requisitos:
- ✅ Safari browser (macOS/iOS)
- ✅ Apple Pay configurado no dispositivo
- ✅ HTTPS (use ngrok para teste local)

### Teste Local com ngrok:
```bash
# Instalar ngrok (se não tiver)
brew install ngrok

# Criar tunnel HTTPS
ngrok http 3000

# Copiar URL (ex: https://abc123.ngrok-free.app)
```

### Atualizar .env.local:
```bash
NEXT_PUBLIC_APPLE_PAY_DOMAIN=abc123.ngrok-free.app
```

### Registrar domínio ngrok no Braintree:
1. Repetir passos do item 1️⃣
2. Usar domínio ngrok ao invés de italosantos.com

### Acessar Checkout:
```
https://abc123.ngrok-free.app/checkout
```

### Verificar Botão:
- ✅ Botão "Pagar com Apple Pay" deve aparecer
- ✅ Ao clicar, abre Apple Pay sheet
- ✅ Após autorizar, pagamento é processado

---

## 5️⃣ Testar Google Pay

### Requisitos:
- ✅ Chrome/Edge browser
- ✅ Google Pay configurado

### Adicionar Cartão de Teste:
1. Chrome → **Settings** → **Payment methods**
2. Adicionar cartão:
   - **Número:** 4111 1111 1111 1111
   - **CVV:** 123
   - **Validade:** 12/25

### Acessar Checkout:
```
http://localhost:3000/checkout
```

### Verificar Botão:
- ✅ Botão "Pagar com Google Pay" deve aparecer
- ✅ Ao clicar, abre Google Pay sheet
- ✅ Após confirmar, pagamento é processado

---

## 6️⃣ Verificar Logs

### Console do Navegador (F12):
```
[PaymentWallets] ✅ Client token obtido
[PaymentWallets] ✅ Cliente Braintree inicializado
[PaymentWallets] ✅ Apple Pay suportado (API nativa)
[PaymentWallets] ✅ Google Pay inicializado
```

### Terminal do Servidor:
```
[Braintree Token] ✅ Token gerado com sucesso
[Apple Pay] Validando merchant para URL: https://...
[Apple Pay] ✅ Merchant validado com sucesso
[Braintree Checkout] ✅ Pagamento aprovado: txn_xyz123
```

---

## ✅ Checklist Final

### Apple Pay:
- [ ] Domínio registrado no Braintree
- [ ] Arquivo de verificação em `public/.well-known/`
- [ ] Domínio verificado (status verde no Braintree)
- [ ] HTTPS habilitado (ngrok ou produção)
- [ ] Testado em Safari
- [ ] Botão aparece e funciona

### Google Pay:
- [ ] Google Merchant ID obtido
- [ ] `.env.local` atualizado com Merchant ID
- [ ] Servidor reiniciado
- [ ] Testado em Chrome
- [ ] Botão aparece e funciona

### Webhooks (Opcional):
- [ ] Endpoint criado
- [ ] URL configurada no Braintree
- [ ] Eventos selecionados
- [ ] Testado com transação

---

## 🐛 Troubleshooting Rápido

### Apple Pay não aparece:
```bash
# 1. Verificar ApplePaySession no console do Safari
ApplePaySession

# 2. Verificar se está em HTTPS
window.location.protocol # deve retornar "https:"

# 3. Ver logs
[PaymentWallets] ✅ Apple Pay suportado (API nativa)
# Se não aparecer, ApplePaySession não está disponível
```

### Google Pay não aparece:
```bash
# 1. Verificar Merchant ID
grep NEXT_PUBLIC_GOOGLE_MERCHANT_ID .env.local

# 2. Verificar se Google Pay API carregou
window.google.payments.api

# 3. Reiniciar servidor
npm run dev
```

### Pagamento recusado:
```bash
# 1. Ver logs do servidor
[Braintree Checkout] ❌ Transação recusada: ...

# 2. Usar cartões de teste válidos
# Visa: 4111111111111111
# Mastercard: 5555555555554444

# 3. Verificar valor mínimo (R$ 0.01)
```

---

## 📞 Suporte

### Braintree Support:
- Docs: https://developer.paypal.com/braintree/docs
- Help: https://developer.paypal.com/braintree/help
- Sandbox: https://sandbox.braintreegateway.com

### Documentação Interna:
- `/docs/BRAINTREE_INTEGRATION.md` - Guia completo
- `/docs/APPLE_PAY_SAFARI_FIX.md` - Fix Apple Pay Safari
- `/docs/BRAINTREE_MISSING_FEATURES.md` - Features faltando

---

**Tempo Total:** ~15 minutos  
**Dificuldade:** ⭐⭐☆☆☆ (Fácil)  
**Status:** Pronto para uso após configuração
