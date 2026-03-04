# 📧 Configuração Completa dos Templates de E-mail Firebase

## 🎯 Visão Geral

Este guia contém as instruções completas para configurar os templates de e-mail personalizados no Firebase Authentication, incluindo a URL do manipulador de ações customizado.

---

## 📋 Checklist Rápido

- [ ] Acessar Firebase Console
- [ ] Configurar URL de ação customizada para cada tipo de e-mail
- [ ] Adicionar domínio aos Authorized Domains
- [ ] Testar cada tipo de e-mail
- [ ] Fazer deploy do código

---

## 🔧 Passo 1: Acessar Firebase Console

1. Acesse: https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/emails
2. Faça login com sua conta Google
3. Selecione o projeto: **projeto-italo-bc5ef**
4. Navegue para: **Authentication** → **Templates**

---

## 📝 Passo 2: Configurar Templates de E-mail

### 🔹 1. Verificação de E-mail (Email Verification)

**Clique em "Email address verification" → Editar (ícone de lápis)**

**Action URL (URL de ação):**
```
https://italosantos.com/auth/action
```

**Template HTML Personalizado:**
- Arquivo: `/email-templates/verify-email.html`
- Este template já está configurado com:
  - Design moderno com tema neon vermelho
  - Logo "IS" com efeito neon
  - Botão de ação destacado
  - Link alternativo para copiar/colar
  - Avisos de segurança
  - Lista de benefícios após verificação

**Variáveis Disponíveis:**
- `%APP_NAME%` - Nome do aplicativo
- `%DISPLAY_NAME%` - Nome do usuário
- `%EMAIL%` - E-mail do usuário
- `%LINK%` - Link de verificação com oobCode

**Configurações Importantes:**
- ✅ Ative "Customize action URL"
- ✅ Cole a URL: `https://italosantos.com/auth/action`
- ✅ Salve as alterações

---

### 🔹 2. Redefinição de Senha (Password Reset)

**Clique em "Password reset" → Editar (ícone de lápis)**

**Action URL (URL de ação):**
```
https://italosantos.com/auth/action
```

**Template HTML Personalizado:**
- Arquivo: `/email-templates/reset-password.html`
- Este template inclui:
  - Design com tema neon vermelho
  - Informações claras sobre a redefinição
  - Destaque para o e-mail da conta
  - Avisos de segurança detalhados
  - Dicas para criar senha forte
  - Tempo de expiração do link (1 hora)

**Variáveis Disponíveis:**
- `%APP_NAME%` - Nome do aplicativo
- `%EMAIL%` - E-mail da conta
- `%LINK%` - Link de redefinição com oobCode

**Configurações Importantes:**
- ✅ Ative "Customize action URL"
- ✅ Cole a URL: `https://italosantos.com/auth/action`
- ✅ Salve as alterações

---

### 🔹 3. Alteração de E-mail (Email Address Change)

**Clique em "Email address change" → Editar (ícone de lápis)**

**Action URL (URL de ação):**
```
https://italosantos.com/auth/action
```

**Template HTML Personalizado:**
- Arquivo: `/email-templates/email-changed.html`
- Este template possui:
  - Design com tema neon laranja (diferenciação visual)
  - Comparação entre e-mail antigo e novo
  - Destaque para ação de reversão
  - Avisos de segurança em destaque
  - Informações sobre tempo de expiração (24 horas)

**Variáveis Disponíveis:**
- `%APP_NAME%` - Nome do aplicativo
- `%DISPLAY_NAME%` - Nome do usuário
- `%EMAIL%` - E-mail anterior
- `%NEW_EMAIL%` - Novo e-mail
- `%LINK%` - Link para reverter alteração com oobCode

**Configurações Importantes:**
- ✅ Ative "Customize action URL"
- ✅ Cole a URL: `https://italosantos.com/auth/action`
- ✅ Salve as alterações

**⚠️ Importante:** Este e-mail é enviado para **ambos** os endereços (antigo e novo)

---

### 🔹 4. Autenticação Multifator (SMS Multi-Factor Authentication)

**Clique em "SMS multi-factor authentication" → Editar (ícone de lápis)**

