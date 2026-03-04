# 🔧 Diagnóstico Firebase Admin SDK - JWT Signature Error

## 🚨 **PROBLEMA IDENTIFICADO**

**Erro**: `invalid_grant (Invalid JWT Signature)`

**Causa**: Service Account Key expirada/inválida ou configuração incorreta das credenciais

**Impacto**: 
- ❌ Falhas na autenticação Firebase Admin
- ❌ APIs administrativas não funcionando
- ❌ Operações de backend falhando

---

## ✅ **DIAGNÓSTICO REALIZADO**

### **1. Verificação das Variáveis de Ambiente**
```bash
✅ FIREBASE_PROJECT_ID: Presente
✅ FIREBASE_PRIVATE_KEY: Presente (1704 caracteres)
✅ FIREBASE_CLIENT_EMAIL: Presente
✅ FIREBASE_PRIVATE_KEY_ID: Presente
✅ FIREBASE_CLIENT_ID: Presente
```

### **2. Validação da Chave Privada**
```bash
✅ Formato correto (BEGIN/END markers)
✅ Processamento de escapes funcionando
❌ Autenticação falhando (UNAUTHENTICATED)
```

### **3. Teste de Conectividade**
```bash
✅ Firebase Admin SDK inicializado
❌ Acesso ao Firestore negado (credenciais inválidas)
```

---

## 🔑 **SOLUÇÃO IMPLEMENTADA**

### **Script Automático Criado**: `generate-new-service-account.sh`

**Funcionalidades**:
- 🌐 Abre automaticamente o Console Firebase
- 📋 Fornece instruções passo-a-passo
- 🔗 Link direto para Service Accounts
- 📝 Guia de configuração do .env.local

### **Processo de Correção**:

1. **Gerar Nova Chave** (Manual no Console)
   ```bash
   ./generate-new-service-account.sh
   ```

2. **Atualizar .env.local** com novas credenciais

3. **Validar Correção**
   ```bash
   node test-firebase-credentials.js
   ```

---

## 📋 **PRÓXIMAS AÇÕES**

### **🔴 AÇÃO IMEDIATA** (5 minutos)
1. ✅ **Abrir Console Firebase**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/settings/serviceaccounts/adminsdk
2. 🔑 **Gerar nova private key** para `firebase-adminsdk-fbsvc@YOUR_FIREBASE_PROJECT_ID.iam.gserviceaccount.com`
3. 💾 **Baixar arquivo JSON**
4. 📝 **Atualizar .env.local** com novas credenciais

### **🟡 VALIDAÇÃO** (2 minutos)
1. 🧪 **Executar teste**: `node test-firebase-credentials.js`
2. 🚀 **Reiniciar servidor Next.js**
3. 📊 **Monitorar logs** para confirmar correção

### **🟢 VERIFICAÇÃO FINAL** (3 minutos)
1. ✅ **Testar APIs administrativas**
2. ✅ **Verificar funcionalidades Firebase**
3. ✅ **Confirmar ausência de warnings JWT**

---

## 🔧 **FERRAMENTAS CRIADAS**

### **1. Script de Diagnóstico**: `test-firebase-credentials.js`
- ✅ Valida todas as variáveis de ambiente
- ✅ Testa conectividade real com Firestore
- ✅ Fornece diagnóstico detalhado de erros

### **2. Script de Correção**: `generate-new-service-account.sh`
- ✅ Automatiza processo de geração de nova chave
- ✅ Abre Console Firebase automaticamente
- ✅ Fornece instruções precisas

### **3. Arquivo .env.local Corrigido**
- ✅ Variáveis padronizadas (FIREBASE_*)
- ✅ Todas as credenciais necessárias presentes
- ✅ Formatação correta da chave privada

---

## 📞 **SUPORTE ADICIONAL**

### **Se o problema persistir após nova chave**:

1. **Verificar Permissões da Service Account**
   ```bash
   # Verificar IAM roles
   gcloud projects get-iam-policy YOUR_FIREBASE_PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:firebase-adminsdk-fbsvc@YOUR_FIREBASE_PROJECT_ID.iam.gserviceaccount.com"
   ```

2. **Sincronizar Horário do Sistema**
   ```bash
   # macOS
   sudo sntp -sS time.apple.com
   ```

3. **Verificar Estado da Service Account**
   - Console: https://console.cloud.google.com/iam-admin/serviceaccounts

---

## 🎯 **RESULTADO ESPERADO**

Após implementar a correção:

- ✅ **Warnings JWT eliminados**
- ✅ **APIs administrativas funcionais**
- ✅ **Conectividade Firebase estável**
- ✅ **Sistema totalmente operacional**

**Tempo estimado para resolução**: 10 minutos  
**Complexidade**: Baixa (processo manual simples)  
**Risco**: Mínimo (apenas renovação de credenciais)

---

## 📊 **STATUS ATUAL**

| Componente | Status | Ação Necessária |
|------------|--------|-----------------|
| **Diagnóstico** | ✅ Completo | - |
| **Scripts de Correção** | ✅ Criados | - |
| **Nova Service Account Key** | ⏳ Pendente | Gerar manualmente |
| **Atualização .env.local** | ⏳ Pendente | Após nova chave |
| **Validação Final** | ⏳ Pendente | Após correções |

**Próximo passo**: Gerar nova Service Account Key no Console Firebase
