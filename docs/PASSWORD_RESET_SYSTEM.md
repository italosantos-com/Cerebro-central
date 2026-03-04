# Sistema de Recuperação de Senha - Admin

## Implementação Completa

### 📁 Arquivos Criados

1. **API Routes:**
   - `/api/auth/forgot-password/route.ts` - Envio de email e validação de token
   - `/api/auth/reset-password/route.ts` - Redefinição de senha

2. **Páginas:**
   - `/admin/reset-password/page.tsx` - Interface para criar nova senha

3. **Componentes:**
   - `login-form.tsx` - Adicionado modal de recuperação de senha

---

## 🚀 Como Funciona

### 1. Usuário Esqueceu a Senha
1. Clica em "Esqueci minha senha" no login
2. Digita o email no modal
3. Sistema valida email e envia link de recuperação

### 2. Email de Recuperação
- Template HTML responsivo
- Link válido por 1 hora
- Token único e seguro (32 bytes hex)

### 3. Redefinir Senha
1. Usuário clica no link do email
2. Sistema valida token
3. Usuário cria nova senha com validação em tempo real:
   - ✅ Mínimo 8 caracteres
   - ✅ Letra maiúscula
   - ✅ Letra minúscula
   - ✅ Número
   - ✅ Caractere especial
4. Confirmação de senha
5. Senha atualizada e redirecionamento para login

---

## 🔒 Segurança Implementada

### Rate Limiting
- **Esqueci senha**: 3 tentativas a cada 5 minutos por IP
- Proteção contra spam e abuse

### Validação de Token
- Token único de 32 bytes (hex)
- Expiração de 1 hora
- Token invalidado após uso
- Verificação de existência e validade

### Validação de Senha
- Força mínima obrigatória
- Feedback visual em tempo real
- Confirmação obrigatória

### Armazenamento
- Tokens armazenados em memória (Map)
- Em produção: usar Redis/Firestore
- Senhas com hash SHA-256 (use bcrypt em produção)

---

## 📧 Configuração de Email

### Variáveis Necessárias (.env.local)
```bash
SENDGRID_API_KEY=sua_api_key
SENDGRID_FROM_EMAIL=noreply@seudominio.com
SENDGRID_FROM_NAME=Seu App
NEXT_PUBLIC_APP_URL=https://seudominio.com
```

### Template de Email
O template já está configurado em `src/lib/email-templates.ts`:
- Design responsivo
- Botão de ação destacado
- Aviso de expiração
- Footer profissional

---

## 🧪 Testar o Sistema

### 1. Instalar Dependências
```bash
npm install @sendgrid/mail
```

### 2. Configurar SendGrid
1. Criar conta em https://sendgrid.com
2. Gerar API Key
3. Verificar domínio de email
4. Adicionar credenciais ao `.env.local`

### 3. Testar Fluxo Completo
```bash
# 1. Iniciar aplicação
npm run dev

# 2. Acessar
http://localhost:3000/admin

# 3. Clicar em "Esqueci minha senha"

# 4. Digitar email válido

# 5. Verificar console para o link (em dev)

# 6. Acessar link e criar nova senha
```

---

## 📊 Estrutura de Dados

### Token Storage (Memória)
```typescript
{
  token: string, // hex 32 bytes
  email: string,
  expiresAt: number // timestamp
}
```

### Em Produção (Firestore/Redis)
```typescript
collection: "password_reset_tokens"
{
  token: string,
  userId: string,
  email: string,
  createdAt: Timestamp,
  expiresAt: Timestamp,
  used: boolean
}
```

---

## 🔧 Próximas Melhorias

### Backend
- [ ] Migrar armazenamento para Firestore/Redis
- [ ] Usar bcrypt para hash de senha
- [ ] Adicionar logging de auditoria
- [ ] Implementar blacklist de tokens
- [ ] Notificação de mudança de senha por email

### Frontend
- [ ] Adicionar animações de transição
- [ ] Melhorar feedback de erro
- [ ] Adicionar contador de tentativas
- [ ] Mostrar tempo restante do token

### Segurança
- [ ] Captcha para prevenir bots
- [ ] 2FA opcional após reset
- [ ] Histórico de senhas (não reutilizar)
- [ ] Notificar sobre tentativas suspeitas
- [ ] IP whitelist para admins

---

## 🐛 Troubleshooting

### Email não enviado
1. Verificar `SENDGRID_API_KEY`
2. Confirmar domínio verificado no SendGrid
3. Checar logs: https://app.sendgrid.com/email_activity
4. Verificar se email não está em spam

### Token inválido
1. Verificar se expirou (1 hora)
2. Confirmar que não foi usado
3. Checar console do servidor para logs

### Senha não atualiza
1. Verificar requisitos de força
2. Confirmar que senhas conferem
3. Checar logs do servidor

---

## 📝 Uso em Produção

### 1. Migrar para Firestore
```typescript
// src/lib/password-reset-tokens.ts
import { db } from '@/lib/firebase-admin';

export async function createResetToken(email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.collection('password_reset_tokens').doc(token).set({
    email,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    used: false
  });
  return token;
}

export async function validateToken(token: string) {
  const doc = await db.collection('password_reset_tokens').doc(token).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.used || Date.now() > data.expiresAt.toMillis()) {
    return null;
  }
  return data;
}
```

### 2. Usar bcrypt
```typescript
import bcrypt from 'bcryptjs';

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}
```

### 3. Adicionar ao Firebase Auth
```typescript
import { auth } from '@/lib/firebase-admin';

async function resetPassword(email: string, newPassword: string) {
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password: newPassword });
}
```

---

## ✅ Checklist de Deployment

- [ ] Configurar SendGrid em produção
- [ ] Adicionar variáveis de ambiente no host
- [ ] Testar envio de email em produção
- [ ] Configurar domínio verificado
- [ ] Ativar rate limiting via Redis
- [ ] Configurar logs e monitoring
- [ ] Testar fluxo completo em staging
- [ ] Documentar para equipe
