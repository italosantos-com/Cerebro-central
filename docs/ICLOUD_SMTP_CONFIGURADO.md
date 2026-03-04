# ✅ Configuração SMTP iCloud Completa

## Status: FUNCIONANDO

A configuração SMTP com iCloud está funcionando corretamente usando a senha específica de aplicativo.

## Configuração Correta (.env.local)

```bash
SMTP_HOST=smtp.mail.me.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=is@italosantos.com
SMTP_PASS=iwdg-lafl-vxct-byix
SMTP_FROM="Italo Santos <is@italosantos.com>"
EMAIL_ACTION_BASE_URL=https://italosantos.com/auth/action
SMTP_REQUIRE_TLS=true
SMTP_MIN_TLS=TLSv1.2
```

## Pontos Importantes

### 1. Senha Específica do iCloud
- ✅ A senha `iwdg-lafl-vxct-byix` é uma senha específica de aplicativo gerada no iCloud
- ⚠️ **NÃO é a senha da conta Apple** - é gerada especificamente para SMTP
- 📝 Para gerar uma nova senha específica:
  1. Acesse: https://appleid.apple.com
  2. Vá em "Segurança" > "Senhas específicas de apps"
  3. Clique em "Gerar senha"
  4. Use o nome "SMTP Email Service"
  5. Copie a senha gerada (formato: xxxx-xxxx-xxxx-xxxx)

### 2. TLS Configuration
- ✅ `SMTP_MIN_TLS=TLSv1.2` - Versão TLS mínima correta
- ❌ `SMTP_MIN_TLS=TLSv1.` - ERRO! Causava falha de conexão
- ✅ `SMTP_REQUIRE_TLS=true` - Requer upgrade TLS via STARTTLS
- ✅ `SMTP_SECURE=false` - Usa STARTTLS na porta 587 (não SSL direto)

### 3. Configurações do iCloud
- **Host**: smtp.mail.me.com
- **Port**: 587 (STARTTLS)
- **Autenticação**: PLAIN, LOGIN (após STARTTLS)
- **Limite de tamanho**: 28MB (~28319744 bytes)

## Testes Realizados

### Teste 1: Verificação SMTP
```bash
SMTP_HOST=smtp.mail.me.com \
SMTP_PORT=587 \
SMTP_USER=is@italosantos.com \
SMTP_PASS=iwdg-lafl-vxct-byix \
SMTP_SECURE=false \
SMTP_REQUIRE_TLS=true \
SMTP_MIN_TLS=TLSv1.2 \
SMTP_TEST_SEND=true \
npm run test:smtp
```

**Resultado**: ✅ Success
```
[SMTP TEST] verify() OK: true
[SMTP TEST] sendMail OK messageId: <a844afbd-eead-10c8-3f68-677632485d36@italosantos.com>
```

### Teste 2: API Endpoint
```bash
curl -X POST http://localhost:3000/api/emails/send \
  -H 'Content-Type: application/json' \
  -d '{"type":"verify-email","email":"is@italosantos.com"}'
```

**Resultado**: ✅ Success
```json
{
  "success": true,
  "simulated": false,
  "messageId": "<e28ebe0a-3c61-11a3-0264-25d247b72bd8@italosantos.com>"
}
```

## Logs de Conexão Bem-Sucedida

```
[2025-11-15 11:16:14] INFO Connection established to 17.57.155.37:587
[2025-11-15 11:16:14] DEBUG S: 220 iCloud SMTP - outbound.qs.icloud.com
[2025-11-15 11:16:14] DEBUG C: STARTTLS
[2025-11-15 11:16:14] DEBUG S: 220 2.0.0 Ready to start TLS
[2025-11-15 11:16:14] INFO Connection upgraded with STARTTLS
[2025-11-15 11:16:15] DEBUG C: AUTH PLAIN
[2025-11-15 11:16:15] DEBUG S: 235 2.7.0 Authentication successful
[2025-11-15 11:16:15] INFO User "is@italosantos.com" authenticated
[2025-11-15 11:16:17] DEBUG S: 250 2.0.0 Ok: queued as 9315A18002C5
```

## Problemas Resolvidos

### ❌ Erro Anterior
```
Error initiating TLS - "TLSv1." is not a valid minimum TLS protocol version
```

**Causa**: Valor incorreto em `SMTP_MIN_TLS=TLSv1.` (com ponto final)

### ✅ Solução
- Corrigido para `SMTP_MIN_TLS=TLSv1.2`
- Valores válidos: `TLSv1`, `TLSv1.1`, `TLSv1.2`, `TLSv1.3`
- Recomendado: `TLSv1.2` ou `TLSv1.3`

## Tipos de Email Suportados

O sistema suporta os seguintes tipos de email:

1. **verify-email**: Verificação de email
2. **reset-password**: Redefinição de senha
3. **email-changed**: Notificação de alteração de email
4. **mfa-enabled**: Notificação de MFA ativado

## Exemplos de Uso

### Verificação de Email
```javascript
await sendTemplateEmail({
  type: 'verify-email',
  email: 'usuario@example.com',
  displayName: 'João Silva',
  appName: 'Meu App'
});
```

### Reset de Senha
```javascript
await sendTemplateEmail({
  type: 'reset-password',
  email: 'usuario@example.com',
  displayName: 'João Silva',
  appName: 'Meu App'
});
```

## Variáveis de Debug

Para debug detalhado, adicione:
```bash
SMTP_DEBUG=true          # Ativa logs detalhados do SMTP
```

## Segurança

### ⚠️ Importante
- **NUNCA commit a senha específica no Git**
- Mantenha `.env.local` no `.gitignore`
- Rotacione senhas específicas periodicamente
- Use variáveis de ambiente em produção

### Exemplo para Produção (Firebase Functions)
```bash
# Defina as variáveis via CLI
firebase functions:config:set \
  smtp.host="smtp.mail.me.com" \
  smtp.port="587" \
  smtp.user="is@italosantos.com" \
  smtp.pass="iwdg-lafl-vxct-byix"
```

## Troubleshooting

### Problema: Timeout de Conexão
- Verifique firewall/proxy
- Confirme porta 587 aberta
- Teste conectividade: `telnet smtp.mail.me.com 587`

### Problema: Autenticação Falhou
- Verifique se senha específica está correta
- Gere nova senha específica no iCloud
- Confirme que email está correto

### Problema: TLS Error
- Use `SMTP_MIN_TLS=TLSv1.2`
- Confirme `SMTP_REQUIRE_TLS=true`
- Verifique `SMTP_SECURE=false` (porta 587)

## Conclusão

✅ Sistema de email SMTP com iCloud está **100% funcional**
✅ Senha específica de aplicativo configurada corretamente
✅ TLS 1.2 configurado e funcionando
✅ Enviando emails reais (não simulados)

**Última atualização**: 15/11/2025 11:16 UTC
