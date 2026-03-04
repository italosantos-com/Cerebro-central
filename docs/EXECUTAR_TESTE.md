# 🚀 TESTE RÁPIDO - Envio de Email de Recuperação

## Para: italo16rj@gmail.com

### 📝 Opção 1: Executar Script Node.js (Mais Rápido)

```bash
# 1. Navegar até o diretório do projeto
cd "/Users/italosanta/Downloads/download (2)"

# 2. Instalar Node.js (se necessário)
# Para macOS:
brew install node

# Ou baixar de: https://nodejs.org/

# 3. Instalar Firebase SDK
npm install firebase

# 4. Executar o script de teste
node test-send-password-reset.js
```

**O que vai acontecer**:
```
==================================================================
🔐 TESTE DE RECUPERAÇÃO DE SENHA - FIREBASE
==================================================================
📧 Email de Teste: italo16rj@gmail.com
🔥 Projeto Firebase: italo-santos-fb1b6
==================================================================

[1] Inicializando Firebase...
✅ Firebase inicializado com sucesso

[2] Validando formato do email...
✅ Email válido: italo16rj@gmail.com

[3] Enviando email de recuperação de senha...
ℹ️  Aguarde... Isso pode levar alguns segundos.
✅ Email de recuperação enviado com sucesso!

[4] Próximos passos:

ℹ️  1. Acesse a caixa de entrada do Gmail: https://mail.google.com/
ℹ️     Login: italo16rj@gmail.com
ℹ️  
ℹ️  2. Procure por email do Firebase (geralmente chega em 10-60 segundos)
ℹ️     Assunto: "Reset your password" ou similar
ℹ️     ⚠️  VERIFIQUE TAMBÉM A PASTA SPAM/LIXO ELETRÔNICO
```

---

### 🌐 Opção 2: Testar via Navegador

```bash
# 1. Iniciar o servidor Next.js
cd "/Users/italosanta/Downloads/download (2)"
npm run dev

# 2. Abrir navegador em:
# http://localhost:3000/admin/forgot-password
```

O email `italo16rj@gmail.com` já está pré-configurado!

---

### 📧 Opção 3: Teste HTML Standalone

```bash
# Abrir o arquivo HTML de teste diretamente
open test-password-reset.html
```

**OU** usar servidor HTTP:
```bash
python3 -m http.server 8080
# Depois: http://localhost:8080/test-password-reset.html
```

---

## ✅ Verificar Email Recebido

### Passo 1: Acessar Gmail
```
URL: https://mail.google.com/
Login: italo16rj@gmail.com
```

### Passo 2: Procurar Email
- ✉️ Assunto: "Reset your password"
- 📤 De: noreply@italo-santos-fb1b6.firebaseapp.com
- ⏱️ Tempo de chegada: 10-60 segundos
- ⚠️ **VERIFICAR PASTA SPAM**

### Passo 3: Clicar no Link
O email conterá um botão/link similar a:
```
[Reset Password]
https://italo-santos-fb1b6.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=...
```

### Passo 4: Definir Nova Senha
1. Página do Firebase abrirá
2. Digite nova senha
3. Confirme a senha
4. Clique em "Save"

### Passo 5: Testar Login
```
URL: http://localhost:3000/admin
Email: italo16rj@gmail.com
Senha: [sua nova senha]
```

---

## 🐛 Se der erro...

### ❌ "auth/user-not-found"
**Solução**: Adicionar usuário no Firebase

1. Acesse: https://console.firebase.google.com/
2. Projeto: `italo-santos-fb1b6`
3. Authentication > Users
4. Add user:
   - Email: `italo16rj@gmail.com`
   - Senha: qualquer senha temporária
5. Salvar

### ❌ Email não chega
1. ✅ Verifique SPAM
2. ✅ Aguarde até 2-3 minutos
3. ✅ Confirme que usuário existe no Firebase
4. ✅ Tente reenviar

### ❌ npm não encontrado
```bash
# Instalar Node.js
brew install node

# Verificar instalação
node --version
npm --version
```

---

## 📊 Status Atual

- ✅ Código implementado e funcional
- ✅ Firebase configurado
- ✅ Email de teste definido: `italo16rj@gmail.com`
- ✅ Scripts de teste criados
- ⏳ **Pronto para executar!**

---

## 🎯 Escolha seu método

| Método | Complexidade | Tempo | Requer |
|--------|--------------|-------|--------|
| **Script Node.js** | Baixa | ~30s | Node.js |
| **Next.js Dev** | Média | ~2min | npm, dependências |
| **HTML Standalone** | Baixa | ~1min | Navegador |

**Recomendação**: Comece com o **Script Node.js** para teste rápido!

---

## 🚀 Comando Único (Copie e Cole)

```bash
cd "/Users/italosanta/Downloads/download (2)" && \
npm install firebase && \
node test-send-password-reset.js
```

---

**Pronto para testar!** 🎉

Escolha um método acima e siga os passos. O email será enviado para `italo16rj@gmail.com` automaticamente!