**Template HTML Personalizado:**
- Arquivo: `/email-templates/mfa-enabled.html`
- Este template apresenta:
  - Design com tema neon verde (segurança)
  - Ícone de escudo destacado
  - Explicação clara sobre 2FA
  - Passo a passo de como funciona
  - Benefícios da autenticação em duas etapas
  - Opção para desativar se não autorizado

**Variáveis Disponíveis:**
- `%APP_NAME%` - Nome do aplicativo
- `%DISPLAY_NAME%` - Nome do usuário
- `%EMAIL%` - E-mail da conta
- `%SECOND_FACTOR%` - Método de segundo fator (SMS, telefone, etc.)
- `%LINK%` - Link para gerenciar 2FA

**⚠️ Nota:** Este é um e-mail informativo. A ativação/desativação do MFA ocorre no aplicativo.

---

## 🌐 Passo 3: Configurar Domínios Autorizados

1. No Firebase Console, vá em: **Authentication** → **Settings** → **Authorized domains**
2. Clique em **"Add domain"**
3. Adicione os seguintes domínios:

```
italosantos.com
localhost
```

**Por que isso é necessário?**
- O Firebase só permite redirecionamentos para domínios autorizados
- `italosantos.com` - Seu domínio de produção
- `localhost` - Para testes locais

---

## 💻 Passo 4: Página de Manipulador de Ações

### Arquivo Principal: `/src/app/auth/action/page.tsx`

Esta página já está implementada e possui:

#### ✅ Funcionalidades Implementadas:

1. **Verificação de E-mail (`mode=verifyEmail`)**
   ```typescript
   - Usa applyActionCode() para confirmar e-mail
   - Feedback visual de sucesso
   - Redirecionamento automático após 3 segundos
   ```

2. **Redefinição de Senha (`mode=resetPassword`)**
   ```typescript
   - Usa verifyPasswordResetCode() para validar
   - Formulário para nova senha com confirmação
   - Validação de senha mínima (6 caracteres)
   - Confirmação de senhas iguais
   - Usa confirmPasswordReset() para aplicar
   ```

3. **Recuperação de E-mail (`mode=recoverEmail`)**
   ```typescript
   - Usa applyActionCode() para reverter mudança
   - Restaura e-mail anterior
   - Feedback de sucesso
   ```

4. **Alteração de E-mail (`mode=verifyAndChangeEmail`)**
   ```typescript
   - Usa checkActionCode() para verificar ação
   - Usa applyActionCode() para confirmar mudança
   - Feedback visual claro
   ```

#### 🎨 Design da Página:

- Cards flutuantes com efeito glassmorphism
- Animações de entrada suaves
- Ícones ilustrativos para cada tipo de ação
- Estados de loading durante processamento
- Tratamento de erros com mensagens claras
- Toasts de sucesso/erro
- Tema neon consistente com o site

#### 🔐 Segurança:

- Validação de parâmetros da URL (mode e oobCode)
- Verificação do código antes de processar
- Mensagens de erro para links inválidos/expirados
- Timeout de redirecionamento após sucesso

---

## 🧪 Passo 5: Testar os E-mails

### Teste Local (http://localhost:3001)

1. **Teste de Verificação de E-mail:**
   ```bash
   1. Crie uma nova conta
   2. Verifique o e-mail recebido
   3. Clique no botão "Verificar E-mail"
   4. Confirme que foi redirecionado para /auth/action
   5. Verifique se o e-mail foi marcado como verificado
   ```

2. **Teste de Reset de Senha:**
   ```bash
   1. Clique em "Esqueci minha senha"
   2. Digite seu e-mail
   3. Verifique o e-mail recebido
   4. Clique no botão "Criar Nova Senha"
   5. Digite e confirme a nova senha
   6. Tente fazer login com a nova senha
   ```

3. **Teste de Alteração de E-mail:**
   ```bash
   1. Faça login em sua conta
   2. Vá em Perfil → Alterar E-mail
   3. Digite novo e-mail
   4. Verifique AMBOS os e-mails (antigo e novo)
   5. Clique em "Confirmar" no novo e-mail
   6. OU clique em "Reverter" no antigo e-mail se não autorizou
   ```

### Teste em Produção (https://italosantos.com)

