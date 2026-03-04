# Correção Completa do Google Pay - CSP e OR_BIBED_06

## 🔧 Problemas Identificados e Corrigidos

### 1. **CSP (Content Security Policy) Bloqueando Scripts**
- **Problema**: CSP estava bloqueando `play.google.com` e outros domínios
- **Solução**: Adicionado `https://apis.google.com` e `https://play.google.com` ao CSP

### 2. **Merchant ID Inválido para Teste**
- **Problema**: Usando merchant ID real em ambiente de teste
- **Solução**: Usar `01234567890123456789` para teste

### 3. **Gateway Incompatível**
- **Problema**: Gateway `googlepay` não reconhecido
- **Solução**: Voltar para `example` em ambiente de teste

## ✅ Configuração Corrigida

### Arquivo `.env.local` (ATUALIZADO):
```env
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=BCR2DN4T6OKKN3DX
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME=Italo Santos
NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT=TEST
```

### Mudanças Aplicadas:

1. **CSP Atualizado**: Permitido todos os domínios necessários do Google Pay
2. **Merchant ID de Teste**: Usa `01234567890123456789` quando `ENVIRONMENT=TEST`
3. **Gateway de Exemplo**: Usa `example` para testes
4. **Logs Melhorados**: Mais informações de debug

## 🚀 Como Testar Agora

### 1. **Reinicie o servidor**:
```bash
npm run dev
```

### 2. **Use HTTPS** (escolha uma opção):

**Opção A - ngrok (Recomendado)**:
```bash
# Terminal 1: npm run dev
# Terminal 2: ngrok http 3000
# Use a URL HTTPS do ngrok
```

**Opção B - Deploy no Firebase**:
```bash
npm run build
firebase deploy --only hosting
# Use https://YOUR_FIREBASE_PROJECT_ID.web.app/
```

### 3. **Verificar no Console**:
- Abra F12 → Console
- Deve aparecer: `Google Pay API carregada com sucesso`
- Não deve ter erros de CSP
- Não deve ter `OR_BIBED_06`

## 🔍 Verificações de Funcionamento

### 1. **Console do Navegador**:
```javascript
// Verificar se Google Pay está disponível
console.log('Google Pay:', window.google?.payments?.api);

// Verificar configuração
console.log('Environment:', process.env.NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT);
```

### 2. **Logs Esperados**:
```
✅ Google Pay API carregada com sucesso
🔔 [GOOGLE PAY] Processando pagamento direto:
✅ [GOOGLE PAY] Pagamento aprovado pelo usuário
```

### 3. **Sem Erros**:
- ❌ Não deve aparecer `OR_BIBED_06`
- ❌ Não deve aparecer erros de CSP
- ❌ Não deve aparecer `net::ERR_BLOCKED_BY_CLIENT`

## 🧪 Teste com Cartões

Em ambiente `TEST`, use:
- **Visa**: 4111 1111 1111 1111
- **Mastercard**: 5555 5555 5555 4444
- **CVV**: Qualquer (123)
- **Data**: Qualquer futura (12/25)

## 📱 Teste em Dispositivos

### Desktop:
- Chrome/Edge: Simula Google Pay
- Firefox: Pode não funcionar (limitação do browser)

### Mobile:
- Android: Google Pay nativo
- iOS: Fallback para cartão web

## 🔄 Se Ainda Não Funcionar

### 1. **Limpe o Cache**:
```bash
# Navegador: Ctrl+Shift+R
# Ou modo incógnito
```

### 2. **Verifique Variáveis**:
```javascript
// No console
console.log({
  merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID,
  environment: process.env.NEXT_PUBLIC_GOOGLE_PAY_ENVIRONMENT,
  merchantName: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_NAME
});
```

### 3. **Teste Básico**:
```javascript
// No console, após carregar a página
const client = new google.payments.api.PaymentsClient({environment: 'TEST'});
console.log('Client criado:', client);
```

## 🎯 Próximos Passos

1. **✅ Teste Local**: Deve funcionar agora
2. **🚀 Deploy**: Teste em produção
3. **🔧 Produção**: Mude `ENVIRONMENT=PRODUCTION` quando pronto
4. **💳 Gateway Real**: Configure Stripe/outro quando necessário

## 📞 Troubleshooting Rápido

| Erro | Solução |
|------|---------|
| `OR_BIBED_06` | Verifique se `ENVIRONMENT=TEST` |
| CSP Error | Reinicie servidor após mudança |
| `net::ERR_BLOCKED_BY_CLIENT` | Use HTTPS (ngrok/Firebase) |
| Google Pay não aparece | Verifique se tem cartões configurados |

A configuração agora está otimizada para teste local com HTTPS! 🎉
