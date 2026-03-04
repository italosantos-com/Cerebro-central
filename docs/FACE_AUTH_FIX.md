# Correções do Face ID - Firebase

## Problemas Identificados e Soluções

### 1. Erro de Permissões do Firebase
**Problema**: `FirebaseError: Missing or insufficient permissions`

**Solução**: 
- ✅ Aplicadas regras do Firestore corretas
- ✅ Permitida leitura anônima para comparação facial
- ✅ Permitida criação de usuários para todos
- ✅ Permitida escrita apenas para usuários autenticados

### 2. Erro de App Check
**Problema**: `auth/firebase-app-check-token-is-invalid`

**Solução**:
- ✅ Removida autenticação anônima automática
- ✅ Operações do Firestore funcionam sem autenticação
- ✅ Scripts de teste funcionando corretamente

### 3. Erro de Upload de Foto de Perfil
**Problema**: `POST https://firebasestorage.googleapis.com/v0/b/YOUR_FIREBASE_PROJECT_ID.firebasestorage.app/o?name=profile-photos%2F5aepd6o6eGZjhS0M4F9rO1VXzeE2 403 (Forbidden)`

**Causa**: Usuário autenticado como anônimo (`7jwPWoc7wqTwNgKgoeTO5RYpbGr2`) tentando fazer upload para pasta de outro usuário (`5aepd6o6eGZjhS0M4F9rO1VXzeE2`)

**Solução**:
- ✅ Aplicadas regras do Storage para `profile-photos/{userId}`
- ✅ Regras permitem upload apenas para o próprio usuário
- ⚠️ **Problema de autenticação**: Usuário deve estar logado corretamente

### 4. Regras do Firestore Aplicadas
```javascript
// Regras para users (autenticação facial)
match /users/{userId} {
  // Permitir leitura para comparação facial (login anônimo)
  allow read: if true;
  // Permitir escrita apenas para o próprio usuário
  allow write: if request.auth != null && request.auth.uid == userId;
  // Permitir criação para todos (cadastro)
  allow create: if true;
}
```

### 5. Regras do Storage Aplicadas
```javascript
// Allow profile photo uploads for authenticated users
match /profile-photos/{userId} {
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## Status Atual

### ✅ Firebase Conectividade
- Firebase inicializado: ✅
- Leitura de dados: ✅
- Escrita de dados: ✅
- Regras do Firestore: ✅
- Regras do Storage: ✅

### ✅ Face ID Funcionalidade
- Total de usuários: 6
- Usuários com Face ID: 3 (50% adoção)
- Face Data disponível: ✅
- Busca Face ID: ✅

### ✅ Usuários com Face ID Ativado
1. rica@gmail.com (5aepd6o6eGZjhS0M4F9rO1VXzeE2) - Face Data: ✅
2. teste@mail.com (pIqoaYvzeEMdMuRQcF8JPxAlm733) - Face Data: ✅
3. 3pix@italosantos.com (uu4DdG9GOndNaz45qfnspCP7OD32) - Face Data: ✅

## Scripts Disponíveis

### Testar Conectividade
```bash
npm run test-firebase
```

### Testar Face ID
```bash
npm run test-face-auth
```

### Testar Autenticação de Usuário
```bash
npm run test-user-auth
```

### Aplicar Regras do Firestore
```bash
npm run deploy-rules
```

### Aplicar Regras do Storage
```bash
npm run deploy-storage
```

### Reiniciar Servidor
```bash
npm run restart-dev
```

## Como Testar

1. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

2. **Acesse a página de Face ID**:
   ```
   http://localhost:3000/auth/face
   ```

3. **Teste o login Face ID**:
   - Olhe para a câmera
   - Clique em "Entrar com Face ID"
   - O sistema deve reconhecer um dos 3 usuários cadastrados
   - **IMPORTANTE**: Certifique-se de que está logado como o usuário correto

4. **Teste o cadastro Face ID**:
   - Preencha os dados
   - Olhe para a câmera
   - Clique em "Cadastrar com Face ID"

5. **Teste o upload de foto de perfil**:
   - Certifique-se de estar logado como o usuário correto
   - Vá para a página de perfil
   - Tente fazer upload de uma foto

## Logs de Debug

Os logs no console do navegador mostrarão:
- `[Camera] Ambiente detectado`
- `[Auth] Tentando operações sem autenticação`
- `[Login] Comparando com [email]: [X]% similaridade`
- `[Login] ✅ MATCH ENCONTRADO` ou `[Login] ❌ NENHUM MATCH`

## Problema de Autenticação

**Diagnóstico**: O usuário está autenticado como anônimo em vez de estar logado como `rica@gmail.com`

**Solução**:
1. Faça logout completo
2. Acesse `/auth/face`
3. Faça login com Face ID como `rica@gmail.com`
4. Verifique se está logado corretamente antes de tentar upload

## Próximos Passos

1. Teste o Face ID no navegador
2. **Certifique-se de estar logado como o usuário correto**
3. Teste o upload de foto de perfil
4. Se ainda houver erros, verifique os logs do console
5. Para deploy no Firebase, execute:
   ```bash
   npm run build && firebase deploy
   ```

## Troubleshooting

### Se o erro de permissão persistir:
1. Execute: `npm run deploy-rules`
2. Execute: `npm run deploy-storage`
3. Aguarde 1-2 minutos
4. Teste novamente

### Se o erro de upload de foto persistir:
1. Verifique se está logado como o usuário correto
2. Execute: `npm run test-user-auth` para verificar autenticação
3. Faça logout e login novamente
4. Verifique se o UID do usuário está correto

### Se a câmera não funcionar:
1. Verifique se está usando HTTPS ou localhost
2. Permita acesso à câmera no navegador
3. Use Chrome, Firefox ou Safari

### Se o Face ID não reconhecer:
1. Verifique se há usuários cadastrados: `npm run test-face-auth`
2. Tente cadastrar um novo usuário
3. Verifique a iluminação e posição do rosto
