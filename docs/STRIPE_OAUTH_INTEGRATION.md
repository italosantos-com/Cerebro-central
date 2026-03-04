# Integração Stripe Connect OAuth

## 📋 Visão Geral

Este documento descreve a implementação do fluxo OAuth do Stripe Connect no painel admin. A integração permite que admins conectem suas contas Stripe e recebam pagamentos através da plataforma.

## 🔑 Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env.local`:

```bash
# Stripe OAuth Connect Configuration
STRIPE_CLIENT_ID=ca_YOUR_STRIPE_CLIENT_ID
NEXT_PUBLIC_STRIPE_CLIENT_ID=ca_YOUR_STRIPE_CLIENT_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_OAUTH_CLIENT_ID=ca_YOUR_STRIPE_CLIENT_ID
STRIPE_CALLBACK_URL=https://yourdomain.com/api/admin/stripe/callback
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 2. Obter Client ID do Stripe

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com)
2. Navegue para **Settings** → **Connect** → **Settings**
3. Copie o **Client ID** (começa com `ca_`)
4. Configure a **Redirect URI**: `https://yourdomain.com/api/admin/stripe/callback`

## 🏗️ Arquitetura

### Fluxo OAuth

```
┌─────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Admin  │────────▶│  Connect │────────▶│  Stripe  │────────▶│ Callback │
│  Panel  │         │  Route   │         │   OAuth  │         │  Handler │
└─────────┘         └──────────┘         └──────────┘         └──────────┘
     │                                                                │
     └────────────────────────────────────────────────────────────────┘
                        postMessage (Success/Error)
```

### Arquivos Criados/Modificados

#### 1. `/src/app/api/admin/stripe/connect/route.ts`
- Gera URL de autorização OAuth do Stripe
- Configura state para proteção CSRF
- Redireciona para o Stripe Dashboard

#### 2. `/src/app/api/admin/stripe/callback/route.ts`
- Recebe código de autorização do Stripe
- Troca código por access token
- **NOVO**: Verifica status da conta conectada
- Salva informações no Firebase Realtime Database
- Redireciona para página de sucesso

#### 3. `/src/app/api/admin/stripe/verify/route.ts` ✨ **NOVO**
- Endpoint dedicado para verificação de contas
- Retorna análise detalhada da conta:
  - `hasConnectedAccount`: Conta conectada com sucesso
  - `hasCompletedProcess`: Processo de onboarding completo
  - `isValid`: Pagamentos e saques habilitados
  - `displayName`: Nome de exibição da conta
  - `shouldAllowUnlink`: Se deve permitir desconectar

#### 4. `/src/lib/api/errors.ts` ✨ **NOVO**
- Classe `CustomError` para erros com status HTTP
- Função `createError` helper
- Padrão do stripe-connect-demo

#### 5. `/src/lib/api/middlewares.ts` ✨ **NOVO**
- Middleware `handleErrors` para tratamento de erros
- Compatível com Next.js API Routes (Pages Router)
- Logging estruturado de erros

## 🎨 Card do Stripe no Painel Admin

O card existente em `/src/app/admin/integrations/page.tsx` já está configurado para:

1. **Abrir popup OAuth** ao clicar em "Conectar"
2. **Verificar status** da conexão periodicamente
3. **Exibir toast** de sucesso/erro
4. **Atualizar UI** quando conectado

### Código do Card

```tsx
<IntegrationCard
  title="Stripe"
  description="Processador de pagamentos"
  icon={StripeIcon}
  connected={integrations.stripe}
  loading={isLoading.stripe}
  onConnect={() => handleConnect('stripe')}
  onDisconnect={() => handleDisconnect('stripe')}
/>
```

## 📊 Dados Armazenados no Firebase

O callback salva os seguintes dados em `admin/integrations/stripe`:

```json
{
  "connected": true,
  "access_token": "sk_***",
  "refresh_token": "rt_***",
  "stripe_user_id": "acct_***",
  "stripe_publishable_key": "pk_***",
  "connected_at": "2025-12-07T12:00:00.000Z",
  "account_analysis": {
    "hasConnectedAccount": true,
    "accountId": "acct_***",
    "hasCompletedProcess": true,
    "isValid": true,
    "displayName": "My Business",
    "country": "BR",
    "currency": "brl"
  },
  "should_allow_unlink": false
}
```

## 🔒 Análise de Segurança da Conta

A integração agora inclui análise automática da conta conectada:

### Estados da Conta

| Estado | Descrição | shouldAllowUnlink |
|--------|-----------|-------------------|
| ✅ Válida | Completa, pagamentos habilitados | `false` |
| ⚠️ Incompleta | Onboarding não finalizado | `true` |
| ❌ Inválida | Pagamentos/saques desabilitados | `true` |
| 🔄 Sem nome | Display name não configurado | `true` |

