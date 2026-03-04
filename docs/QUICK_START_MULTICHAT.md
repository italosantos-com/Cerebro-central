# Guia Rápido: Ativar Sistema de Chat Unificado

## ⚡ Instalação Rápida (5 minutos)

### 1. **Migrar Banco de Dados**
```bash
cd "/Users/italosanta/Downloads/italosantos.com original"

# Criar migração
npx prisma migrate dev --name add_multichat_support

# Gerar cliente
npx prisma generate
```

### 2. **Habilitar Contador de Não Lidas** (Opcional)
Após a migração, descomente o código em:

**Arquivo**: `/src/app/api/messages/conversations/route.ts`

```typescript
// Encontre esta linha (aprox. linha 46)
const unreadCount = 0; // Por enquanto sempre 0

// SUBSTITUA por:
const unreadCount = await prisma.message.count({
    where: {
        userId,
        channel: msg.channel,
        sender: msg.sender,
        read: false,
    },
});
```

### 3. **Testar**
```bash
# Iniciar servidor
npm run dev

# Abrir navegador
open http://localhost:3000/admin/conversations
```

## 🎯 Verificações

### ✅ Checklist Pré-Teste
- [ ] `npm install` executado (já feito)
- [ ] Banco PostgreSQL rodando
- [ ] `.env.local` configurado com `DATABASE_URL`
- [ ] `npx prisma migrate dev` executado
- [ ] `npm run dev` rodando

### 🔍 Como Saber se Funcionou?

#### Console do Browser (F12 > Console):
```
📊 Conversas carregadas: 3
```

#### Terminal do Servidor:
```
✅ Retornando 3 conversas (Prisma: não, Firebase: sim)
```

#### Interface:
- Tab "Chat Unificado (Multi-Canal)" aparece
- Lista de conversas visível
- Ao clicar em conversa, mensagens carregam

## 🐛 Solução de Problemas

### Problema: "Error: P1001 Can't reach database"
```bash
# Verificar se PostgreSQL está rodando
# macOS
brew services list | grep postgresql

# Iniciar se necessário
brew services start postgresql@14
```

### Problema: "PrismaClientInitializationError"
```bash
# Regerar cliente Prisma
npx prisma generate
```

### Problema: Nenhuma conversa aparece
```bash
# 1. Verificar se há conversas no Firebase
# Abra outro navegador em modo anônimo
# Vá para http://localhost:3000
# Use o chat do site

# 2. Verificar logs
# Abra console (F12) e veja erros
# Veja terminal do servidor
```

### Problema: "Column 'read' does not exist"
```bash
# Você esqueceu de rodar a migração!
npx prisma migrate dev --name add_multichat_support
npx prisma generate
```

## 📚 Recursos Adicionais

- [MULTICHAT_INTEGRATION.md](./MULTICHAT_INTEGRATION.md) - Documentação completa
- [FIX_SESSION_PROVIDER.md](./FIX_SESSION_PROVIDER.md) - Detalhes da correção

## 🚀 Próximos Passos

Depois que funcionar:
1. Configurar webhooks sociais
2. Vincular canais (FB/IG/Twitter)
3. Testar envio de mensagens
4. Configurar WhatsApp Business API

---

**Tempo estimado**: 5-10 minutos  
**Dificuldade**: ⭐ Fácil
