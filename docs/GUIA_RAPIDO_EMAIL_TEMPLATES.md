# 🎯 Guia Rápido - Configuração Firebase Email Templates

## 📍 URLs Importantes

### Firebase Console
```
https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/emails
```

### Página de Ação (Handler)
```
Produção: https://italosantos.com/auth/action
Local: http://localhost:3001/auth/action
```

---

## ⚡ Configuração em 5 Minutos

### 1️⃣ Email Verification (Verificação de E-mail)
```
Template: verify-email.html
Action URL: https://italosantos.com/auth/action
Mode: verifyEmail
Função: applyActionCode()
```

### 2️⃣ Password Reset (Redefinição de Senha)
```
Template: reset-password.html
Action URL: https://italosantos.com/auth/action
Mode: resetPassword
Funções: verifyPasswordResetCode() + confirmPasswordReset()
```

### 3️⃣ Email Change (Alteração de E-mail)
```
Template: email-changed.html
Action URL: https://italosantos.com/auth/action
Mode: verifyAndChangeEmail
Funções: checkActionCode() + applyActionCode()
```

### 4️⃣ MFA Notification (Notificação de 2FA)
```
Template: mfa-enabled.html
Tipo: Informativo (não requer ação)
```

---

## 🎨 Templates Personalizados

Todos os templates possuem:

✅ **Design Moderno**
- Tema dark com gradientes neon
- Logo "IS" com efeito de brilho
- Cards com glassmorphism
- Animações suaves

✅ **Cores Temáticas**
- 🔴 Vermelho: Verificação e Reset (ação importante)
- 🟠 Laranja: Alteração de e-mail (mudança)
- 🟢 Verde: MFA/Segurança (proteção)

✅ **Conteúdo Rico**
- Saudação personalizada
- Explicações claras
- Botões de ação destacados
- Links alternativos
- Avisos de segurança
- Dicas úteis

---

## 🔐 Variáveis Disponíveis

```javascript
%APP_NAME%        // Nome do aplicativo
%DISPLAY_NAME%    // Nome do usuário
%EMAIL%           // E-mail do usuário
%NEW_EMAIL%       // Novo e-mail (para alteração)
%LINK%            // Link de ação com oobCode
%SECOND_FACTOR%   // Método de 2FA (SMS, telefone, etc.)
```

---

## 📝 Parâmetros da URL de Ação

```
https://italosantos.com/auth/action?mode=MODE&oobCode=CODE

mode = verifyEmail | resetPassword | recoverEmail | verifyAndChangeEmail
oobCode = Código único gerado pelo Firebase
```

---

## 🚀 Deploy Checklist

### Antes do Deploy:
- [ ] Templates HTML atualizados em `/email-templates/`
- [ ] Página de ação `/src/app/auth/action/page.tsx` testada
- [ ] Build local sem erros: `npm run build`
- [ ] Testes locais OK

### Configuração Firebase:
- [ ] Action URLs configuradas para todos os 4 tipos
- [ ] Domínio adicionado aos Authorized Domains
- [ ] Templates salvos no Firebase Console

### Após Deploy:
- [ ] Teste verificação de e-mail em produção
- [ ] Teste reset de senha em produção
- [ ] Teste alteração de e-mail em produção
- [ ] Verificar logs no Firebase Console
- [ ] Testar em mobile

---

## 🔍 Como Funciona

### 1. Usuário Aciona Evento
```typescript
// Exemplo: Solicitar verificação de e-mail
await sendEmailVerification(auth.currentUser);
```

### 2. Firebase Envia E-mail
```
Usa template personalizado: verify-email.html
Substitui variáveis: %DISPLAY_NAME%, %LINK%, etc.
Link contém: mode=verifyEmail&oobCode=ABC123...
```

### 3. Usuário Clica no Link
```
Redirecionado para: https://italosantos.com/auth/action?mode=verifyEmail&oobCode=ABC123
```

### 4. Página Processa Ação
```typescript
// /src/app/auth/action/page.tsx
const mode = searchParams.get('mode');  // 'verifyEmail'
const oobCode = searchParams.get('oobCode');  // 'ABC123...'

// Verifica e aplica ação
await checkActionCode(auth, oobCode);
await applyActionCode(auth, oobCode);
```

### 5. Feedback ao Usuário
```
Toast de sucesso
Animação de confirmação
Redirecionamento automático
```

---

## 🎯 Implementação nos Handlers

### verifyEmail
```typescript
const handleVerifyEmail = async () => {
  await applyActionCode(auth, oobCode);
  toast({ title: "E-mail Verificado!" });
  router.push('/');
};
```

### resetPassword
```typescript
const handleResetPassword = async () => {
  await verifyPasswordResetCode(auth, oobCode);
  await confirmPasswordReset(auth, oobCode, newPassword);
  toast({ title: "Senha Redefinida!" });
  router.push('/auth/face');
};
```

### verifyAndChangeEmail
```typescript
const handleVerifyAndChangeEmail = async () => {
  const info = await checkActionCode(auth, oobCode);
  // info.operation === 'VERIFY_AND_CHANGE_EMAIL'
  await applyActionCode(auth, oobCode);
  toast({ title: "E-mail Alterado!" });
  router.push('/perfil');
};
```

### recoverEmail
```typescript
const handleRecoverEmail = async () => {
  await applyActionCode(auth, oobCode);
  toast({ title: "E-mail Recuperado!" });
  router.push('/perfil');
};
```

---

## 🐛 Troubleshooting Rápido

### E-mail não chega
```
1. Verifique spam/lixeira
2. Confirme que Firebase Auth está ativado
3. Verifique se o e-mail está cadastrado
```

### Link não funciona
```
1. Verifique se domínio está nos Authorized Domains
2. Confirme Action URL está configurada
3. Link expira após 24h (verify) ou 1h (reset)
```

### Erro "auth/invalid-action-code"
```
1. Link já foi usado
2. Link expirou
3. Solicite novo link
```

### Página não carrega corretamente
```
1. Limpe cache do navegador
2. Teste em modo incógnito
3. Verifique console (F12) para erros
```

---

## 📊 Monitoramento

### Firebase Console
```
https://console.firebase.google.com/project/projeto-italo-bc5ef/authentication/users

- Usuários verificados
- Tentativas de login
- Redefinições de senha
```

### Logs de Erro
```typescript
// Adicione no handler
try {
  await applyActionCode(auth, oobCode);
} catch (error) {
  console.error('Erro:', error.code, error.message);
  // Envie para analytics/sentry
}
```

---

## ✅ Status Atual

### ✅ Implementado
- [x] 4 templates HTML personalizados
- [x] Página de ação com todos os handlers
- [x] Design responsivo e moderno
- [x] Tratamento de erros
- [x] Feedback visual (toasts)
- [x] Validações de segurança
- [x] Documentação completa

### 🔄 Pendente
- [ ] Configurar no Firebase Console
- [ ] Adicionar domínio aos Authorized Domains
- [ ] Fazer deploy
- [ ] Testar em produção

---

## 📞 Links Úteis

- [Documentação Firebase Auth](https://firebase.google.com/docs/auth)
- [Action Code Settings](https://firebase.google.com/docs/auth/web/passing-state-in-email-actions)
- [Email Templates](https://firebase.google.com/docs/auth/custom-email-handler)

---

**🚀 Sistema pronto para configuração no Firebase Console!**

Próximo passo: Acesse o Firebase Console e configure as Action URLs conforme este guia.
