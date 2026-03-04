# Sistema de Recuperação de Senha - Admin

## 📋 Visão Geral

Sistema integrado de recuperação de senha para administradores utilizando o Firebase Authentication. Esta implementação substitui o sistema anterior de códigos de verificação por email/SMS pelo método padrão do Firebase.

## 🎯 Funcionalidades

### 1. **Página de Recuperação de Senha**
- **Rota**: `/admin/forgot-password`
- **Acesso**: Link "Esqueci minha senha" na página de login admin
- **Funcionalidade**: Permite que administradores solicitem um email de recuperação

### 2. **Fluxo de Recuperação**

#### Passo 1: Solicitar Recuperação
1. Usuário acessa `/admin/forgot-password`
2. Insere o email cadastrado
3. Sistema valida o formato do email
4. Firebase envia email com link de recuperação

#### Passo 2: Resetar Senha
1. Usuário clica no link recebido por email
2. É redirecionado para página do Firebase
3. Define nova senha
4. Pode fazer login com a nova senha

## 🔧 Implementação Técnica

### Arquivos Modificados

#### 1. `/src/app/admin/forgot-password/page.tsx`
```typescript
// Componente principal
- Remove dependência de SMS e códigos de verificação
- Integra com Firebase Authentication
- Adiciona validação de email
- Exibe confirmação visual após envio
- Tratamento de erros do Firebase
```

#### 2. `/src/services/admin-auth-service.ts`
```typescript
// Função já existente
export const sendAdminPasswordResetEmail = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};
```

### Estados da Interface

1. **Estado Inicial**
   - Campo de email vazio
   - Botão "Enviar Link de Recuperação"
   - Botão "Voltar ao Login"

2. **Estado de Envio**
   - Botão desabilitado
   - Texto "Enviando..."
   - Campo de email desabilitado

3. **Estado de Sucesso**
   - Ícone de confirmação (CheckCircle)
   - Mensagem de sucesso
   - Email do usuário exibido
   - Opções: "Enviar Novamente" ou "Voltar ao Login"

## 🎨 UI/UX

### Design
- Card centralizado com logo de segurança (ShieldCheck)
- Botão de voltar no canto superior esquerdo
- Feedback visual claro em todas as etapas
- Mensagens de erro específicas do Firebase

### Mensagens de Erro

| Código Firebase | Mensagem para Usuário |
|----------------|----------------------|
| `auth/user-not-found` | "Nenhuma conta encontrada com este email." |
| `auth/invalid-email` | "Email inválido." |
| `auth/too-many-requests` | "Muitas tentativas. Tente novamente mais tarde." |
| Outros erros | "Não foi possível enviar o email de recuperação." |

## 🔐 Segurança

### Proteções Implementadas
1. ✅ Validação de formato de email
2. ✅ Rate limiting do Firebase (previne spam)
3. ✅ Links temporários (expiram automaticamente)
4. ✅ Não revela se o email existe no sistema (segurança)

### Configuração Firebase
O Firebase Authentication já está configurado em `/src/lib/firebase.ts` com:
- Auth domain configurado
- Templates de email personalizáveis no Firebase Console

## 📱 Como Usar

### Para Usuários Finais
1. Acesse a página de login admin
2. Clique em "Esqueci minha senha"
3. Digite seu email de administrador
4. Verifique sua caixa de entrada (e spam)
5. Clique no link recebido
6. Defina sua nova senha
7. Faça login normalmente

### Para Desenvolvedores
```typescript
// Usar a função de recuperação
import { sendAdminPasswordResetEmail } from '@/services/admin-auth-service';

try {
  await sendAdminPasswordResetEmail(email);
  // Email enviado com sucesso
} catch (error) {
  // Tratar erro
  console.error(error.code, error.message);
}
```

## 🧪 Testes

### Teste Manual
1. Acesse `/admin/forgot-password`
2. Teste com email inválido → deve mostrar erro
3. Teste com email válido → deve enviar email
4. Verifique email recebido
5. Clique no link e redefina senha
6. Teste login com nova senha

### Cenários de Teste
- ✅ Email válido cadastrado no sistema
- ✅ Email válido mas não cadastrado
- ✅ Email com formato inválido
- ✅ Múltiplas tentativas (rate limiting)
- ✅ Link expirado
- ✅ Fluxo completo de recuperação

## 🎯 Vantagens sobre o Sistema Anterior

| Aspecto | Sistema Anterior | Sistema Atual |
|---------|-----------------|---------------|
| Complexidade | Alto (email + SMS) | Baixo (apenas email) |
| Dependências | 2 serviços externos | 1 serviço (Firebase) |
| Manutenção | Códigos expiravam, precisavam armazenamento | Gerenciado pelo Firebase |
| Segurança | Custom implementation | Battle-tested pelo Google |
| UX | Dois passos (email + SMS) | Um passo (apenas email) |
| Custo | Email + SMS | Apenas email (grátis no Firebase) |

## 🔄 Migração

### O que foi removido:
- ❌ Dependência de `sendVerificationCode` para SMS
- ❌ Função `getPhoneFromEmail`
- ❌ Navegação para `/admin/reset-password` com códigos
- ❌ Sistema de verificação dupla (email + SMS)

### O que foi mantido:
- ✅ Rota `/admin/forgot-password`
- ✅ Link "Esqueci minha senha" no login
- ✅ Design e UI components
- ✅ Integração com Firebase Auth

## 📝 Configuração Adicional (Opcional)

### Personalizar Email Template
1. Acesse Firebase Console
2. Vá em Authentication > Templates
3. Selecione "Password reset"
4. Customize o template conforme necessário

### URL de Redirecionamento
Por padrão, o Firebase usa a URL configurada no console. Para customizar:
```typescript
const actionCodeSettings = {
  url: 'https://seusite.com/admin/login',
  handleCodeInApp: true,
};
await sendPasswordResetEmail(auth, email, actionCodeSettings);
```

## 🐛 Troubleshooting

### Email não está chegando
1. Verifique pasta de spam
2. Confirme que o email está cadastrado no Firebase
3. Verifique configuração de Email no Firebase Console
4. Confirme que o domínio está autorizado

### Link expirado
- Links de recuperação expiram em 1 hora
- Solicite um novo link

### Rate Limiting
- Firebase limita tentativas por IP
- Aguarde alguns minutos antes de tentar novamente

## 📚 Referências

- [Firebase Authentication - Password Reset](https://firebase.google.com/docs/auth/web/manage-users#send_a_password_reset_email)
- [Firebase Auth Errors](https://firebase.google.com/docs/reference/js/auth#autherrorcodes)
- [Email Template Customization](https://firebase.google.com/docs/auth/custom-email-handler)

## ✅ Status da Implementação

- [x] Integração com Firebase Auth
- [x] UI/UX completa
- [x] Validação de email
- [x] Tratamento de erros
- [x] Mensagens em português
- [x] Feedback visual
- [x] Documentação
- [x] Remoção do sistema anterior (SMS)

---

**Última atualização**: 19 de outubro de 2025
**Versão**: 2.0 (Firebase Native)
