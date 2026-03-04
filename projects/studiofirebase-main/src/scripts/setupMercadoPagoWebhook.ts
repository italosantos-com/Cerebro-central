#!/usr/bin/env node

/**
 * Script para configurar webhook do Mercado Pago
 * Execute: npx tsx src/scripts/setupMercadoPagoWebhook.ts
 */

// Carregar variáveis de ambiente
import { config } from 'dotenv';
config({ path: '.env.local' });

async function setupWebhook() {
  console.log('🔧 Configurando Webhook do Mercado Pago...\n');

  const webhookUrl = process.env.NEXT_PUBLIC_BASE_URL 
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook/mercadopago`
    : 'http://localhost:3001/api/webhook/mercadopago';

  console.log('📡 URL do Webhook:', webhookUrl);

  try {
    // 1. Listar webhooks existentes
    console.log('\n📋 Listando webhooks existentes...');
    const listResponse = await fetch('https://api.mercadopago.com/webhooks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (listResponse.ok) {
      const webhooks = await listResponse.json();
      console.log('Webhooks existentes:', webhooks);
    }

    // 2. Criar novo webhook
    console.log('\n➕ Criando novo webhook...');
    const createResponse = await fetch('https://api.mercadopago.com/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['payment.created', 'payment.updated', 'payment.pending', 'payment.in_process', 'payment.cancelled', 'payment.refunded', 'payment.charged_back', 'payment.approved']
      })
    });

    if (createResponse.ok) {
      const webhook = await createResponse.json();
      console.log('✅ Webhook criado com sucesso:', webhook);
    } else {
      const error = await createResponse.text();
      console.error('❌ Erro ao criar webhook:', error);
    }

  } catch (error) {
    console.error('💥 Erro:', error);
  }
}

setupWebhook();
