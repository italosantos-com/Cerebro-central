# PayPal (modelo Italo) – Clone rápido

Este diretório adiciona um botão PayPal simples e uma página de demo, aproveitando as rotas já existentes no projeto atual (`/api/paypal/create-order` e `/api/paypal/capture-order`).

## O que foi adicionado
- `src/components/italo/paypal-simple-button.tsx`: componente leve que usa `@paypal/react-paypal-js` e chama as rotas do backend.
- `src/app/demos/paypal-italo/page.tsx`: página de demonstração que renderiza o botão com `PayPalScriptProvider`.

## Variáveis de ambiente necessárias
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`: Client ID público do PayPal (live ou sandbox).
- O backend deve estar configurado com as credenciais correspondentes (tipicamente `PAYPAL_CLIENT_ID` e `PAYPAL_CLIENT_SECRET`), conforme sua implementação existente.

## Como testar
1. Defina o Client ID do PayPal:

```bash
export NEXT_PUBLIC_PAYPAL_CLIENT_ID=SEU_CLIENT_ID
```

2. Inicie o projeto e acesse a página de demo:

```bash
npm run dev
# depois abra /demos/paypal-italo no navegador
```

3. Realize um pagamento de teste. O componente chama:
- `POST /api/paypal/create-order` com `{ amount, currency, description }`.
- `POST /api/paypal/capture-order` com `{ orderId }`.

Se suas rotas atuais usarem um caminho diferente, ajuste as URLs no componente `paypal-simple-button.tsx`.

## Observações
- Este clone evita dependências específicas de contexto (auth/toast personalizados). Integre autenticação/telemetria conforme necessário.
- A moeda padrão é BRL e o intent é `capture`. Altere conforme seu caso de uso.
- Para alternar sandbox/live, use o Client ID apropriado e garanta que o backend use as credenciais do mesmo ambiente.
