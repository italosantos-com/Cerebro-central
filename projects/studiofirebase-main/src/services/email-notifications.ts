/**
 * 📬 SERVIÇO DE NOTIFICAÇÕES POR EMAIL
 * Envia notificações de segurança para troca de email
 */

import { db, isLocalhost } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface EmailChangeNotification {
  oldEmail: string;
  newEmail: string;
  userName: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

// 📧 ENVIAR NOTIFICAÇÃO PARA EMAIL ANTIGO
export const sendEmailChangeNotificationToOldEmail = async (data: EmailChangeNotification): Promise<boolean> => {
  console.log('[EmailNotifier] 📧 Enviando notificação para email antigo:', data.oldEmail);
  
  if (isLocalhost) {
    // 🧪 SIMULAÇÃO PARA LOCALHOST/EMULATOR
    console.log('[EmailNotifier] 🧪 Modo emulator - simulando notificação');
    console.log('[EmailNotifier] 📧 SIMULAÇÃO - Email para:', data.oldEmail);
    console.log('[EmailNotifier] 📄 Conteúdo simulado:');
    console.log(`
    ═══════════════════════════════════════
    🚨 ALTERAÇÃO DE EMAIL DETECTADA
    ═══════════════════════════════════════
    
    Olá ${data.userName},
    
    Seu email foi alterado de:
    📧 ${data.oldEmail} → ${data.newEmail}
    
    📅 Data: ${data.timestamp}
    🖥️ Navegador: ${data.userAgent || 'Não informado'}
    🌐 IP: ${data.ipAddress || 'Não informado'}
    
    Se você não fez esta alteração:
    1. Acesse imediatamente sua conta
    2. Altere sua senha
    3. Entre em contato conosco
    
    ═══════════════════════════════════════
    `);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('[EmailNotifier] ✅ Notificação simulada como enviada');
    return true;
    
  } else {
    // 🌐 PRODUÇÃO - ENVIO REAL
    try {
      console.log('[EmailNotifier] 🌐 Enviando notificação real via Firebase (Firestore → mail)');

      // Enviar via Firebase Extensions: Trigger Email (escrevendo na coleção `mail`)
      const mailDoc = {
        to: [data.oldEmail],
        message: {
          subject: '🚨 Alteração de Email Detectada',
          text: `Olá ${data.userName},\n\nDetectamos uma alteração no seu email.\nAnterior: ${data.oldEmail}\nNovo: ${data.newEmail}\n\nData: ${data.timestamp}\nNavegador: ${data.userAgent || 'Não informado'}\nIP: ${data.ipAddress || 'Não informado'}\n\nSe você não fez esta alteração: acesse sua conta, altere sua senha e nos avise.`,
          html: `
            <h2>🚨 Alteração de Email Detectada</h2>
            <p>Olá <strong>${data.userName}</strong>,</p>
            <p>Seu email foi alterado de: <strong>${data.oldEmail}</strong> → <strong>${data.newEmail}</strong></p>
            <ul>
              <li><strong>Data:</strong> ${data.timestamp}</li>
              <li><strong>Navegador:</strong> ${data.userAgent || 'Não informado'}</li>
              <li><strong>IP:</strong> ${data.ipAddress || 'Não informado'}</li>
            </ul>
            <p>Se você não fez esta alteração:</p>
            <ol>
              <li>Acesse imediatamente sua conta</li>
              <li>Altere sua senha</li>
              <li>Entre em contato conosco</li>
            </ol>
          `,
        },
        createdAt: serverTimestamp(),
        metadata: {
          type: 'email-change-notification',
          environment: process.env.NEXT_PUBLIC_ENV_TYPE || 'production',
        },
      };
      await addDoc(collection(db, 'mail'), mailDoc);
      console.log('[EmailNotifier] ✅ Documento criado em `mail` para envio');
      return true;
      
    } catch (error) {
      console.error('[EmailNotifier] ❌ Erro ao enviar notificação:', error);
      return false;
    }
  }
};

// 🎉 ENVIAR BOAS-VINDAS PARA EMAIL NOVO
export const sendWelcomeToNewEmail = async (newEmail: string, userName: string): Promise<boolean> => {
  console.log('[EmailNotifier] 🎉 Enviando boas-vindas para email novo:', newEmail);
  
  if (isLocalhost) {
    // 🧪 SIMULAÇÃO PARA LOCALHOST/EMULATOR
    console.log('[EmailNotifier] 🧪 Modo emulator - simulando boas-vindas');
    console.log('[EmailNotifier] 📧 SIMULAÇÃO - Email para:', newEmail);
    console.log('[EmailNotifier] 📄 Conteúdo simulado:');
    console.log(`
    ═══════════════════════════════════════
    🎉 EMAIL ALTERADO COM SUCESSO!
    ═══════════════════════════════════════
    
    Olá ${userName},
    
    Seu email foi alterado com sucesso para:
    📧 ${newEmail}
    
    📅 Data: ${new Date().toLocaleString('pt-BR')}
    
    Agora você pode:
    ✅ Fazer login com seu novo email
    ✅ Receber notificações neste endereço
    ✅ Usar todos os recursos da plataforma
    
    Bem-vindo(a) de volta! 🚀
    
    ═══════════════════════════════════════
    `);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log('[EmailNotifier] ✅ Boas-vindas simuladas como enviadas');
    return true;
    
  } else {
    // 🌐 PRODUÇÃO - ENVIO REAL
    try {
      console.log('[EmailNotifier] 🌐 Enviando boas-vindas reais via Firebase (Firestore → mail)');

      const mailDoc = {
        to: [newEmail],
        message: {
          subject: '🎉 Email alterado com sucesso! – italosantos.com',
          text: `Olá ${userName},\n\nSeu email foi alterado com sucesso para: ${newEmail}.\nAgora você pode fazer login e receber notificações neste endereço.\n\nBem-vindo(a) de volta! 🚀`,
          html: `
            <h2>🎉 Email alterado com sucesso!</h2>
            <p>Olá <strong>${userName}</strong>,</p>
            <p>Seu email foi alterado com sucesso para: <strong>${newEmail}</strong></p>
            <p>Agora você pode:</p>
            <ul>
              <li>✅ Fazer login com seu novo email</li>
              <li>✅ Receber notificações neste endereço</li>
              <li>✅ Usar todos os recursos da plataforma</li>
            </ul>
            <p>Bem-vindo(a) de volta! 🚀</p>
          `,
        },
        createdAt: serverTimestamp(),
        metadata: {
          type: 'email-welcome-new-address',
          environment: process.env.NEXT_PUBLIC_ENV_TYPE || 'production',
        },
      };
      await addDoc(collection(db, 'mail'), mailDoc);
      console.log('[EmailNotifier] ✅ Documento de boas-vindas criado em `mail`');
      return true;
      
    } catch (error) {
      console.error('[EmailNotifier] ❌ Erro ao enviar boas-vindas:', error);
      return false;
    }
  }
};

// 🔄 ENVIAR NOTIFICAÇÃO DE ROLLBACK
export const sendEmailRollbackNotification = async (email: string, userName: string, reason: string): Promise<boolean> => {
  console.log('[EmailNotifier] 🔄 Enviando notificação de rollback:', email);
  
  if (isLocalhost) {
    // 🧪 SIMULAÇÃO PARA LOCALHOST/EMULATOR
    console.log('[EmailNotifier] 🧪 Simulando notificação de rollback');
    console.log(`
    ═══════════════════════════════════════
    🔄 ALTERAÇÃO DE EMAIL REVERTIDA
    ═══════════════════════════════════════
    
    Olá ${userName},
    
    Sua tentativa de alteração de email foi revertida.
    
    📝 Motivo: ${reason}
    📅 Data: ${new Date().toLocaleString('pt-BR')}
    
    Seu email permanece: ${email}
    
    Tente novamente ou entre em contato conosco.
    
    ═══════════════════════════════════════
    `);
    
    return true;
    
  } else {
    // 🌐 PRODUÇÃO - ENVIO REAL
    try {
      console.log('[EmailNotifier] 🌐 Enviando rollback real via Firebase (Firestore → mail)');

      const mailDoc = {
        to: [email],
        message: {
          subject: '🔄 Alteração de email revertida – italosantos.com',
          text: `Olá ${userName},\n\nSua tentativa de alteração de email foi revertida.\nMotivo: ${reason}\n\nSeu email permanece: ${email}\n\nTente novamente ou entre em contato conosco.`,
          html: `
            <h2>🔄 Alteração de email revertida</h2>
            <p>Olá <strong>${userName}</strong>,</p>
            <p>Sua tentativa de alteração de email foi revertida.</p>
            <p><strong>Motivo:</strong> ${reason}</p>
            <p>Seu email permanece: <strong>${email}</strong></p>
            <p>Tente novamente ou entre em contato conosco.</p>
          `,
        },
        createdAt: serverTimestamp(),
        metadata: {
          type: 'email-change-rollback',
          environment: process.env.NEXT_PUBLIC_ENV_TYPE || 'production',
        },
      };
      await addDoc(collection(db, 'mail'), mailDoc);
      console.log('[EmailNotifier] ✅ Documento de rollback criado em `mail`');
      return true;
      
    } catch (error) {
      console.error('[EmailNotifier] ❌ Erro ao enviar rollback:', error);
      return false;
    }
  }
};
