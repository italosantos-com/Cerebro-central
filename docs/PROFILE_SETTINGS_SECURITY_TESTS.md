# 🔒 Guia de Testes e Validação - Isolamento de ProfileSettings

## Objetivo
Validar que cada admin tem seu ProfileSettings completamente isolado e que o sistema de multi-admin funciona corretamente.

---

## 🧪 Testes de Segurança - Isolamento por AdminUid

### Teste 1: Admin Não-Main Não Pode Acessar Perfil de Outro Admin

**Cenário**:
- Admin A (uid: `admin_a_uid`) logado
- Tenta acessar perfil do Admin B (uid: `admin_b_uid`)

**Como Testar**:
```bash
# 1. Fazer login como Admin A
# 2. Abrir DevTools > Network
# 3. Executar no console:

const tokenA = await firebase.auth().currentUser.getIdToken();
const response = await fetch(
  '/api/admin/profile-settings?adminUid=admin_b_uid',
  {
    headers: {
      'Authorization': `Bearer ${tokenA}`
    }
  }
);

console.log(response.status); // Esperado: 403
console.log(await response.json()); // { error: 'Unauthorized' }
```

**Resultado Esperado**: ✅ **403 Forbidden**

---

### Teste 2: Admin Main CAN Acessar Perfil de Outro Admin

**Cenário**:
- Main Admin (uid: `main_admin_uid`) logado
- Acessa perfil do Admin B (uid: `admin_b_uid`)

**Como Testar**:
```bash
# 1. Fazer login como Main Admin
# 2. Executar no console:

const tokenMain = await firebase.auth().currentUser.getIdToken();
const response = await fetch(
  '/api/admin/profile-settings?adminUid=admin_b_uid',
  {
    headers: {
      'Authorization': `Bearer ${tokenMain}`
    }
  }
);

console.log(response.status); // Esperado: 200
const data = await response.json();
console.log(data.name); // Nome do Admin B
```

**Resultado Esperado**: ✅ **200 OK com dados do Admin B**

---

### Teste 3: Dados Públicos Não Contêm Secrets

**Cenário**:
- Usuário anônimo acessa página pública `/pedro`
- Hook busca perfil via `GET ?username=pedro`

**Como Testar**:
```bash
# 1. Abrir página pública: https://italosantos.com/pedro
# 2. DevTools > Network > buscar request para /api/admin/profile-settings
# 3. Verificar response:

{
  "name": "Pedro",
  "phone": "...",
  "profilePictureUrl": "...",
  "paymentSettings": {
    "pixValue": 99,
    "pixKey": "pedro@example.com",
    "pixKeyType": "email",
    // ✅ NUNCA deve conter:
    // "paypalClientSecret": undefined,  ← Removido! ✅
    // "mercadoPagoAccessToken": undefined  ← Removido! ✅
  }
}
```

**Resultado Esperado**: ✅ **Sem paypalClientSecret e mercadoPagoAccessToken**

---

### Teste 4: Admin Vê Todos os Secrets do Seu Próprio Perfil

**Cenário**:
- Admin logado
- Acessa seu próprio perfil via API

**Como Testar**:
```bash
# 1. Fazer login
# 2. No console:

const token = await firebase.auth().currentUser.getIdToken();
const response = await fetch(
  '/api/admin/profile-settings',  // Sem params = seu próprio perfil
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
console.log('PayPal Secret:', data.paymentSettings?.paypalClientSecret); // ← DEV VÊ ISSO ✅
console.log('MP Token:', data.paymentSettings?.mercadoPagoAccessToken);   // ← DEV VÊ ISSO ✅
```

**Resultado Esperado**: ✅ **Contém paypalClientSecret e mercadoPagoAccessToken**

---

### Teste 5: Firestore Rules Protegem Dados

**Cenário**:
- Usuário tenta acessar Firestore diretamente (sem API)
- Tenta ler `admins/{outro_admin_uid}/profile/settings`

**Como Testar**:
```typescript
// Em um componente com Firestore SDK
import { doc, getDoc } from 'firebase/firestore';

const outraAdminSettings = doc(
  db, 
  'admins', 
  'outro_admin_uid', 
  'profile', 
  'settings'
);

try {
  const snap = await getDoc(outraAdminSettings);
  console.log('❌ FALHA: conseguiu acessar dados de outro admin!');
} catch (error) {
  console.log('✅ SUCESSO: Firestore rules bloquearam!');
  // Error: Missing or insufficient permissions
}
```

**Resultado Esperado**: ✅ **Erro "Missing or insufficient permissions"**

---

### Teste 6: Admin Não Pode Salvar Perfil de Outro Admin

**Cenário**:
- Admin A tenta fazer POST salvando perfil do Admin B

