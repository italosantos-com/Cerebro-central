# 🔍 DIAGNÓSTICO - Papo Popo Multichat

## ❌ PROBLEMA IDENTIFICADO

O "Papo Popo Multichat" não está mostrando conversas de redes sociais porque **as integrações nunca foram implementadas para RECEBER mensagens**, apenas para **ENVIAR**.

---

## 📊 ANÁLISE TÉCNICA

### ✅ O que está funcionando:
1. **API de conversas** (`/api/messages/conversations`) - ✅ Funcionando
2. **Interface do Multichat** - ✅ Funcionando  
3. **Banco de dados Prisma** - ✅ Configurado
4. **Rotas de ENVIO de mensagens**:
   - `/api/channels/facebook/send` - ✅ Existe
   - `/api/channels/instagram/send` - ✅ Existe
   - `/api/channels/twitter/send` - ✅ Existe
   - `/api/channels/whatsapp/send` - ✅ Existe

### ❌ O que está FALTANDO:
1. **Webhooks para RECEBER mensagens** (não existem):
   - `/api/channels/facebook/webhook` - ❌ NÃO EXISTE
   - `/api/channels/instagram/webhook` - ❌ NÃO EXISTE
   - `/api/channels/twitter/webhook` - ❌ NÃO EXISTE
   - `/api/channels/whatsapp/webhook` - ❌ NÃO EXISTE

2. **Lógica de processar mensagens recebidas**
3. **Salvar mensagens no Prisma quando chegarem**
4. **Configuração nos serviços das redes sociais** para enviar webhooks

---

## 🎯 SITUAÇÃO ATUAL

```
┌─────────────────────────────────────────────────────────┐
│                  ESTADO DO SISTEMA                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐     │
│  │ Facebook │      │Instagram │      │ Twitter  │     │
│  └──────────┘      └──────────┘      └──────────┘     │
│       │                 │                  │           │
│       │ Envio ✅        │ Envio ✅         │ Envio ✅  │
│       ↓                 ↓                  ↓           │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Seu Sistema (Italo Santos)              │  │
│  │                                                  │  │
│  │  ✅ Pode ENVIAR mensagens                       │  │
│  │  ❌ NÃO pode RECEBER mensagens                  │  │
│  └──────────────────────────────────────────────────┘  │
│       ↓                                                 │
│  ┌──────────┐                                          │
│  │  Prisma  │  ← Banco vazio (sem mensagens)          │
│  └──────────┘                                          │
│       ↓                                                 │
│  ┌──────────┐                                          │
│  │Multichat │  ← Não mostra conversas (não há dados)  │
│  └──────────┘                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 SOLUÇÃO NECESSÁRIA

Para o Papo Popo Multichat funcionar completamente, você precisa:

### 1. **Criar Webhooks** (30-60 minutos)
Implementar 4 rotas de API que receberão mensagens das redes sociais:
- `/api/channels/facebook/webhook` (POST)
- `/api/channels/instagram/webhook` (POST)
- `/api/channels/twitter/webhook` (POST)
- `/api/channels/whatsapp/webhook` (POST)

### 2. **Processar Mensagens Recebidas** (20-30 minutos)
Cada webhook precisa:
- Validar requisição (verificar autenticidade)
- Extrair dados da mensagem (texto, remetente, timestamp)
- Salvar no banco Prisma
- Retornar resposta apropriada

### 3. **Configurar nas Redes Sociais** (30-60 minutos cada)
Registrar as URLs dos webhooks em cada plataforma:
- **Facebook Messenger**: Meta Developer Console
- **Instagram**: Meta Developer Console (mesmo app do Facebook)
- **Twitter/X**: Twitter Developer Portal
- **WhatsApp Business**: WhatsApp Business API

### 4. **Testar** (15-30 minutos)
- Enviar mensagem de cada rede social
- Verificar se aparece no Prisma
- Verificar se aparece no Multichat

---

## 🚀 PRÓXIMOS PASSOS

### Opção 1: **Implementar Agora** (2-4 horas total)
```bash
1. Criar rotas de webhook
2. Configurar nas redes sociais
3. Testar cada integração
```

### Opção 2: **Usar Ferramenta Externa** (30 minutos - 1 hora)
Usar serviço como **Zapier**, **Make (Integromat)**, ou **n8n** para:
- Receber webhooks das redes sociais
- Enviar para sua API
- Salvar no Prisma

### Opção 3: **Focar Apenas no Chat do Site** (já funciona)
O chat do site (Firebase) já está funcionando. O multichat pode ser usado apenas para esse canal por enquanto.

---

## 📋 EXEMPLO DE IMPLEMENTAÇÃO

### Webhook do Facebook (exemplo simplificado):

```typescript
// /src/app/api/channels/facebook/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Verificação do webhook (GET)
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === process.env.FACEBOOK_VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "Invalid verification" }, { status: 403 });
}

// Receber mensagens (POST)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Processar cada entrada
        for (const entry of body.entry) {
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    if (event.message) {
                        // Salvar mensagem no Prisma
                        await prisma.message.create({
                            data: {
                                channel: "facebook",
                                sender: event.sender.id,
                                text: event.message.text || "",
                                timestamp: new Date(event.timestamp),
                                externalId: event.message.mid,
                                userId: "admin", // ou buscar do sistema
                            },
                        });
                    }
                }
            }
        }
        
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("Erro ao processar webhook:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
```

---

## 📖 DOCUMENTAÇÃO ÚTIL

- **Facebook Messenger**: https://developers.facebook.com/docs/messenger-platform/webhooks
- **Instagram**: https://developers.facebook.com/docs/messenger-platform/instagram
- **Twitter/X**: https://developer.twitter.com/en/docs/twitter-api/direct-messages/manage/introduction
- **WhatsApp Business**: https://developers.facebook.com/docs/whatsapp/webhooks

---

## ⚡ RESUMO

**Status atual**: Sistema pode ENVIAR mensagens, mas não pode RECEBER.  
**Problema**: Multichat vazio porque webhooks não existem.  
**Solução**: Implementar webhooks para receber mensagens das redes sociais.  
**Tempo estimado**: 2-4 horas de desenvolvimento + configuração.

---

## ❓ DÚVIDAS?

Execute os scripts de diagnóstico:
```bash
./scripts/diagnosticar-multichat.sh  # Ver estado atual
./scripts/testar-multichat.sh        # Testar endpoints
```

---

**Criado em**: $(date)  
**Versão**: 1.0
