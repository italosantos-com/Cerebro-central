# 🔧 Firebase Emulator Setup - Método Híbrido de Troca de Email

## 📋 **VISÃO GERAL**

Este documento explica como configurar e usar o **Firebase Emulator** para desenvolvimento local com o **método híbrido otimizado** de troca de email.

## 🎯 **ARQUITETURA IMPLEMENTADA**

```
┌─────────────────────────────────────────────────────────────┐
│                    MÉTODO HÍBRIDO OTIMIZADO                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏠 LOCALHOST               │  🌐 PRODUÇÃO                   │
│  ─────────────────────────  │  ─────────────────────────    │
│  • Firebase Emulator        │  • Firebase Real              │
│  • Validação simulada       │  • Validação real             │
│  • Notificações simuladas   │  • Emails reais               │
│  • Dados locais             │  • Dados produção             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **COMANDOS DISPONÍVEIS**

### **Desenvolvimento Normal:**
```bash
npm run dev
# Usa Firebase produção (como antes)
```

### **Desenvolvimento com Emulator:**
```bash
npm run dev:emulator
# Inicia emulator + Next.js simultaneamente
```

### **Apenas Emulator:**
```bash
npm run emulator
# Só o emulator (para testes)
```

### **Emulator com UI de Debug:**
```bash
npm run emulator:ui
# Emulator + interface web de debug
```

## 🔧 **CONFIGURAÇÃO AUTOMÁTICA**

O sistema detecta automaticamente o ambiente:

### **🏠 Localhost (Emulator):**
- **URL:** `http://localhost:3000`
- **Auth:** `http://127.0.0.1:9099`
- **Firestore:** `http://127.0.0.1:8080`
- **Functions:** `http://127.0.0.1:5001`
- **UI:** `http://localhost:4000`

### **🌐 Produção (Firebase Real):**
- **URL:** `https://seu-projeto.web.app`
- **Auth:** Firebase Auth real
- **Firestore:** Banco real
- **Functions:** Cloud Functions reais

## 📧 **FLUXO DE TROCA DE EMAIL**

### **🎯 MÉTODO HÍBRIDO:**

1. **Validação de Formato** ✅
2. **Verificar Email Único no Sistema** ✅
3. **Validar Existência do Email** ✅
   - 🏠 Localhost: Simulação inteligente
   - 🌐 Produção: Verificação real
4. **Reautenticar Usuário** ✅
5. **Atualizar Firebase Auth** ✅
6. **Atualizar Firestore** ✅
7. **Enviar Notificações** ✅
   - 📧 Email antigo: Notificação de segurança
   - 🎉 Email novo: Boas-vindas
8. **Rollback Automático** se houver erro ✅

## 🧪 **TESTES SIMULADOS (LOCALHOST)**

### **Emails Inválidos para Teste:**
```javascript
// Estes emails falharão na validação (localhost)
'teste@emailinvalido.fake'
'naoexiste@dominiofake.com'
'erro@teste.invalid'
```

### **Emails Válidos:**
```javascript
// Qualquer outro email será aceito
'usuario@gmail.com'
'teste@outlook.com'
'novo@email.com'
```

## 📊 **LOGS E DEBUG**

### **Console Logs:**
```
🔧 [Firebase] Conectando aos emulators...
✅ [Firebase] Auth Emulator conectado
✅ [Firebase] Firestore Emulator conectado
✅ [Firebase] Functions Emulator conectado
🎯 [Firebase] Todos os emulators configurados para localhost

🎯 [Auth] INICIANDO MÉTODO HÍBRIDO OTIMIZADO
🌍 [Auth] Ambiente: Localhost/Emulator
🔍 [Auth] Validando existência do email...
🧪 [EmailValidator] Modo emulator - simulando validação
✅ [Auth] Email validado com sucesso
📧 [EmailNotifier] Enviando notificações de segurança...
🎉 [Auth] MÉTODO HÍBRIDO CONCLUÍDO COM SUCESSO!
```

## 🛠️ **TROUBLESHOOTING**

### **Emulator não inicia:**
```bash
# Limpar cache
firebase emulators:kill
rm -rf .firebase

# Reinstalar Firebase CLI
npm install -g firebase-tools
```

### **Porta ocupada:**
```bash
# Verificar portas em uso
netstat -ano | findstr :9099
netstat -ano | findstr :8080
netstat -ano | findstr :5001
netstat -ano | findstr :4000

# Matar processo se necessário
taskkill /PID [PID_NUMBER] /F
```

### **Dados não persistem:**
```bash
# Usar flag de persistência
firebase emulators:start --import=./emulator-data --export-on-exit
```

## 🔒 **SEGURANÇA**

### **Localhost:**
- ✅ Dados isolados do ambiente real
- ✅ Emails simulados (não enviados realmente)
- ✅ Validações funcionais
- ✅ Rollback automático

### **Produção:**
- ✅ Validação real de emails
- ✅ Notificações reais enviadas
- ✅ Dados persistidos no Firebase
- ✅ Logs completos de auditoria

## 📈 **PERFORMANCE**

### **Localhost:**
- ⚡ **Super rápido** - sem latência de rede
- 🔄 **Restart instantâneo** - dados em memória
- 🧪 **Testes ilimitados** - sem custos

### **Produção:**
- 🌐 **Latência real** - experiência real do usuário
- 💰 **Custos controlados** - apenas operações necessárias
- 📊 **Métricas reais** - analytics completos

## 🎯 **PRÓXIMOS PASSOS**

1. **Testar localmente:**
   ```bash
   npm run dev:emulator
   ```

2. **Testar troca de email** com diferentes cenários
3. **Verificar logs** no console
4. **Testar rollback** com emails inválidos
5. **Deploy para produção** quando estiver satisfeito

## 🚀 **DEPLOY**

```bash
# Build e deploy
npm run build
firebase deploy --only hosting,functions

# Ou usar script otimizado
npm run firebase-deploy-all
```

---

**✅ IMPLEMENTAÇÃO COMPLETA!** 

O sistema está pronto para uso tanto em desenvolvimento (emulator) quanto em produção (Firebase real)! 🎉