### Quando Permitir Desconectar

```typescript
const shouldAllowUnlink =
  accountAnalysis?.hasConnectedAccount &&
  (!accountAnalysis?.isValid ||
    !accountAnalysis?.hasCompletedProcess ||
    !accountAnalysis?.displayName);
```

## 🧪 Testando a Integração

### 1. Ambiente de Desenvolvimento

```bash
# Configure as variáveis no .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
STRIPE_CALLBACK_URL=http://localhost:3000/api/admin/stripe/callback
```

### 2. Testar Fluxo OAuth

1. Acesse `http://localhost:3000/admin/integrations`
2. Clique em "Conectar" no card do Stripe
3. Será aberto popup do Stripe Dashboard
4. Faça login com sua conta de teste
5. Autorize a aplicação
6. Verifique o toast de sucesso

### 3. Verificar Dados Salvos

```bash
# No Firebase Console
Database → Realtime Database → admin/integrations/stripe
```

## 🔍 Verificação de Conta (API Endpoint)

### Request

```bash
POST /api/admin/stripe/verify
Content-Type: application/json

{
  "code": "ac_ABC123..."
}
```

### Response

```json
{
  "account": { /* Objeto completo da conta Stripe */ },
  "oauth": {
    "access_token": "sk_***",
    "refresh_token": "rt_***",
    "stripe_user_id": "acct_***",
    "stripe_publishable_key": "pk_***"
  },
  "accountAnalysis": {
    "hasConnectedAccount": true,
    "accountId": "acct_***",
    "hasCompletedProcess": true,
    "isValid": true,
    "displayName": "My Business",
    "country": "BR",
    "currency": "brl"
  },
  "shouldAllowUnlink": false
}
```

## 🚀 Produção

### Checklist de Deploy

- [ ] Atualizar `NEXT_PUBLIC_BASE_URL` para URL de produção
- [ ] Atualizar `STRIPE_CALLBACK_URL` para URL de produção
- [ ] Configurar Redirect URI no Stripe Dashboard
- [ ] Usar chaves de produção do Stripe (`pk_live_` e `sk_live_`)
- [ ] Obter Client ID de produção (`ca_` de produção)
- [ ] Testar fluxo OAuth em produção
- [ ] Configurar webhooks do Stripe (opcional)

### URLs de Produção

```bash
NEXT_PUBLIC_BASE_URL=https://italosantos.com
STRIPE_CALLBACK_URL=https://italosantos.com/api/admin/stripe/callback
```

## 📚 Recursos Adicionais

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe OAuth Reference](https://stripe.com/docs/connect/oauth-reference)
- [stripe-connect-demo Repository](https://github.com/kumarabhirup/stripe-connect-demo)

## 🐛 Troubleshooting

### Erro: "Stripe client ID not configured"

**Solução**: Verifique se `STRIPE_CLIENT_ID` ou `NEXT_PUBLIC_STRIPE_CLIENT_ID` está configurado no `.env.local`

### Erro: "Invalid authentication callback"

**Solução**: Verifique se o state CSRF está sendo preservado corretamente nos cookies

### Erro: "Failed to exchange authorization code"

**Solução**: Verifique se `STRIPE_SECRET_KEY` está correto e se a Redirect URI está configurada no Stripe Dashboard

### Popup não abre ou é bloqueado

**Solução**: Instrua o usuário a permitir popups para o domínio da aplicação

## 💡 Melhorias Futuras

- [ ] Implementar refresh token automático
- [ ] Adicionar webhook para sincronizar status da conta
- [ ] Criar dashboard de métricas do Stripe Connect
- [ ] Implementar fluxo de desconexão (revoke token)
- [ ] Adicionar suporte para múltiplas contas conectadas
- [ ] Implementar testes automatizados do fluxo OAuth

## 🔄 Histórico de Mudanças

### v1.0.0 - 2025-12-07

#### ✨ Adicionado
- Endpoint `/api/admin/stripe/verify` para verificação de conta
- Análise automática de status da conta (`accountAnalysis`)
- Flag `should_allow_unlink` para controlar desconexão
- Utilitários de erro (`errors.ts` e `middlewares.ts`)
- Documentação completa do fluxo OAuth

#### 🔧 Modificado
- Callback agora recupera e analisa dados da conta Stripe
- Salvamento de análise da conta no Firebase
- Logs melhorados para debugging

#### 📝 Referências
- Baseado em: https://github.com/kumarabhirup/stripe-connect-demo
