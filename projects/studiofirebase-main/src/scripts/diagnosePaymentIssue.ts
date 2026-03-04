import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function diagnosePaymentIssue() {
  console.log('🔍 Diagnosticando problema de pagamento...\n');

  const userEmail = 'bolsonaro@gmail.com'; // Use o email que você usou no pagamento
  const userCPF = '18899832765';

  try {
    // 1. Testar conexão com Mercado Pago
    console.log('🔗 1. Testando conexão com Mercado Pago...');
    
    const connectionResponse = await fetch('http://localhost:3000/api/pix/debug-payments', {
      method: 'GET',
    });

    if (connectionResponse.ok) {
      const connectionResult = await connectionResponse.json();
      console.log('✅ Conexão OK - Pagamentos encontrados:', connectionResult.payments?.length || 0);
    } else {
      console.log('❌ Erro na conexão com Mercado Pago');
    }

    // 2. Verificar pagamentos por email
    console.log('\n📧 2. Verificando pagamentos por email...');
    
    const emailResponse = await fetch('http://localhost:3000/api/pix/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        name: 'Usuário Teste',
        amount: 0.01,
        cpf: userCPF
      }),
    });

    const emailResult = await emailResponse.json();
    console.log('📥 Resultado da verificação por email:', JSON.stringify(emailResult, null, 2));

    // 3. Verificar pagamentos por CPF
    console.log('\n🆔 3. Verificando pagamentos por CPF...');
    
    const cpfResponse = await fetch('http://localhost:3000/api/pix/verify-cpf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cpf: userCPF,
        email: userEmail,
        name: 'Usuário Teste',
        amount: 0.01
      }),
    });

    const cpfResult = await cpfResponse.json();
    console.log('📥 Resultado da verificação por CPF:', JSON.stringify(cpfResult, null, 2));

    // 4. Verificar webhook do Firebase
    console.log('\n🔔 4. Verificando webhook do Firebase...');
    
    const webhookResponse = await fetch(`https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/webhookStatus`, {
      method: 'GET',
    });

    if (webhookResponse.ok) {
      const webhookResult = await webhookResponse.json();
      console.log('✅ Webhook do Firebase está funcionando:', webhookResult);
    } else {
      console.log('❌ Webhook do Firebase não está funcionando');
    }

    // 5. Listar todos os pagamentos recentes
    console.log('\n📋 5. Listando todos os pagamentos recentes...');
    
    const allPaymentsResponse = await fetch('http://localhost:3000/api/pix/debug-payments', {
      method: 'GET',
    });

    if (allPaymentsResponse.ok) {
      const allPaymentsResult = await allPaymentsResponse.json();
      console.log('📊 Pagamentos encontrados:', allPaymentsResult.payments?.length || 0);
      
      if (allPaymentsResult.payments) {
        allPaymentsResult.payments.forEach((payment: any, index: number) => {
          console.log(`   ${index + 1}. ID: ${payment.id}, Status: ${payment.status}, Email: ${payment.payer?.email}, Valor: R$ ${payment.transaction_amount}`);
        });
      }
    }

    // 6. Análise e recomendações
    console.log('\n💡 6. Análise e recomendações:');
    console.log('• Se o pagamento foi feito mas não aparece:');
    console.log('  - Pode ser um problema de sincronização (aguarde alguns minutos)');
    console.log('  - Verifique se o email usado é exatamente: ' + userEmail);
    console.log('  - Verifique se o valor é exatamente: R$ 0.01');
    console.log('• Se o webhook não funcionou:');
    console.log('  - O pagamento pode ter sido feito mas não processado automaticamente');
    console.log('  - Use o botão "Verificar Manualmente" no modal');
    console.log('• Para resolver:');
    console.log('  - Aguarde 2-3 minutos após o pagamento');
    console.log('  - Tente usar o botão "Verificar Manualmente"');
    console.log('  - Verifique se o pagamento foi realmente aprovado no seu banco');

  } catch (error) {
    console.error('\n💥 Erro no diagnóstico:', error);
  }
}

// Executar diagnóstico
diagnosePaymentIssue().catch(console.error);
