# Templates de E-mail Firebase

Este diretório contém templates HTML personalizados para os e-mails de autenticação do Firebase.

## 📧 Templates Disponíveis

### 1. **verify-email.html** - Verificação de E-mail
- **Cor principal:** Vermelho (#ff0000)
- **Quando é enviado:** Ao criar uma nova conta
- **Ação:** Verifica o endereço de e-mail do usuário
- **Link de ação:** `https://italosantos.com/auth/action?mode=verifyEmail&oobCode=%OOBCODE%`

### 2. **reset-password.html** - Redefinição de Senha
- **Cor principal:** Vermelho (#ff0000)
- **Quando é enviado:** Quando o usuário clica em "Esqueci minha senha"
- **Ação:** Permite criar uma nova senha
- **Link de ação:** `https://italosantos.com/auth/action?mode=resetPassword&oobCode=%OOBCODE%`
- **Expira em:** 1 hora

### 3. **email-changed.html** - Alteração de E-mail
- **Cor principal:** Laranja (#ff8800)
- **Quando é enviado:** Quando o e-mail da conta é alterado
- **Ação:** Permite reverter a alteração se não autorizada
- **Link de ação:** `https://italosantos.com/auth/action?mode=recoverEmail&oobCode=%OOBCODE%`
- **Expira em:** 24 horas

### 4. **mfa-enabled.html** - Autenticação Multifator
- **Cor principal:** Verde (#00cc00)
- **Quando é enviado:** Quando a autenticação em duas etapas é ativada
- **Ação:** Permite remover a verificação se não autorizada
- **Link de ação:** `https://italosantos.com/auth/action?mode=verifyAndChangeEmail&oobCode=%OOBCODE%`

## 🎨 Design

Todos os templates seguem o design visual do aplicativo:

- **Tema escuro** com fundo preto (#0a0a0a)
- **Logo "IS"** com efeito neon
- **Gradientes** nas cores principais
- **Responsivos** para mobile e desktop
- **Efeitos de sombra** neon consistentes com o app

## 📋 Variáveis do Firebase

Os templates utilizam as seguintes variáveis que são substituídas automaticamente pelo Firebase:

- `%APP_NAME%` - Nome do aplicativo
- `%DISPLAY_NAME%` - Nome de exibição do usuário
- `%EMAIL%` - E-mail do usuário
- `%NEW_EMAIL%` - Novo e-mail (apenas em email-changed)
- `%LINK%` - Link de ação completo
- `%OOBCODE%` - Código de ação único
- `%SECOND_FACTOR%` - Método de segundo fator (SMS, app, etc.)

## 🔧 Como Configurar no Firebase

### Passo 1: Acessar o Console
1. Vá para https://console.firebase.google.com
2. Selecione seu projeto
3. Navegue até **Authentication** → **Templates**

### Passo 2: Configurar cada Template

Para cada tipo de e-mail:

1. Clique no botão **Editar** (ícone de lápis)
2. Copie o conteúdo HTML do arquivo correspondente
3. Cole no editor de template do Firebase
4. Configure a **Action URL** conforme indicado
5. Clique em **Salvar**

### Passo 3: Configurar Domínios Autorizados

1. Vá em **Authentication** → **Settings** → **Authorized domains**
2. Adicione `italosantos.com` se ainda não estiver na lista
3. Salve as alterações

## 🧪 Testando os Templates

### Página de Teste
Acesse: `https://italosantos.com/auth/action/test`

Esta página permite testar visualmente cada modal sem precisar enviar e-mails reais.

### Teste Real

1. **Verificação de E-mail:**
   - Crie uma nova conta no app
   - Verifique sua caixa de entrada

2. **Redefinição de Senha:**
   - Na tela de login, clique em "Esqueci minha senha"
   - Insira seu e-mail

3. **Alteração de E-mail:**
   - Vá em Perfil → Configurações
   - Altere seu e-mail
   - Verifique a caixa de entrada do e-mail antigo

4. **MFA:**
   - Ative a autenticação em duas etapas nas configurações
   - Verifique sua caixa de entrada

## 📱 Página de Ação

**Rota:** `/auth/action`

### Parâmetros da URL:
- `mode` - Tipo de ação
- `oobCode` - Código único do Firebase

### Modos Suportados:
- `verifyEmail` - Verifica e-mail
- `resetPassword` - Redefine senha
- `recoverEmail` - Recupera e-mail anterior
- `verifyAndChangeEmail` - Confirma alteração de e-mail

### Funcionalidades:
- ✅ 4 modais flutuantes responsivos
- ✅ Validação automática do código
- ✅ Mensagens de erro para links inválidos
- ✅ Feedback visual de sucesso
- ✅ Redirecionamento automático
- ✅ Design neon consistente

## 🎯 URLs de Ação

Configure estas URLs no Firebase para cada tipo de e-mail:

```
Verificação de E-mail:
https://italosantos.com/auth/action?mode=verifyEmail&oobCode=%OOBCODE%

Redefinição de Senha:
https://italosantos.com/auth/action?mode=resetPassword&oobCode=%OOBCODE%

Recuperar E-mail:
https://italosantos.com/auth/action?mode=recoverEmail&oobCode=%OOBCODE%

MFA (Multifator):
https://italosantos.com/auth/action?mode=verifyAndChangeEmail&oobCode=%OOBCODE%
```

## 🔒 Segurança

- Todos os links expiram automaticamente
- Códigos de ação são de uso único
- Validação server-side pelo Firebase
- Proteção contra links inválidos
- Mensagens claras de segurança

## 📝 Personalização

Para personalizar os templates:

1. Edite os arquivos HTML neste diretório
2. Ajuste cores, textos e estilos
3. Teste localmente com a página `/auth/action/test`
4. Atualize no Firebase Console

### Cores dos Templates:
- **Vermelho** (#ff0000): Verificação e redefinição
- **Laranja** (#ff8800): Alteração de e-mail (alerta)
- **Verde** (#00cc00): Segurança (MFA ativada)

## 📖 Documentação Adicional

Consulte também:
- `FIREBASE_EMAIL_TEMPLATES.md` - Guia detalhado de configuração
- `/src/app/auth/action/page.tsx` - Código da página de ação
- `/src/app/auth/action/test/page.tsx` - Página de testes

## 🆘 Solução de Problemas

### Link não funciona
- Verifique se o domínio está autorizado no Firebase
- Confirme que a Action URL está correta
- Verifique se o código não expirou

### E-mail não chega
- Verifique a pasta de spam
- Confirme que o e-mail está correto
- Verifique as configurações de SMTP do Firebase

### Modal não abre
- Verifique o console do navegador
- Confirme que os parâmetros da URL estão corretos
- Teste com a página `/auth/action/test` primeiro

---

**Desenvolvido para italosantos.com** 🔥
