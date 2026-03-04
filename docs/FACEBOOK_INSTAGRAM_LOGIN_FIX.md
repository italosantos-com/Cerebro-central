# 🔧 Guia de Correção: Login Facebook & Instagram

## 📋 Problema Identificado

O login com Facebook e Instagram não está funcionando. Possíveis causas:

1. **Facebook App ID não configurado corretamente**
2. **Domínio não autorizado no Facebook App**
3. **Permissões do Facebook App insuficientes**
4. **Instagram Business Account não conectado**

## ✅ Configurações Necessárias

### 1. Variáveis de Ambiente

Adicione ao arquivo `.env.local`:

```bash
# Facebook App
NEXT_PUBLIC_FACEBOOK_APP_ID=1029313609296207

# Instagram App (pode ser o mesmo do Facebook)
NEXT_PUBLIC_INSTAGRAM_APP_ID=1029313609296207
```

### 2. Configuração no Facebook Developers

Acesse: https://developers.facebook.com/apps/1029313609296207

#### a) Configurações Básicas
- **App ID**: `1029313609296207`
- **App Secret**: (manter seguro, não expor)
- **Display Name**: Nome do seu app

#### b) Adicionar Domínio
Em **Settings > Basic**:
- **App Domains**: 
  - `italosantos.com`
  - `localhost` (para desenvolvimento)

#### c) Site URL
Em **Settings > Basic > Website**:
- **Site URL**: 
  - Produção: `https://italosantos.com`
  - Desenvolvimento: `http://localhost:3000`

#### d) Redirect URIs
Em **Facebook Login > Settings**:
- **Valid OAuth Redirect URIs**:
  ```
  https://italosantos.com/
  https://italosantos.com/admin/integrations
  http://localhost:3000/
  http://localhost:3000/admin/integrations
  ```

#### e) Permissões Necessárias
Em **App Review > Permissions and Features**, solicite:
- ✅ `email`
- ✅ `public_profile`
- ✅ `user_photos`
- ✅ `instagram_basic`
- ✅ `instagram_manage_insights`
- ✅ `pages_show_list`
- ✅ `pages_read_engagement`

### 3. Instagram Business Account

Para Instagram funcionar, você precisa:

1. **Página do Facebook** conectada ao Instagram Business
2. **Instagram Business Account** (não pode ser conta pessoal)
3. Converter conta pessoal para Business:
   - Instagram App > Settings > Account > Switch to Professional Account
   - Escolher Business
   - Conectar à sua Página do Facebook

## 🔍 Como Testar

### Teste 1: Facebook SDK Carregado
1. Abra o console do navegador (F12)
2. Digite: `typeof window.FB`
3. Deve retornar: `"object"`
4. Se retornar `"undefined"`, o SDK não foi carregado

### Teste 2: Login Facebook
1. Acesse: `http://localhost:3000/admin/integrations`
2. Clique em "Conectar" no card do Facebook
3. Popup do Facebook deve abrir
4. Faça login e autorize as permissões
5. Console deve mostrar:
   ```
   [Meta SDK] Facebook login response: {status: "connected", ...}
   [Meta SDK] Facebook user data: {id: "...", name: "...", ...}
   [Meta SDK] Facebook profile collected: {...}
   ```

### Teste 3: Login Instagram
1. Acesse: `http://localhost:3000/admin/integrations`
2. Clique em "Conectar" no card do Instagram
3. Popup do Facebook deve abrir (Instagram usa Facebook SDK)
4. Autorize as permissões
5. Sistema buscará sua Página e conta Instagram conectada
6. Console deve mostrar:
   ```
   [Meta SDK] Instagram login response: {status: "connected", ...}
   [Meta SDK] Facebook Pages: [...]
   [Meta SDK] Instagram account: {...}
   [Meta SDK] Instagram profile: {...}
   ```

## 🐛 Troubleshooting

### Erro: "Facebook SDK não carregado"
**Solução**: 
- Verifique o console se há erros ao carregar `https://connect.facebook.net/en_US/sdk.js`
- Verifique bloqueadores de anúncios (podem bloquear Facebook SDK)
- Tente em aba anônima

### Erro: "App Not Setup"
**Solução**:
- Verifique se o domínio está adicionado em **App Domains**
- Verifique se a URL está em **Valid OAuth Redirect URIs**

### Erro: "Nenhuma página encontrada"
**Solução**:
- Você precisa ter uma **Página do Facebook** criada
- Vá em: https://www.facebook.com/pages/create
- Crie uma página Business

### Erro: "Nenhuma conta do Instagram Business encontrada"
**Solução**:
- Converta sua conta Instagram para Business
- Conecte a conta Instagram à sua Página do Facebook:
  1. Página do Facebook > Settings
  2. Instagram > Connect Account
  3. Faça login no Instagram
  4. Autorize a conexão

### Erro: "Invalid Scopes"
**Solução**:
- As permissões precisam ser aprovadas pelo Facebook
- Solicite revisão em: https://developers.facebook.com/apps/1029313609296207/app-review/
- Enquanto em desenvolvimento, adicione testadores em **Roles > Test Users**

## 📝 Arquivos Envolvidos

1. **SDK Initialization**:
   - `/src/app/layout.tsx` - Carrega Facebook SDK
   - `/src/services/meta-sdk-integration.ts` - Lógica de login

2. **UI Components**:
   - `/src/app/admin/integrations/page.tsx` - Botões de conexão
   - `/src/app/admin/integrations/components/IntegrationCard.tsx` - Card visual

3. **API Routes**:
   - `/src/app/api/admin/meta/profile/route.ts` - Salva perfil no Firestore

## 🚀 Próximos Passos

1. ✅ Configurar variáveis de ambiente
2. ✅ Adicionar domínio no Facebook App
3. ✅ Configurar OAuth Redirect URIs
4. ✅ Criar Página do Facebook
5. ✅ Converter Instagram para Business
6. ✅ Conectar Instagram à Página
7. ✅ Testar login

## 📞 Suporte

Se os problemas persistirem:
- Verifique logs do console do navegador
- Verifique logs do console do Next.js
- Teste com conta de teste do Facebook (não produção)
