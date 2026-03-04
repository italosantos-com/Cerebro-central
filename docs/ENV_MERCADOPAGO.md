# Mercado Pago OAuth (Produção)

- Defina `NEXT_PUBLIC_MERCADOPAGO_OAUTH_URL` apenas no ambiente de produção (ex.: `.env.production.local`).
- Exemplo de placeholder (não funcional):

```
NEXT_PUBLIC_MERCADOPAGO_OAUTH_URL=https://SEU-ENDPOINT-CLOUD-RUN/\?redirect_uri=https%3A%2F%2FSEU.DOMINIO%2Fauth%2Fcallback%3Fplatform%3Dmercadopago&state=mercadopago%3ATIMESTAMP&origin=https%3A%2F%2FSEU.DOMINIO
```

- Em desenvolvimento, mantenha essa variável ausente ou comentada; o app usará o endpoint padrão definido em `src/lib/integrations.ts`.
