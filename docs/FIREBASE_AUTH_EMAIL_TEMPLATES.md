# Configuração dos Templates de E-mail do Firebase Authentication

## 🎯 Problema

Os links de autenticação do Firebase estão redirecionando para `/_/auth/action` causando erro 404, quando deveriam redirecionar para `/auth/action`.

## ✅ Solução Implementada

### 1. Rewrite no firebase.json

Adicionado rewrite para redirecionar `/_/auth/action` para `/auth/action`:

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/_/auth/action",
        "destination": "/auth/action"
      }
    ]
  }
}
```

### 2. Variável de Ambiente

Verificado que `EMAIL_ACTION_BASE_URL` está corretamente configurado:

```env
EMAIL_ACTION_BASE_URL=https://italosantos.com/auth/action
```

### 3. Configuração Manual no Firebase Console (OBRIGATÓRIO)

Para que os e-mails do Firebase usem a URL customizada, você precisa configurar manualmente no Firebase Console:

#### Passo a Passo:

1. **Acesse o Firebase Console**
  - URL: https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/emails

2. **Configure cada template de e-mail:**

   **a) Verificação de E-mail (Email verification)**
   - Clique em "Editar" (ícone de lápis)
   - Na seção "Action URL", altere para: `https://italosantos.com/auth/action`
   - Personalize o template (opcional):
     ```
     Olá,

     Obrigado por se registrar em __APP_NAME__!

     Para verificar seu e-mail, clique no link abaixo:
     %LINK%

     Se você não solicitou isso, ignore este e-mail.

     Atenciosamente,
     Equipe __APP_NAME__
     ```
   - Clique em "Salvar"

   **b) Redefinição de Senha (Password reset)**
   - Clique em "Editar"
   - Action URL: `https://italosantos.com/auth/action`
   - Template sugerido:
     ```
     Olá,

     Você solicitou a redefinição de senha para sua conta em __APP_NAME__.

     Clique no link abaixo para criar uma nova senha:
     %LINK%

     Este link expira em 1 hora.

     Se você não solicitou isso, ignore este e-mail.

     Atenciosamente,
     Equipe __APP_NAME__
     ```
   - Clique em "Salvar"

   **c) Alteração de E-mail (Email change)**
   - Clique em "Editar"
   - Action URL: `https://italosantos.com/auth/action`
   - Template sugerido:
     ```
     Olá,

     Você solicitou a alteração do e-mail da sua conta em __APP_NAME__.

     Para confirmar o novo endereço de e-mail, clique no link:
     %LINK%

     Se você não solicitou isso, ignore este e-mail e entre em contato conosco.

     Atenciosamente,
     Equipe __APP_NAME__
     ```
   - Clique em "Salvar"

   **d) Configuração Multifatorial (MFA Enrollment)**
   - Clique em "Editar"
   - Action URL: `https://italosantos.com/auth/action`
   - Template sugerido:
     ```
     Olá,

     Você está configurando autenticação multifatorial (MFA) em __APP_NAME__.

     Para concluir, clique no link:
     %LINK%

     Se você não solicitou isso, entre em contato conosco imediatamente.

     Atenciosamente,
     Equipe __APP_NAME__
     ```
   - Clique em "Salvar"

3. **Personalizações Adicionais (Opcional)**

   Substitua as variáveis padrão:
   - `__APP_NAME__` → `Italo Santos`
   - `__PROJECT_NAME__` → `Italo Santos`
   - Adicione logotipo (URL da imagem)
   - Personalize cores e estilo

## 🧪 Teste

Após configurar, teste cada fluxo:

### Teste 1: Verificação de E-mail
```bash
# No console do navegador ou via código
import { sendEmailVerification } from 'firebase/auth';
await sendEmailVerification(currentUser);
```

### Teste 2: Redefinição de Senha
```bash
# No console do navegador ou via código
import { sendPasswordResetEmail } from 'firebase/auth';
await sendPasswordResetEmail(auth, 'user@example.com');
```

### Teste 3: Alteração de E-mail
```bash
# No console do navegador ou via código
import { verifyBeforeUpdateEmail } from 'firebase/auth';
await verifyBeforeUpdateEmail(currentUser, 'newemail@example.com');
```

## 🔍 Verificação

Verifique se os links nos e-mails têm este formato:

✅ **CORRETO:**
```
https://italosantos.com/auth/action?mode=resetPassword&oobCode=ABC123XYZ&apiKey=AIzaSy...
```

❌ **INCORRETO:**
```
https://projeto-italo-bc5ef.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=ABC123XYZ
```

## 📋 Tipos de Links de Ação

| Mode | Descrição | Página |
|------|-----------|--------|
| `resetPassword` | Redefinição de senha | `/auth/action` |
| `verifyEmail` | Verificação de e-mail | `/auth/action` |
| `recoverEmail` | Recuperação de e-mail | `/auth/action` |
| `verifyAndChangeEmail` | Verificar e alterar e-mail | `/auth/action` |
| `mfaEnrollment` | Registro MFA | `/auth/action` |
| `mfaSignIn` | Login MFA | `/auth/action` |

## 🔧 Troubleshooting

### Problema: Links ainda redirecionam para /_/auth/action

**Solução 1:** Limpe o cache e faça novo deploy
```bash
npm run build
firebase deploy --only hosting
```

**Solução 2:** Verifique se o rewrite está no firebase.json
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/_/auth/action",
        "destination": "/auth/action"
      }
    ]
  }
}
```

**Solução 3:** Force refresh dos templates no Firebase Console
- Faça logout do Firebase Console
- Faça login novamente
- Verifique os templates novamente

### Problema: E-mails não são enviados

**Causa:** SMTP não configurado ou credenciais inválidas

**Solução:** Verifique as variáveis de ambiente SMTP:
```env
SMTP_HOST=smtp.mail.me.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=is@italosantos.com
SMTP_PASS=iwdg-lafl-vxct-byix
SMTP_FROM="Italo Santos <is@italosantos.com>"
```

### Problema: Links expiram muito rápido

**Causa:** Configuração padrão do Firebase (1 hora)

**Solução:** Não é possível alterar o tempo de expiração via código. É uma configuração do Firebase Authentication.

## 📚 Referências

- [Firebase Auth Email Templates](https://firebase.google.com/docs/auth/custom-email-handler)
- [Firebase Hosting Rewrites](https://firebase.google.com/docs/hosting/full-config#rewrites)
- [Next.js Custom Server](https://nextjs.org/docs/pages/building-your-application/configuring/custom-server)

## ✅ Checklist de Configuração

- [x] Rewrite adicionado no `firebase.json`
- [x] Variável `EMAIL_ACTION_BASE_URL` configurada
- [ ] Template "Verificação de E-mail" atualizado no Firebase Console
- [ ] Template "Redefinição de Senha" atualizado no Firebase Console
- [ ] Template "Alteração de E-mail" atualizado no Firebase Console
- [ ] Template "Configuração MFA" atualizado no Firebase Console
- [ ] Templates personalizados com logo e cores
- [ ] Testes de envio de e-mail realizados
- [ ] Links testados e funcionando corretamente

## 🎉 Resultado Final

Após completar a configuração, todos os links de autenticação do Firebase redirecionarão para:

```
https://italosantos.com/auth/action?mode=MODE&oobCode=CODE&apiKey=KEY
```

E a página `/auth/action` processará corretamente todos os tipos de ações de autenticação.
