# ANÁLISE DE CÓDIGO MORTO - ARQUIVOS PARA REMOÇÃO

## ✅ ARQUIVOS 100% MORTOS (sem referências em lugar nenhum)

### Componentes
- src/components/BraintreeCheckout.tsx (0 refs)

### Serviços
- src/services/chat-translation.service.ts (0 refs) 
- src/services/token-refresh-service.ts (0 refs)

### Serviços em pasta chat-adapters/
- Procurar conteúdo da pasta

## ⚠️ SCRIPTS DUPLICADOS (Remover excetos 1-2 principais)

- scripts/deploy-background.sh
- scripts/deploy-cloud-run.sh
- scripts/deploy-firebase-optimized.sh
- scripts/deploy-firebase.sh
- scripts/deploy-gcloud.sh
- scripts/deploy-with-env.sh
- scripts/deploy-without-webauthn-extension.sh

**Manter apenas:**
- deploy.sh (principal)
- deploy-firebase.sh (padrão)

## 📊 PRÓXIMOS A ANALISAR

- Components em subdirs: admin/, auth/, chat/, dashboard/, exclusive/, gallery/, italo/, layout/, payments/, pwa/, reviews/, secret-chat/, security/, social/, ui/
- Utils não referenciados
- Scripts de teste em raiz (__tests__, test-*.js)
