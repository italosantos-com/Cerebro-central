# 🚀 Guia Rápido - Sistema de Registro de Administradores

## Configuração Inicial (5 minutos)

### 1. Copiar variáveis de ambiente

```bash
cp .env.admin-auth.example .env.local
```

### 2. Editar `.env.local`

```env
# Obrigatório - altere este valor!
ADMIN_INVITATION_CODE=MeuCodigoSecretoDe2024

# Opcional (para desenvolvimento)
NODE_ENV=development
```

### 3. Executar script de setup

```bash
chmod +x scripts/setup-admin-registration.js
node scripts/setup-admin-registration.js
```

### 4. Criar índices no Firestore

Acesse [Firebase Console](https://console.firebase.google.com/) > Firestore Database > Indexes

Crie os seguintes índices compostos:

**Collection: `verification_codes`**
- Fields: `email` (ASC) + `type` (ASC) + `used` (ASC) + `createdAt` (DESC)
- Fields: `phone` (ASC) + `type` (ASC) + `used` (ASC) + `createdAt` (DESC)

**Collection: `pending_admin_registrations`**
- Fields: `email` (ASC) + `status` (ASC)

## Teste Rápido (Desenvolvimento)

### 1. Iniciar servidor

```bash
npm run dev
```

### 2. Acessar página de login admin

```
http://localhost:3000/admin
```

### 3. Clicar em "Cadastre-se como Admin"

### 4. Seguir wizard de 3 etapas

**Etapa 1**: Capturar rosto
- Clique em "Capturar Rosto"
- Aguarde confirmação

**Etapa 2**: Preencher dados
- Nome: Seu Nome
- Email: seu@email.com
- Telefone: +5511999999999
- Código de Convite: (use o valor de `ADMIN_INVITATION_CODE`)

**Etapa 3**: Verificar códigos
- **Em desenvolvimento**, os códigos aparecem no console do servidor
- Procure por `[Email Verification] Código para...`
- Procure por `[SMS Verification] Código para...`
- Copie e cole os códigos de 6 dígitos

### 5. Concluir registro

Se tudo estiver correto, você verá:
- ✅ "Administrador registrado com sucesso!"
- Redirecionamento para `/admin?registration=success`

## Verificar Dados no Firestore

Acesse Firebase Console > Firestore Database

Você deve ver:
- ✅ Novo documento em `admins`
- ✅ Registro em `admin_audit_log`
- ✅ Códigos usados em `verification_codes`

## Configuração para Produção

### 1. Configurar Email (SendGrid)

```bash
npm install @sendgrid/mail
```

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
SENDGRID_FROM_EMAIL=no-reply@seudominio.com
```

Edite `src/app/api/production/admin/auth/send-email-code/route.ts` e remova o código de desenvolvimento.

### 2. Configurar SMS (Twilio)

```bash
npm install twilio
```

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

Edite `src/app/api/production/admin/auth/send-sms-code/route.ts` e remova o código de desenvolvimento.

### 3. Alterar código de convite

```env
ADMIN_INVITATION_CODE=AlgoMuitoSecretoEComplexo2024!@#
```

**⚠️ IMPORTANTE**: Não compartilhe este código publicamente!

### 4. Testar em staging

Antes de ir para produção:
1. Teste o fluxo completo em ambiente de staging
2. Verifique recebimento real de emails
3. Verifique recebimento real de SMS
4. Confirme que dados são salvos corretamente

## Solução de Problemas Rápidos

### Câmera não funciona
- Permita acesso à câmera no navegador
- Use HTTPS (obrigatório para face-api.js)
- Verifique se modelos estão em `public/models/`

### "Código de convite inválido"
- Verifique se `ADMIN_INVITATION_CODE` está correto no `.env.local`
- Código é case-sensitive

### Códigos de verificação não aparecem
- Em desenvolvimento, procure no console do servidor
- Em produção, verifique configuração de email/SMS

### "Registro não encontrado ou expirado"
- Registros expiram em 30 minutos
- Inicie o processo novamente

## Comandos Úteis

```bash
# Ver logs do servidor
npm run dev

# Limpar cache do Next.js
rm -rf .next

# Reiniciar servidor
Ctrl+C e npm run dev

# Verificar variáveis de ambiente
node -p "process.env.ADMIN_INVITATION_CODE"
```

## Próximos Passos

1. ✅ Sistema funcionando em desenvolvimento
2. ⬜ Configurar serviços de email/SMS
3. ⬜ Testar em staging
4. ⬜ Deploy em produção
5. ⬜ Documentar código de convite para equipe

## Documentação Completa

Para mais detalhes, consulte:
- `docs/ADMIN_REGISTRATION_SYSTEM.md` - Documentação completa
- `.env.admin-auth.example` - Todas as variáveis disponíveis
- `scripts/setup-admin-registration.js` - Script de setup

## Suporte

Problemas? Verifique:
1. Console do navegador (erros de frontend)
2. Console do servidor (erros de backend)
3. Firebase Console > Logs (erros do Firestore)
4. Este guia e a documentação completa

---

**Tempo estimado de setup**: 5-10 minutos  
**Tempo para produção**: 30-60 minutos (inclui configuração de serviços)
