# 🚀 Firebase Emulators - Guia de Desenvolvimento

## 📋 Configuração Automática

O projeto está configurado para usar **automaticamente**:
- **EMULATORS** no `localhost` (desenvolvimento)
- **PRODUÇÃO** no Firebase deploy

## 🎯 Como Usar

### **Opção 1: Desenvolvimento Completo (RECOMENDADO)**
```bash
npm run dev:emulator
```
Inicia emulators + Next.js simultaneamente

### **Opção 2: Apenas Emulators**
```bash
npm run emulator
```
Inicia apenas os emulators essenciais

### **Opção 3: Todos os Emulators**
```bash
npm run emulator:all
```
Inicia TODOS os emulators disponíveis

### **Opção 4: Scripts Windows**
```bash
# Apenas emulators
.\scripts\start-dev-emulators.bat

# Desenvolvimento completo
.\scripts\start-dev-complete.bat
```

## 🌐 URLs Importantes

| Serviço | URL | Porta |
|---------|-----|-------|
| **App Next.js** | http://localhost:3000 | 3000 |
| **Emulator UI** | http://localhost:4000 | 4000 |
| **Auth Emulator** | http://localhost:9099 | 9099 |
| **Firestore Emulator** | http://localhost:8080 | 8080 |
| **Functions Emulator** | http://localhost:5001 | 5001 |
| **Database Emulator** | http://localhost:9000 | 9000 |
| **Storage Emulator** | http://localhost:9199 | 9199 |

## 🔧 Como Funciona

### **Detecção Automática de Ambiente**
```typescript
// src/lib/firebase.ts
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

if (isLocalhost) {
  // 🏠 Conecta aos EMULATORS
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  // ...
} else {
  // 🌐 Usa FIREBASE PRODUÇÃO
  console.log('Ambiente PRODUÇÃO detectado');
}
```

## 🎉 Vantagens dos Emulators

### **✅ Desenvolvimento Local**
- ✅ Sem limites de quota
- ✅ Dados isolados
- ✅ Testes seguros
- ✅ Desenvolvimento offline

### **✅ Produção Real**
- ✅ Dados reais preservados
- ✅ Performance real
- ✅ Configurações de produção

## 🚨 Resolução de Problemas

### **Erro: "Emulators já conectados"**
- ✅ **Normal** - significa que já estão funcionando

### **Erro: "Port already in use"**
- 🔧 Mate processos: `taskkill /f /im node.exe`
- 🔧 Ou mude as portas no `firebase.json`

### **Erro: "Firebase CLI not found"**
```bash
npm install -g firebase-tools
```

### **Erro: "Project not found"**
```bash
firebase use italo-santos
```

## 📚 Comandos Úteis

```bash
# Ver status dos emulators
firebase emulators:start --inspect-functions

# Limpar dados dos emulators
firebase emulators:exec --ui "echo 'Cleared'"

# Ver logs detalhados
firebase emulators:start --debug

# Exportar dados dos emulators
firebase emulators:export ./emulator-data

# Importar dados para os emulators
firebase emulators:start --import ./emulator-data
```

## 🎯 Fluxo de Trabalho Recomendado

1. **Desenvolvimento**: `npm run dev:emulator`
2. **Testes locais**: Use emulators
3. **Deploy**: `npm run firebase-deploy`
4. **Produção**: Automaticamente usa Firebase real

---

**🎉 Agora você pode desenvolver sem limites de quota!**