Após deploy, repita todos os testes acima usando o domínio de produção.

---

## 🚀 Passo 6: Deploy do Código

### Opção 1: Firebase Hosting

```bash
# Build do projeto
npm run build

# Deploy para Firebase
firebase deploy --only hosting
```

### Opção 2: Vercel/Netlify

```bash
# Build do projeto
npm run build

# Deploy automático via Git push (se configurado)
git push origin main
```

### Verificação Pós-Deploy:

- ✅ Teste cada URL de ação
- ✅ Verifique certificado SSL (HTTPS)
- ✅ Teste em diferentes navegadores
- ✅ Teste em dispositivos móveis

---

## 🔍 Troubleshooting (Solução de Problemas)

### ❌ Erro: "Link inválido ou expirado"

**Causas possíveis:**
- Link já foi usado
- Link expirou (24h para verificação, 1h para reset)
- Parâmetros da URL corrompidos

**Solução:**
- Solicite um novo link
- Verifique se copiou a URL completa

---

### ❌ Erro: "auth/invalid-action-code"

**Causas possíveis:**
- Código oobCode inválido
- Código já foi utilizado
- Código expirou

**Solução:**
- Gere um novo link
- Certifique-se de usar o link mais recente

---

### ❌ Erro: "auth/unauthorized-domain"

**Causas possíveis:**
- Domínio não está nos Authorized Domains

**Solução:**
1. Acesse Firebase Console
2. Authentication → Settings → Authorized domains
3. Adicione seu domínio

---

### ❌ E-mail não está sendo enviado

**Verificações:**
1. Confira se o Firebase Authentication está ativado
2. Verifique se o usuário tem e-mail cadastrado
3. Verifique a caixa de spam
4. Confirme que o domínio de envio não está bloqueado

---

## 📊 Monitoramento

### Logs do Firebase

Acesse: https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/users

- Verifique tentativas de login
- Monitore verificações de e-mail
- Acompanhe redefinições de senha

### Analytics

Implemente tracking de eventos:
```typescript
// Exemplo de tracking
analytics.logEvent('email_verified', { method: 'link' });
analytics.logEvent('password_reset', { success: true });
```

---

## 🎨 Personalização Adicional

### Alterar Cores dos Templates

Edite as variáveis CSS nos arquivos HTML:

```css
/* Vermelho (verify-email, reset-password) */
--primary: #ff0000;
--primary-dark: #cc0000;

/* Laranja (email-changed) */
--primary: #ff8800;
--primary-dark: #cc6600;

/* Verde (mfa-enabled) */
--primary: #00cc00;
--primary-dark: #008800;
```

### Adicionar Logo Personalizado

Substitua o elemento `.logo` nos templates:

```html
<!-- Atual -->
<div class="logo">IS</div>

<!-- Personalizado -->
<img src="https://italosantos.com/logo.png" alt="Logo" style="height: 64px;">
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique a documentação oficial do Firebase: https://firebase.google.com/docs/auth
2. Revise os logs do console do navegador (F12)
3. Verifique os logs do Firebase Console
4. Teste em modo incógnito para descartar cache

---

## ✅ Checklist Final

- [ ] Todos os 4 templates de e-mail configurados
- [ ] Action URLs configuradas para `https://italosantos.com/auth/action`
- [ ] Domínios adicionados aos Authorized Domains
- [ ] Página `/src/app/auth/action/page.tsx` funcionando
- [ ] Testes locais concluídos com sucesso
- [ ] Deploy realizado
- [ ] Testes em produção concluídos
- [ ] E-mails sendo recebidos corretamente
- [ ] Links redirecionando para página customizada
- [ ] Ações sendo processadas corretamente
- [ ] Feedback visual funcionando (toasts, animações)

---

## 🎉 Conclusão

Com esta configuração completa:

✅ Todos os e-mails do Firebase Authentication personalizados
✅ URLs de ação apontando para página customizada
✅ Manipuladores de ação implementados corretamente
✅ Design moderno e responsivo
✅ Experiência de usuário melhorada
✅ Segurança reforçada com avisos claros
✅ Monitoramento e logs configurados

**Seu sistema de autenticação por e-mail está pronto para produção!** 🚀
