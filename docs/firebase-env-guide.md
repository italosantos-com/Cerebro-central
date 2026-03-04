# 🔧 Configuração de Variáveis de Ambiente para Firebase Hosting

## 📋 Variáveis Necessárias

Para que o background da homepage e outras funcionalidades funcionem corretamente no Firebase Hosting, você precisa configurar estas variáveis de ambiente:

### 🔥 Firebase Admin SDK (para APIs server-side)
```bash
# Opção 1: Variáveis individuais (recomendado para Firebase Hosting)
FIREBASE_PROJECT_ID=seu-projeto-firebase-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=seu-client-id
FIREBASE_PRIVATE_KEY_ID=seu-private-key-id

# Opção 2: Variáveis com prefixo ADMIN_ (alternativa)
ADMIN_PROJECT_ID=seu-projeto-firebase-id
ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada aqui\n-----END PRIVATE KEY-----\n"
ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
```

### 🌐 Firebase Client SDK (públicas)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-firebase-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=seu-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu-measurement-id
```

## 🚀 Como Configurar no Firebase Hosting

### Método 1: Firebase CLI (Recomendado)
```bash
# Configurar variáveis uma por vez
firebase functions:config:set firebase.project_id="seu-projeto-id"
firebase functions:config:set firebase.private_key="-----BEGIN PRIVATE KEY-----\nSua chave...\n-----END PRIVATE KEY-----\n"
firebase functions:config:set firebase.client_email="firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com"

# Fazer deploy das configurações
firebase deploy --only functions
```

### Método 2: Console do Firebase
1. Vá para o [Console do Firebase](https://console.firebase.google.com)
2. Selecione seu projeto
3. Vá em **Hosting** > **Environment Configuration**
4. Adicione as variáveis listadas acima

### Método 3: Arquivo .env (apenas localhost)
```bash
# Criar arquivo .env na raiz do projeto (apenas para desenvolvimento local)
cp env.template .env
# Editar o arquivo .env com suas credenciais
```

## 🔑 Onde Obter as Credenciais

1. **Console do Firebase**: https://console.firebase.google.com
2. **Selecione seu projeto**
3. **Configurações** (ícone de engrenagem) > **Contas de serviço**
4. **Clique em "Gerar nova chave privada"**
5. **Baixe o arquivo JSON**
6. **Use os valores do JSON para preencher as variáveis**

## ✅ Verificação

Após configurar, verifique se está funcionando:

1. **Localhost**: `npm run dev` e acesse http://localhost:3000
2. **Firebase**: `firebase deploy` e acesse sua URL do Firebase

### Logs para Debug
- Abra o Developer Tools (F12)
- Vá para a aba Console
- Procure por mensagens como:
  - `🔍 [ProfileConfigService] Dados recebidos da API:`
  - `[Firebase Admin] Using individual env vars for credentials`
  - `Profile settings loaded successfully`

## 🐛 Problemas Comuns

### Background não aparece:
- ✅ Verifique se `FIREBASE_PROJECT_ID` está configurado
- ✅ Verifique se `FIREBASE_PRIVATE_KEY` está com quebras de linha corretas
- ✅ Verifique se `FIREBASE_CLIENT_EMAIL` está correto

### Erro "Firebase Admin not initialized":
- ✅ Verifique todas as variáveis do Firebase Admin SDK
- ✅ Certifique-se que a chave privada está no formato correto
- ✅ Verifique se não há espaços extras nas variáveis

## 🎯 Resultado Esperado

Quando tudo estiver configurado corretamente:
- ✅ Background da homepage aparece
- ✅ Configurações do perfil são carregadas
- ✅ APIs funcionam tanto no localhost quanto no Firebase
- ✅ Sem erros no console do navegador
