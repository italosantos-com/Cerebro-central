# 🧪 Guia de Teste - Recuperação de Senha para italo16rj@gmail.com

## 📋 Pré-requisitos

### 1. Instalar Node.js e npm (Se ainda não tiver)
```bash
# Para macOS (usando Homebrew)
brew install node

# Verificar instalação
node --version
npm --version
```

### 2. Configurar Email no Firebase

Antes de testar, você precisa garantir que o email `italo16rj@gmail.com` está cadastrado no Firebase Authentication.

**Passos**:
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Authentication** > **Users**
4. Verifique se `italo16rj@gmail.com` está na lista
5. Se não estiver, clique em **Add user** e crie:
   - Email: `italo16rj@gmail.com`
   - Senha: escolha uma senha temporária
   - ✅ Marque "Email verified"

## 🚀 Opção 1: Teste com Aplicação Next.js (Recomendado)

### Passo 1: Instalar Dependências
```bash
cd "/Users/italosanta/Downloads/download (2)"
npm install
```

### Passo 2: Verificar Variáveis de Ambiente
```bash
# Verificar se .env.local existe
cat .env.local | grep FIREBASE

# Deve mostrar as variáveis:
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# etc.
```

### Passo 3: Iniciar Servidor de Desenvolvimento
```bash
npm run dev
```

Aguarde a mensagem:
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

### Passo 4: Acessar a Aplicação

1. Abra o navegador em: **http://localhost:3000/admin**
2. Você verá a página de login admin
3. Clique em **"Esqueci minha senha"**
4. Será redirecionado para: **http://localhost:3000/admin/forgot-password**

### Passo 5: Testar Recuperação

**No formulário**:
1. Campo de email deve estar visível
2. Digite: `italo16rj@gmail.com`
3. Clique em **"Enviar Link de Recuperação"**

**O que deve acontecer**:
1. Botão muda para "Enviando..."
2. Após 1-2 segundos:
   - ✅ Toast de sucesso aparece
   - 🎉 Tela muda para confirmação
   - 📧 Mostra: "Um email foi enviado para: italo16rj@gmail.com"

### Passo 6: Verificar Email

1. Abra o Gmail: https://mail.google.com/
2. Login com `italo16rj@gmail.com`
3. Procure por email do Firebase (geralmente chega em 10-60 segundos)
4. **Verifique também a pasta SPAM/LIXO ELETRÔNICO**

**Assunto do email**: 
- "Reset your password" 
- ou "Redefinir sua senha"

**Conteúdo do email**:
- Link para redefinir senha
- URL começando com seu domínio Firebase

### Passo 7: Clicar no Link

1. No email, clique no botão/link de recuperação
2. Será redirecionado para página do Firebase
3. Formulário para criar nova senha aparecerá

**URL será similar a**:
```
https://seuapp.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=ABC123...
```

### Passo 8: Definir Nova Senha

1. Digite uma nova senha forte
2. Confirme a senha
3. Clique em "Save" / "Salvar"

**Requisitos da senha** (podem variar):
- Mínimo 6 caracteres (padrão Firebase)
- Pode exigir letras e números

### Passo 9: Fazer Login

1. Volte para: http://localhost:3000/admin
2. Digite:
   - Email: `italo16rj@gmail.com`
   - Senha: **sua nova senha**
3. Clique em "Entrar"

**Resultado esperado**:
- ✅ Login bem-sucedido
- Redirecionado para painel admin

---

## 🖥️ Opção 2: Teste com HTML Standalone

Se você não conseguir rodar o Next.js, pode usar o arquivo HTML de teste que criei.

### Passo 1: Configurar Firebase no HTML

Edite o arquivo: `test-password-reset.html`

Substitua as credenciais Firebase (linhas 222-228):
```javascript
const firebaseConfig = {
    apiKey: "cole_sua_api_key_aqui",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

**Onde encontrar essas informações**:
1. Firebase Console > Configurações do Projeto
2. Role até "Seus apps"
3. Copie o `firebaseConfig`

### Passo 2: Abrir o HTML

```bash
# Opção 1: Abrir diretamente no navegador
open test-password-reset.html

# Opção 2: Usar servidor HTTP simples (se tiver Python)
python3 -m http.server 8080
# Depois acesse: http://localhost:8080/test-password-reset.html
```

### Passo 3: Testar

O email `italo16rj@gmail.com` já está pré-preenchido!

1. Clique em **"Enviar Link de Recuperação"**
2. Aguarde o email
3. Siga os passos 6-9 da Opção 1

---

## 📊 Console de Debug

### Ver Logs no Navegador

Abra o Console do Desenvolvedor:
- Chrome/Edge: `Cmd + Option + J` (Mac) ou `F12` (Windows)
- Safari: `Cmd + Option + C`

**Logs esperados**:
```
[Forgot Password] Enviando email de recuperação para: italo16rj@gmail.com
[Forgot Password] Email enviado com sucesso
```

**Em caso de erro**:
```
[Forgot Password] Erro ao enviar email: FirebaseError: auth/user-not-found
```

---

## 🔍 Troubleshooting

### ❌ Email não chega

**Verificações**:
1. ✅ Verifique pasta SPAM
2. ✅ Confirme que `italo16rj@gmail.com` está cadastrado no Firebase
3. ✅ Verifique Firebase Console > Authentication > Templates
4. ✅ Aguarde até 2-3 minutos

**Solução**:
```bash
# Verificar usuários no Firebase (requer firebase-tools)
firebase auth:export users.json --project seu-projeto-id

