# Configuração do Google Pay

## Problemas Identificados e Soluções

### 1. Script do Google Pay não estava sendo carregado
**Problema:** O script do Google Pay não estava sendo incluído no projeto.

**Solução:** Adicionado o script no `src/app/layout.tsx`:
```javascript
<Script id="google-pay-script" strategy="afterInteractive">
  {`
    // Carregar Google Pay API
    (function() {
      var script = document.createElement('script');
      script.src = 'https://pay.google.com/gp/p/js/pay.js';
      script.onload = function() {
        console.log('Google Pay API carregada com sucesso');
        window.dispatchEvent(new Event('google-pay-ready'));
      };
      script.onerror = function() {
        console.error('Erro ao carregar Google Pay API');
      };
      document.head.appendChild(script);
    })();
  `}
</Script>
```

### 2. Configuração de Ambiente
**Problema:** Variáveis de ambiente não configuradas.

**Solução:** Criar arquivo `.env.local` com:
```env
NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID=seu_merchant_id_aqui
```

### 3. Merchant ID Inválido
**Problema:** Usando um merchant ID de exemplo inválido.

**Solução:** 
- Obter um Merchant ID real do Google Pay Console
- Configurar a variável de ambiente `NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID`

### 4. Gateway de Pagamento Incorreto
**Problema:** Usando `gateway: 'example'` que não é real.

**Solução:** Alterado para `gateway: 'stripe'` (ou outro gateway real).

### 5. API de Processamento Simulada
**Problema:** API apenas retornava sucesso sem processar.

**Solução:** Melhorada a API `/api/google-pay/process` com:
- Validações de dados
- Integração com sistema de assinaturas
- Logs detalhados

## Passos para Configuração Completa

### 1. Obter Merchant ID do Google Pay
1. Acesse [Google Pay Console](https://pay.google.com/business/console/)
2. Crie uma conta de negócio
3. Obtenha seu Merchant ID
4. Configure no arquivo `.env.local`

### 2. Configurar Gateway de Pagamento
Para usar com Stripe:
1. Crie uma conta no Stripe
2. Configure o Google Pay no Stripe Dashboard
3. Obtenha as credenciais necessárias

### 3. Testar em Ambiente de Desenvolvimento
1. Use o ambiente `TEST` do Google Pay
2. Teste com cartões de teste
3. Verifique os logs no console

### 4. Configurar para Produção
1. Mude para ambiente `PRODUCTION`
2. Configure HTTPS obrigatório
3. Teste com cartões reais

## Verificações de Funcionamento

### 1. Verificar se o script está carregado
```javascript
// No console do navegador
console.log('Google Pay disponível:', 'google' in window && window.google?.payments?.api);
```

### 2. Verificar disponibilidade do Google Pay
```javascript
// No componente
console.log('Google Pay disponível:', isGooglePayAvailable);
```

### 3. Verificar logs da API
```javascript
// No console do servidor
console.log('🔔 [GOOGLE PAY] Processando pagamento:', {...});
```

## Troubleshooting

### Google Pay não aparece
- Verificar se está em HTTPS (obrigatório)
- Verificar se o dispositivo suporta Google Pay
- Verificar se o usuário tem cartões configurados

### Erro de Merchant ID
- Verificar se o Merchant ID está correto
- Verificar se está configurado no Google Pay Console
- Verificar se o domínio está autorizado

### Erro de Gateway
- Verificar se o gateway está configurado corretamente
- Verificar credenciais do gateway
- Verificar se o gateway suporta Google Pay

## Próximos Passos

1. **Integração com Gateway Real:** Implementar integração com Stripe ou outro gateway
2. **Validação de Cartões:** Adicionar validação de cartões suportados
3. **Tratamento de Erros:** Melhorar tratamento de erros específicos do Google Pay
4. **Testes Automatizados:** Criar testes para o fluxo do Google Pay
5. **Monitoramento:** Implementar monitoramento de transações
