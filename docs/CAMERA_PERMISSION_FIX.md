# Solução para Erro de Permissão da Câmera

## Problema
O erro "Permissão negada. Verifique as configurações da câmera" pode ocorrer por várias razões. Este documento explica as causas e soluções.

## Causas Principais

### 1. **Permissão Negada pelo Navegador**
- **Causa**: O usuário negou permissão para a câmera ou o navegador bloqueou automaticamente
- **Solução**: 
  - Clique no ícone da câmera na barra de endereços
  - Selecione "Permitir" ou "Permitir sempre"
  - Recarregue a página

### 2. **Conexão Não Segura**
- **Causa**: Acesso à câmera requer HTTPS em produção
- **Solução**:
  - Use `localhost` para desenvolvimento
  - Use HTTPS em produção
  - Verifique se o certificado SSL está válido

### 3. **Navegador Não Suportado**
- **Causa**: Navegadores antigos não suportam `getUserMedia`
- **Solução**:
  - Use Chrome 53+, Firefox 36+, Safari 11+
  - Atualize o navegador para a versão mais recente

### 4. **Câmera em Uso por Outro Aplicativo**
- **Causa**: Zoom, Teams, Discord ou outros apps usando a câmera
- **Solução**:
  - Feche outros aplicativos que usam a câmera
  - Verifique se não há chamadas de vídeo ativas
  - Reinicie o navegador

### 5. **Câmera Não Conectada ou Com Defeito**
- **Causa**: Hardware não detectado ou com problemas
- **Solução**:
  - Verifique se a câmera está conectada
  - Teste a câmera em outros aplicativos
  - Atualize drivers da câmera

### 6. **Configurações de Privacidade do Sistema**
- **Causa**: Sistema operacional bloqueando acesso
- **Solução**:
  - **Windows**: Configurações > Privacidade > Câmera
  - **macOS**: Preferências do Sistema > Segurança e Privacidade > Câmera
  - **Linux**: Verificar permissões do navegador

## Melhorias Implementadas

### 1. **Detecção de Erros Específicos**
```typescript
if (error.name === 'NotAllowedError') {
  // Permissão negada
} else if (error.name === 'NotFoundError') {
  // Câmera não encontrada
} else if (error.name === 'NotReadableError') {
  // Câmera em uso
}
```

### 2. **Verificação de Segurança**
```typescript
const isSecure = window.location.protocol === 'https:' || 
                 window.location.hostname === 'localhost';
```

### 3. **Botão de Retry**
- Permite tentar novamente sem recarregar a página
- Reseta o stream da câmera automaticamente

### 4. **Instruções Visuais**
- Mostra instruções específicas para cada tipo de erro
- Guia o usuário passo a passo

## Como Testar

### 1. **Desenvolvimento Local**
```bash
npm run dev
# Acesse http://localhost:3000/auth/face
```

### 2. **Teste com Script Automatizado**
```bash
# Testar configurações locais
node scripts/test-camera.js

# Testar após deploy no Firebase
node scripts/test-camera.js https://seu-projeto.firebaseapp.com
```

### 3. **Produção (Firebase)**
```bash
# Build e deploy
npm run build
firebase deploy

# Testar no Firebase
# Acesse https://seu-projeto.firebaseapp.com/auth/face
```

### 4. **Verificação Manual**
- Abra o console do navegador (F12)
- Verifique se não há erros de CORS ou CSP
- Confirme que os headers estão corretos
- Teste em diferentes navegadores

## Logs de Debug

O sistema agora inclui logs detalhados:
```
[Camera] Solicitando permissão da câmera...
[Camera] Permissão concedida, configurando vídeo...
[Camera] Vídeo carregado com sucesso
[Camera] Câmera configurada com sucesso
```

## Troubleshooting

### Se o problema persistir:

1. **Limpe cache do navegador**
2. **Desabilite extensões** que possam interferir
3. **Teste em modo incógnito**
4. **Verifique firewall/antivírus**
5. **Atualize drivers da câmera**

### Comandos úteis para debug:
```javascript
// Verificar se getUserMedia é suportado
console.log('getUserMedia suportado:', !!navigator.mediaDevices?.getUserMedia);

// Listar dispositivos de mídia
navigator.mediaDevices.enumerateDevices()
  .then(devices => console.log('Dispositivos:', devices));
```

## Problemas Específicos do Firebase

### **Diferenças entre Vercel e Firebase**
- **Vercel**: Configurações automáticas para câmera
- **Firebase**: Requer headers específicos para permissões

### **Soluções para Firebase**
1. **Headers configurados** no `firebase.json` e `next.config.mjs`
2. **Detecção automática** de ambiente (dev vs produção)
3. **Configurações flexíveis** de câmera para diferentes contextos
4. **Regras do Firestore** atualizadas para permitir autenticação facial

### **Correção de Erros Comuns**

#### **Erro: "Missing or insufficient permissions"**
```bash
# Aplicar regras do Firestore
npm run deploy-rules

# Ou manualmente
firebase deploy --only firestore:rules
```

#### **Erro: "FirebaseError"**
```bash
# Corrigir permissões e testar
npm run fix-permissions
```

#### **Erro: Content Security Policy (CSP)**
```bash
# Scripts do Google Tag Manager e Google Pay bloqueados
# ✅ Corrigido no next.config.mjs
# ✅ Adicionados domínios permitidos
```

#### **Warnings do React**
- ✅ Corrigidos no `layout.tsx`
- ✅ Adicionado `suppressHydrationWarning`
- ✅ Melhorado tratamento de erros

#### **Reiniciar Servidor**
```bash
# Reiniciar com todas as correções aplicadas
npm run restart-dev
```

### **Se não funcionar no Firebase:**
1. Aplique as regras: `npm run deploy-rules`
2. Verifique se o deploy foi feito corretamente
3. Confirme que os headers estão sendo aplicados
4. Teste com o script: `node scripts/test-camera.js https://seu-projeto.firebaseapp.com`
5. Verifique logs do console para erros específicos

## Suporte

Se o problema persistir após tentar todas as soluções:
1. Verifique os logs do console (F12)
2. Teste em outro navegador
3. Teste em outro dispositivo
4. Execute o script de teste para verificar headers
5. Reporte o erro com detalhes do ambiente