# Adicionar usuário manualmente
# Firebase Console > Authentication > Add user
```

### ❌ Erro: "auth/user-not-found"

**Causa**: Email não existe no Firebase Authentication

**Solução**:
1. Firebase Console > Authentication > Users
2. Click "Add user"
3. Email: `italo16rj@gmail.com`
4. Senha: qualquer senha temporária
5. Salvar

### ❌ Erro: "auth/invalid-api-key"

**Causa**: Credenciais Firebase incorretas

**Solução**:
1. Verifique `.env.local`
2. Confirme `NEXT_PUBLIC_FIREBASE_API_KEY`
3. Compare com Firebase Console

### ❌ npm não encontrado

**Solução**:
```bash
# Instalar Node.js
brew install node

# Ou baixar de: https://nodejs.org/
```

### ❌ Porta 3000 ocupada

**Solução**:
```bash
# Usar outra porta
npm run dev -- -p 3001

# Ou matar processo na porta 3000
lsof -ti:3000 | xargs kill -9
```

---

## 📧 Exemplo de Email Recebido

```
De: noreply@seudominio.com
Para: italo16rj@gmail.com
Assunto: Reset your password

Hi italo16rj,

We received a request to reset the password for your account.

[Reset Password]
(https://seuapp.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=...)

If you didn't request this, you can safely ignore this email.

This link will expire in 1 hour.
```

---

## ✅ Checklist de Teste

### Preparação
- [ ] Node.js instalado
- [ ] Dependências npm instaladas
- [ ] Firebase configurado
- [ ] Email `italo16rj@gmail.com` cadastrado no Firebase

### Teste de Interface
- [ ] Página `/admin/forgot-password` carrega
- [ ] Email está pré-preenchido: `italo16rj@gmail.com`
- [ ] Botão "Enviar Link de Recuperação" visível
- [ ] Botão "Voltar ao Login" visível

### Envio de Email
- [ ] Clique no botão de envio
- [ ] Botão muda para "Enviando..."
- [ ] Toast de sucesso aparece
- [ ] Tela de confirmação aparece
- [ ] Email exibido: `italo16rj@gmail.com`

### Recebimento de Email
- [ ] Email chega em até 2 minutos
- [ ] Assunto correto
- [ ] Link presente no email
- [ ] Link não expirado (<1 hora)

### Redefinição de Senha
- [ ] Link abre página do Firebase
- [ ] Formulário de nova senha aparece
- [ ] Senha aceita requisitos
- [ ] Confirmação de sucesso

### Login com Nova Senha
- [ ] Retorna para `/admin`
- [ ] Faz login com nova senha
- [ ] Login bem-sucedido
- [ ] Redireciona para painel

---

## 🎥 Captura de Tela Esperada

### Tela 1: Formulário
```
┌─────────────────────────────────┐
│  🛡️ Recuperar Senha            │
│  Insira seu email...            │
│                                 │
│  📧 Email                       │
│  [italo16rj@gmail.com____]     │
│  ℹ️ Você receberá um email...  │
│                                 │
│  [Enviar Link de Recuperação]   │
│  [Voltar ao Login]              │
└─────────────────────────────────┘
```

### Tela 2: Sucesso
```
┌─────────────────────────────────┐
│  🛡️ Recuperar Senha            │
│  Email enviado com sucesso!     │
│                                 │
│        ✅                        │
│  Um email foi enviado para:     │
│  italo16rj@gmail.com            │
│                                 │
│  Verifique sua caixa de         │
│  entrada e spam...              │
│                                 │
│  [Enviar Novamente]             │
│  [Voltar ao Login]              │
└─────────────────────────────────┘
```

---

## 📝 Relatório de Teste

Após testar, preencha:

**Data do Teste**: _______________
**Testador**: Italo Santos
**Email Testado**: italo16rj@gmail.com

**Resultados**:
- [ ] ✅ Email enviado com sucesso
- [ ] ✅ Email recebido em ___ minutos
- [ ] ✅ Link funcionou
- [ ] ✅ Senha redefinida com sucesso
- [ ] ✅ Login funcionou com nova senha

**Observações**:
_________________________________

**Status Final**: [ ] ✅ Aprovado [ ] ❌ Falhou

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:

1. **Verifique os logs do console**
2. **Confirme usuário no Firebase**
3. **Teste com outro email**
4. **Verifique configuração do Firebase**

**Comando de debug útil**:
```bash
# Ver configuração Firebase
cat .env.local | grep FIREBASE
```

---

**Pronto para testar!** 🚀

Siga os passos da **Opção 1** se tiver Node.js instalado, ou **Opção 2** para teste rápido.
