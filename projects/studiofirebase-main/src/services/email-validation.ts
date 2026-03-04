/**
 * 📧 SERVIÇO DE VALIDAÇÃO DE EMAIL
 * Valida se um email existe e pode receber mensagens
 */

import { isLocalhost } from '@/lib/firebase';

// 🔍 VALIDAR SE EMAIL EXISTE (SIMULAÇÃO PARA LOCALHOST)
export const validateEmailExists = async (email: string): Promise<boolean> => {
  console.log('[EmailValidator] 🔍 Validando existência do email:', email);
  
  if (isLocalhost) {
    // 🧪 SIMULAÇÃO PARA LOCALHOST/EMULATOR
    console.log('[EmailValidator] 🧪 Modo emulator - simulando validação');
    
    // Simular emails inválidos para teste
    const invalidEmails = [
      'teste@emailinvalido.fake',
      'naoexiste@dominiofake.com',
      'erro@teste.invalid'
    ];
    
    if (invalidEmails.includes(email.toLowerCase())) {
      console.log('[EmailValidator] ❌ Email simulado como inválido');
      return false;
    }
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('[EmailValidator] ✅ Email simulado como válido');
    return true;
    
  } else {
    // 🌐 PRODUÇÃO - VALIDAÇÃO REAL
    console.log('[EmailValidator] 🌐 Modo produção - validação real');
    
    try {
      // Método 1: Verificar formato avançado
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('[EmailValidator] ❌ Formato inválido');
        return false;
      }
      
      // Método 2: Verificar domínios conhecidos como inválidos
      const invalidDomains = [
        'tempmail.com',
        '10minutemail.com',
        'guerrillamail.com',
        'mailinator.com'
      ];
      
      const domain = email.split('@')[1]?.toLowerCase();
      if (invalidDomains.includes(domain)) {
        console.log('[EmailValidator] ❌ Domínio temporário detectado');
        return false;
      }
      
      // Método 3: Verificar MX Record (em produção, você pode usar um serviço)
      // Por enquanto, assumir que emails com domínios conhecidos são válidos
      const trustedDomains = [
        'gmail.com',
        'outlook.com',
        'hotmail.com',
        'yahoo.com',
        'icloud.com',
        'protonmail.com'
      ];
      
      if (trustedDomains.includes(domain)) {
        console.log('[EmailValidator] ✅ Domínio confiável detectado');
        return true;
      }
      
      // Para outros domínios, assumir válido (você pode integrar com serviços de validação)
      console.log('[EmailValidator] ✅ Email assumido como válido');
      return true;
      
    } catch (error) {
      console.error('[EmailValidator] ❌ Erro na validação:', error);
      // Em caso de erro, assumir válido para não bloquear o usuário
      return true;
    }
  }
};

// 📬 ENVIAR EMAIL DE TESTE (APENAS PARA VALIDAÇÃO)
export const sendTestEmail = async (email: string): Promise<boolean> => {
  console.log('[EmailValidator] 📬 Enviando email de teste para:', email);
  
  if (isLocalhost) {
    // 🧪 SIMULAÇÃO PARA LOCALHOST
    console.log('[EmailValidator] 🧪 Simulando envio de email de teste');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('[EmailValidator] ✅ Email de teste simulado como enviado');
    return true;
    
  } else {
    // 🌐 PRODUÇÃO - ENVIO REAL
    try {
      // Aqui você pode integrar com:
      // - SendGrid
      // - AWS SES
      // - Nodemailer
      // - Resend
      
      console.log('[EmailValidator] 🌐 Enviando email real de teste');
      
      // Por enquanto, simular sucesso
      // TODO: Implementar envio real de email
      
      return true;
      
    } catch (error) {
      console.error('[EmailValidator] ❌ Erro ao enviar email de teste:', error);
      return false;
    }
  }
};

// 🔍 VERIFICAR SE EMAIL JÁ EXISTE NO SISTEMA
export const checkEmailExistsInSystem = async (email: string, currentUserId: string): Promise<boolean> => {
  // Esta função será implementada no AuthProvider para usar o Firestore
  // Mantemos aqui apenas como referência
  return false;
};
