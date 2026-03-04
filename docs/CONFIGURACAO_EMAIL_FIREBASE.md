# 🔥 Configuração Rápida - Sistema de E-mails Firebase

## ✅ O que já está pronto:

1. **Páginas criadas:**
   - `/auth/action` - Página de ações (4 modais)
   - `/auth/action/test` - Página de testes

2. **Templates HTML:**
   - `email-templates/verify-email.html`
   - `email-templates/reset-password.html`
   - `email-templates/email-changed.html`
   - `email-templates/mfa-enabled.html`

3. **Código funcionando:**
   - Todos os modais implementados
   - Validação de códigos
   - Integração com Firebase Auth

## 🚀 Próximos Passos - Configure no Firebase Console:

### 1. Acesse o Firebase Console
```
https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/emails
```

### 2. Configure cada Template de E-mail

#### A) Verificação de E-mail
1. Clique em **"Verification email"** → Editar (ícone lápis)
2. Em **"Customize action URL"**, ative e cole:
   ```
   https://italosantos.com/auth/action
   ```
3. Copie o conteúdo de `email-templates/verify-email.html`
4. Cole no editor HTML (se disponível) ou use o template padrão com a URL customizada
5. Salve

#### B) Redefinição de Senha
1. Clique em **"Password reset"** → Editar
2. Em **"Customize action URL"**, ative e cole:
   ```
   https://italosantos.com/auth/action
   ```
3. Copie o conteúdo de `email-templates/reset-password.html`
4. Cole no editor
5. Salve

#### C) Alteração de E-mail
1. Clique em **"Email address change"** → Editar
2. Em **"Customize action URL"**, ative e cole:
   ```
   https://italosantos.com/auth/action
   ```
3. Copie o conteúdo de `email-templates/email-changed.html`
4. Cole no editor
5. Salve

#### D) Notificação MFA (se disponível)
1. Clique em **"SMS multi-factor authentication"** → Editar
2. Configure a URL customizada
3. Use o template `email-templates/mfa-enabled.html`

### 3. Adicione o Domínio Autorizado

1. Vá em **Authentication** → **Settings** → **Authorized domains**
2. Clique em **"Add domain"**
3. Adicione: `italosantos.com`
4. Salve

## 🧪 Teste Local (Antes de Deploy)

### 1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

### 2. Acesse a página de testes:
```
http://localhost:3000/auth/action/test
```

### 3. Teste cada modal:
- Clique em cada botão
- Verifique se os modais aparecem corretamente
- Note que os códigos de teste não funcionarão (são fictícios)

## 🔥 Teste Real (Após Deploy)

### 1. Teste Verificação de E-mail:
```bash
# Crie uma nova conta
curl -X POST https://italosantos.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"senha123"}'
```
Verifique o e-mail recebido e clique no link.

### 2. Teste Redefinição de Senha:
1. Vá para a página de login
2. Clique em "Esqueci minha senha"
3. Digite seu e-mail
4. Verifique o e-mail e clique no link

### 3. Teste Alteração de E-mail:
1. Faça login
2. Vá em Perfil → Configurações
3. Altere seu e-mail
4. Verifique o e-mail antigo

## 📱 URLs que os E-mails Usarão

Depois de configurar, os e-mails terão estes links:

```
Verificação:
https://italosantos.com/auth/action?mode=verifyEmail&oobCode=XXXXX

Redefinir Senha:
https://italosantos.com/auth/action?mode=resetPassword&oobCode=XXXXX

Recuperar E-mail:
https://italosantos.com/auth/action?mode=recoverEmail&oobCode=XXXXX

Alterar E-mail:
https://italosantos.com/auth/action?mode=verifyAndChangeEmail&oobCode=XXXXX
```

## 🎯 Checklist de Configuração

- [ ] Acesse o Firebase Console
- [ ] Configure "Verification email" com URL customizada
- [ ] Configure "Password reset" com URL customizada
- [ ] Configure "Email address change" com URL customizada
- [ ] Adicione `italosantos.com` aos domínios autorizados
- [ ] Teste localmente em `/auth/action/test`
- [ ] Faça deploy do código
- [ ] Teste real com criação de conta
- [ ] Teste redefinição de senha
- [ ] Teste alteração de e-mail

## 🆘 Problemas Comuns

### Link não funciona:
- ✅ Verifique se o domínio está nos "Authorized domains"
- ✅ Confirme que a Action URL está configurada
- ✅ Verifique se fez deploy do código novo

### E-mail não chega:
- ✅ Verifique spam/lixo eletrônico
- ✅ Aguarde alguns minutos
- ✅ Verifique se o e-mail está correto no Firebase

### Modal não abre:
- ✅ Abra o console do navegador (F12)
- ✅ Verifique erros JavaScript
- ✅ Confirme que fez deploy do código

## 📞 Próximo Passo AGORA:

1. **Abra o Firebase Console:**
   ```
   https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/emails
   ```

2. **Configure as Action URLs** como mostrado acima

3. **Teste localmente** em:
   ```
   http://localhost:3000/auth/action/test
   ```

---

**Tudo pronto para configurar! 🚀**

Precisa de ajuda com algum passo específico?
