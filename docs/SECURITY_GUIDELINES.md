# 🔒 Security Guidelines

## ⚠️ **IMPORTANTE: IDs Sensíveis Expostos**

Este projeto foi identificado com IDs sensíveis expostos no código. As seguintes ações foram tomadas para corrigir:

### ✅ **Correções Aplicadas**

1. **Firebase Configuration** - Limpo no `public/firebase-messaging-sw.js`
2. **Environment Template** - Atualizado com placeholders seguros
3. **Project IDs** - Substituídos por placeholders

### 🚨 **IDs Sensíveis Identificados**

- Firebase API Key: `AIzaSyC7yaXjEFWFORvyLyHh1O5SPYjRCzptTg8`
- Project IDs: `authkit-y9vjx`, `YOUR_FIREBASE_PROJECT_ID`
- Messaging Sender ID: `308487499277`
- App ID: `1:308487499277:web:3fde6468b179432e9f2f44`
- Measurement ID: `G-XKJWPXDPZS`

## 🔧 **Como Configurar Seguramente**

### 1. **Environment Variables**

Crie um arquivo `.env` baseado no `env.template`:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_actual_project_id
# ... outras variáveis
```

### 2. **Firebase Service Worker**

O arquivo `public/firebase-messaging-sw.js` agora usa placeholders. Para produção:

1. Use um build script que substitua os placeholders
2. Ou configure via environment variables no build

### 3. **Verificação de Segurança**

Execute o script de limpeza periodicamente:

```bash
node scripts/clean-sensitive-ids.js
```

## 🛡️ **Boas Práticas de Segurança**

### ✅ **Faça**

- Use sempre variáveis de ambiente para IDs sensíveis
- Use `.env` para desenvolvimento local
- Use secrets management em produção
- Revogue e regenere tokens expostos
- Monitore logs de acesso

### ❌ **Não Faça**

- Nunca commite IDs reais no código
- Não use IDs hardcoded
- Não compartilhe tokens em logs
- Não exponha chaves privadas

## 🔍 **Verificação de Segurança**

### Script de Verificação

```bash
# Verificar se há IDs sensíveis expostos
grep -r "AIza[A-Za-z0-9_-]\{35\}" src/ public/
grep -r "YOUR_FIREBASE_PROJECT_ID\|authkit-y9vjx" src/ public/
```

### Monitoramento Contínuo

1. Configure alerts para commits com IDs sensíveis
2. Use pre-commit hooks para verificação
3. Implemente scanning automático de segurança

## 🚨 **Ações Imediatas Necessárias**

1. **Revogue tokens expostos** no Firebase Console
2. **Regenere novas chaves** para todos os serviços
3. **Atualize variáveis de ambiente** em produção
4. **Monitore logs** para uso não autorizado
5. **Configure alertas** de segurança

## 📞 **Contato de Emergência**

Em caso de comprometimento de segurança:

1. Revogue imediatamente todos os tokens
2. Regenere novas chaves
3. Monitore logs de acesso
4. Considere rotacionar todas as credenciais

---

**Última atualização:** $(date)
**Status:** ✅ IDs sensíveis limpos do código
**Próxima verificação:** Recomendado mensalmente