**Como Testar**:
```bash
# 1. Fazer login como Admin A
# 2. Executar no console:

const tokenA = await firebase.auth().currentUser.getIdToken();
const response = await fetch(
  '/api/admin/profile-settings',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      settings: { name: 'HACKED' },
      adminUid: 'admin_b_uid'  // ← Tentando salvar perfil de outro
    })
  }
);

console.log(response.status); // Esperado: 403
```

**Resultado Esperado**: ✅ **403 Forbidden**

---

### Teste 7: Admin Pode Salvar Seu Próprio Perfil

**Cenário**:
- Admin logado salva seu próprio ProfileSettings

**Como Testar**:
```bash
# 1. Fazer login
# 2. Em /admin/settings, editar o nome e clicar em Salvar
# 3. Verificar DevTools > Network > POST /api/admin/profile-settings

# Request:
{
  "settings": { "name": "Novo Nome", ... },
  "adminUid": "seu_uid"
}

# Response:
{
  "success": true
}
```

**Resultado Esperado**: ✅ **200 OK com success: true**
**Verificação**: Dados salvos em `admins/{seu_uid}/profile/settings`

---

### Teste 8: Cache Está Isolado por Admin

**Cenário**:
- Admin A faz GET (cache vazio)
- Admin B faz GET (cache do A não é usado)

**Como Testar**:
```bash
# 1. Fazer login como Admin A
# 2. Abrir DevTools > Console
# 3. Executar:

// Limpar localStorage se tiver
localStorage.clear();

const tokenA = await firebase.auth().currentUser.getIdToken();

// Primeira requisição (cache vazio)
const t1 = performance.now();
let response = await fetch('/api/admin/profile-settings', {
  headers: { 'Authorization': `Bearer ${tokenA}` }
});
const time1 = performance.now() - t1;
console.log('Tempo 1ª requisição:', time1, 'ms');

// Segunda requisição (usa cache)
const t2 = performance.now();
response = await fetch('/api/admin/profile-settings', {
  headers: { 'Authorization': `Bearer ${tokenA}` }
});
const time2 = performance.now() - t2;
console.log('Tempo 2ª requisição (cache):', time2, 'ms');

// Cache faz requisição ser mais rápida (tempo2 < tempo1)
console.log('Cache funcionando:', time2 < time1);
```

**Resultado Esperado**: ✅ **Segunda requisição mais rápida (cache)**

---

## 📊 Teste de Estrutura de Dados

### Verificar Estrutura no Firestore

**Passo 1**: Abrir Firebase Console

```
Firebase Console → Firestore Database
```

**Passo 2**: Verificar coleções

```
✅ Coleção: admin
   └── Documento: profileSettings
       └── Fields:
           - name: "Italo Santos"
           - email: "pix@italosantos.com"
           - ... (dados do super admin global)

✅ Coleção: admins
   ├── Documento: {adminUidA}
   │   └── Subcoleção: profile
   │       └── Documento: settings
   │           └── Fields:
   │               - name: "Pedro"
   │               - email: "pedro@example.com"
   │               - ... (dados do Admin A)
   │
   ├── Documento: {adminUidB}
   │   └── Subcoleção: profile
   │       └── Documento: settings
   │           └── Fields:
   │               - name: "Lucas"
   │               - email: "lucas@example.com"
   │               - ... (dados do Admin B)
   │
   └── Documento: {mainAdminUid}
       └── Subcoleção: profile
           └── Documento: settings
               └── Fields:
                   - name: "Italo Santos (Main)"
                   - email: "italo@italosantos.com"
                   - ... (dados do main admin individual)
```

**Verificação Esperada**: ✅ Ambas as estruturas existem

---

## 🌐 Teste de URLs Públicas

### Verificar Que Cada URL Carrega Perfil Correto

**Teste 1**: Super Admin Global
```
URL: https://italosantos.com
Esperado: Carrega de admin/profileSettings (global)
Verificar: Nome = "Italo Santos", Email = "pix@italosantos.com"
```

**Teste 2**: Admin Individual
```
URL: https://italosantos.com/pedro
Esperado: Carrega de admins/{pedro_uid}/profile/settings
Verificar: Nome = "Pedro", Email = "pedro@example.com"
```

**Teste 3**: Outro Admin Individual
```
URL: https://italosantos.com/lucas
Esperado: Carrega de admins/{lucas_uid}/profile/settings
Verificar: Nome = "Lucas", Email = "lucas@example.com"
```

**Teste 4**: URL Inválida (Admin Não Existe)
```
URL: https://italosantos.com/nao-existe
Esperado: Fallback para global ou erro 404
Verificar: Ou mostra super admin ou página vazia
```

---

## 🔐 Teste de Autenticação

### Verificar Tokens JWT Contêm Claims Corretos

**Passo 1**: Fazer login como admin

