import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function setupNgrok() {
  console.log('🌐 Configurando ngrok para expor localhost...\n');

  console.log('📋 Instruções para configurar ngrok:');
  console.log('');
  console.log('1. Instale o ngrok:');
  console.log('   • Windows: Baixe de https://ngrok.com/download');
  console.log('   • Ou use: npm install -g ngrok');
  console.log('');
  console.log('2. Crie uma conta gratuita em https://ngrok.com');
  console.log('');
  console.log('3. Configure seu token:');
  console.log('   • ngrok config add-authtoken SEU_TOKEN_AQUI');
  console.log('');
  console.log('4. Exponha o localhost:3000:');
  console.log('   • ngrok http 3000');
  console.log('');
  console.log('5. Copie a URL HTTPS gerada (ex: https://abc123.ngrok.io)');
  console.log('');
  console.log('6. Configure no .env.local:');
  console.log('   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io');
  console.log('');
  console.log('7. Reinicie o servidor Next.js');
  console.log('');
  console.log('✅ Com isso, o Mercado Pago conseguirá enviar webhooks!');
  console.log('');
  console.log('💡 Alternativa: Use o botão "Verificar Manualmente" no modal PIX');
  console.log('   (funciona mesmo sem webhook, mas não é automático)');
}

// Executar setup
setupNgrok().catch(console.error);