**Passo 2**: Decodificar token no console
```bash
# No console do navegador:
const token = await firebase.auth().currentUser.getIdToken();

// Decodificar (sem validar assinatura, só para ver):
const parts = token.split('.');
const decoded = JSON.parse(atob(parts[1]));

console.log('Claims do Token:');
console.log('- uid:', decoded.uid);
console.log('- role:', decoded.role);        // Esperado: "admin"
console.log('- admin:', decoded.admin);      // Esperado: true
console.log('- isMainAdmin:', decoded.isMainAdmin); // Esperado: true ou false
```

**Resultado Esperado**: 
```json
{
  "uid": "seu_uid",
  "role": "admin",
  "admin": true,
  "isMainAdmin": false  // ou true para main admin
}
```

---

## 📈 Teste de Performance

### Verificar Cache e Performance

**Cenário**: Admin abre sua página de settings várias vezes

**Métrica**: Tempo de carregamento deve ser rápido na 2ª vez

```bash
# 1. Abrir /admin/settings
# 2. Fechar aba
# 3. Reabrir /admin/settings
# 4. Comparar tempo de load

Esperado: 2ª vez mais rápida (cache)
```

---

## ✅ Checklist Completo de Validação

### Segurança - Isolamento
- [ ] Admin A não consegue acessar perfil do Admin B (403)
- [ ] Main Admin consegue acessar perfil de qualquer admin (200)
- [ ] Dados públicos não contêm secrets (paypalClientSecret, etc)
- [ ] Admin vê todos os secrets do seu próprio perfil
- [ ] Firestore rules bloqueiam acesso não autorizado
- [ ] Admin não consegue salvar perfil de outro (403)
- [ ] Admin consegue salvar seu próprio perfil (200)

### Estrutura de Dados
- [ ] Coleção `admin/profileSettings` existe (global)
- [ ] Coleção `admins/{uid}/profile/settings` existe (per-admin)
- [ ] Cada admin tem seu próprio documento settings
- [ ] Dados aparecem no lugar correto no Firestore

### URLs Públicas
- [ ] https://italosantos.com carrega super admin
- [ ] https://italosantos.com/pedro carrega Admin Pedro
- [ ] https://italosantos.com/lucas carrega Admin Lucas
- [ ] Cada URL mostra dados corretos

### Autenticação
- [ ] Token JWT contém `role: "admin"`
- [ ] Token JWT contém `admin: true`
- [ ] Token JWT contém `isMainAdmin: true/false`
- [ ] Login falha sem credenciais corretas

### Performance
- [ ] Cache funciona (2ª requisição mais rápida)
- [ ] Cache isolado por adminUid
- [ ] TTL de 5 minutos funciona corretamente

### Integração
- [ ] POST /api/admin/profile-settings salva dados
- [ ] GET /api/admin/profile-settings carrega dados
- [ ] GET com `?username=pedro` funciona
- [ ] GET com `?adminUid=...` funciona

---

## 🚨 Cenários de Erro a Testar

### Erro 1: Admin Deletado
```
Se um admin for deletado do Firestore, seu ProfileSettings
ainda está lá. O que acontece quando tenta acessar?

Esperado: 
- Público: Erro ou perfil vazio
- Admin: 403 (sem permissão)
```

### Erro 2: Perfil Settings Não Existe
```
Se admins/{uid}/profile/settings não existir, o GET deve:

Esperado:
- Criar documento padrão automaticamente
- OU retornar fallback com placeholders
```

### Erro 3: Token Expirado
```
Se token JWT expirar durante requisição:

Esperado:
- 401 Unauthorized
- Cliente faz login novamente
```

### Erro 4: Permissão Insuficiente
```
Se usuário regular (não-admin) tenta salvar:

Esperado:
- 403 Forbidden
- Mensagem: "Usuário não é admin"
```

---

## 📋 Comandos Úteis

### Verificar Claims do Usuário Atual
```bash
# No console do navegador
const claims = (await firebase.auth().currentUser.getIdTokenResult()).claims;
console.log(claims);
```

### Forçar Refresh de Token
```bash
await firebase.auth().currentUser.getIdToken(true);
```

### Limpar Cache Local
```bash
localStorage.clear();
sessionStorage.clear();
```

### Ver Requests de API
```bash
# DevTools > Network > filter por "profile-settings"
# Verificar:
# - Status (200, 403, 500)
# - Headers (Authorization)
# - Response
```

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar Console do Navegador** (F12 > Console)
   - Erros de JavaScript
   - Logs de debug

2. **Verificar Firebase Console**
   - Firestore Database (documentos existem?)
   - Cloud Functions (logs de erro)

3. **Verificar DevTools > Network**
   - Status HTTP das requisições
   - Headers e body

4. **Verificar Firestore Rules**
   - Firebase Console > Firestore > Rules
   - Há regra que bloqueia?

---

**Data**: 2 de janeiro de 2026  
**Status**: Documento para Teste Completo do Isolamento  
**Próximo**: Executar todos os testes e documentar resultados
