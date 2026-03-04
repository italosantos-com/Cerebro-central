// src/lib/chat-cleanup.ts
/**
 * @fileOverview Utilitários para limpeza de mensagens temporárias do chat secreto.
 * Mensagens de usuários são marcadas como temporárias e podem ser limpas automaticamente.
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';

/**
 * Remove mensagens temporárias antigas de conversas de chat secreto.
 * @param hoursOld - Remover mensagens mais antigas que X horas (padrão: 24 horas)
 * @returns Promise com o número de mensagens removidas
 */
export async function cleanupTemporaryMessages(hoursOld: number = 24): Promise<number> {
  console.log(`[Chat Cleanup] Iniciando limpeza de mensagens temporárias mais antigas que ${hoursOld} horas...`);
  
  try {
    const cutoffTime = Timestamp.fromDate(new Date(Date.now() - hoursOld * 60 * 60 * 1000));
    let totalDeleted = 0;

    // Buscar todos os chats que começam com 'secret-chat-'
    const chatsRef = collection(db, 'chats');
    const chatsSnapshot = await getDocs(chatsRef);

    for (const chatDoc of chatsSnapshot.docs) {
      const chatId = chatDoc.id;
      
      // Apenas processar chats secretos
      if (!chatId.startsWith('secret-chat-')) continue;

      // Buscar todas as mensagens antigas neste chat (sem filtro isTemporary para evitar índice composto)
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const oldMessagesQuery = query(
        messagesRef,
        where('timestamp', '<', cutoffTime)
      );

      const oldMessagesSnapshot = await getDocs(oldMessagesQuery);
      
      if (oldMessagesSnapshot.empty) continue;

      // Usar batch para deletar múltiplas mensagens eficientemente
      const batch = writeBatch(db);
      let batchCount = 0;

      // Filtrar mensagens temporárias no código (em vez do Firestore)
      oldMessagesSnapshot.docs.forEach((messageDoc) => {
        const messageData = messageDoc.data();
        if (!messageData.isTemporary) return; // Pular mensagens não temporárias
        batch.delete(messageDoc.ref);
        batchCount++;
        totalDeleted++;
      });

      // Commit batch se houver mensagens para deletar
      if (batchCount > 0) {
        await batch.commit();
        console.log(`[Chat Cleanup] Removidas ${batchCount} mensagens temporárias do chat ${chatId}`);
      }
    }

    console.log(`[Chat Cleanup] Limpeza concluída. Total de mensagens removidas: ${totalDeleted}`);
    return totalDeleted;

  } catch (error) {
    console.error('[Chat Cleanup] Erro durante a limpeza:', error);
    throw error;
  }
}

/**
 * Remove chats secretos completamente vazios (sem mensagens).
 * Isso acontece quando todas as mensagens temporárias são removidas.
 * @returns Promise com o número de chats removidos
 */
export async function cleanupEmptyChats(): Promise<number> {
  console.log('[Chat Cleanup] Iniciando limpeza de chats vazios...');
  
  try {
    const chatsRef = collection(db, 'chats');
    const chatsSnapshot = await getDocs(chatsRef);
    let totalDeleted = 0;

    for (const chatDoc of chatsSnapshot.docs) {
      const chatId = chatDoc.id;
      
      // Apenas processar chats secretos
      if (!chatId.startsWith('secret-chat-')) continue;

      // Verificar se o chat tem mensagens
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const messagesSnapshot = await getDocs(messagesRef);

      // Se não há mensagens, remover o chat
      if (messagesSnapshot.empty) {
        await deleteDoc(doc(db, 'chats', chatId));
        totalDeleted++;
        console.log(`[Chat Cleanup] Chat vazio removido: ${chatId}`);
      }
    }

    console.log(`[Chat Cleanup] Limpeza de chats vazios concluída. Total removidos: ${totalDeleted}`);
    return totalDeleted;

  } catch (error) {
    console.error('[Chat Cleanup] Erro durante limpeza de chats vazios:', error);
    throw error;
  }
}

/**
 * Remove TODOS os chats secretos e suas mensagens (limpeza manual completa).
 * CUIDADO: Esta função remove TODOS os dados de chat secreto permanentemente!
 * @returns Promise com estatísticas da limpeza
 */
export async function manualDeleteAllSecretChats(): Promise<{
  messagesDeleted: number;
  chatsDeleted: number;
}> {
  console.log('[Chat Cleanup] ⚠️  INICIANDO LIMPEZA MANUAL COMPLETA - TODOS OS CHATS SECRETOS SERÃO REMOVIDOS!');
  
  try {
    let totalMessagesDeleted = 0;
    let totalChatsDeleted = 0;

    // Buscar todos os chats
    const chatsRef = collection(db, 'chats');
    const chatsSnapshot = await getDocs(chatsRef);

    for (const chatDoc of chatsSnapshot.docs) {
      const chatId = chatDoc.id;
      // Apenas processar chats secretos
      if (!chatId.startsWith('secret-chat-')) continue;

      console.log(`[Chat Cleanup] Removendo chat: ${chatId}`);

      // Primeiro, remover todas as mensagens do chat
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const messagesSnapshot = await getDocs(messagesRef);

      let messagesInChatDeleted = 0;
      let batch = writeBatch(db);
      let batchCount = 0;

      for (const messageDoc of messagesSnapshot.docs) {
        batch.delete(messageDoc.ref);
        batchCount++;
        messagesInChatDeleted++;

        // Commit batch a cada 500 operações (limite do Firestore)
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`[Chat Cleanup] Batch de ${batchCount} mensagens removidas do chat ${chatId}`);
          batch = writeBatch(db); // Recria o batch corretamente
          batchCount = 0;
        }
      }

      // Commit batch restante
      if (batchCount > 0) {
        await batch.commit();
        console.log(`[Chat Cleanup] ${batchCount} mensagens finais removidas do chat ${chatId}`);
      }

      // Depois, remover o documento do chat
      await deleteDoc(doc(db, 'chats', chatId));

      totalMessagesDeleted += messagesInChatDeleted;
      totalChatsDeleted++;

      console.log(`[Chat Cleanup] ✅ Chat ${chatId} removido completamente (${messagesInChatDeleted} mensagens)`);
    }

    console.log(`[Chat Cleanup] 🧹 LIMPEZA MANUAL COMPLETA FINALIZADA!`);
    console.log(`[Chat Cleanup] 📊 Total: ${totalChatsDeleted} chats e ${totalMessagesDeleted} mensagens removidos`);

    return {
      messagesDeleted: totalMessagesDeleted,
      chatsDeleted: totalChatsDeleted
    };

  } catch (error) {
    console.error('[Chat Cleanup] ❌ Erro durante limpeza manual completa:', error);
    throw error;
  }
}

/**
 * Executa limpeza completa: remove mensagens temporárias antigas e chats vazios.
 * @param hoursOld - Idade das mensagens para remoção (padrão: 24 horas)
 * @returns Promise com estatísticas da limpeza
 */
export async function performFullCleanup(hoursOld: number = 24): Promise<{
  messagesDeleted: number;
  chatsDeleted: number;
}> {
  console.log('[Chat Cleanup] Iniciando limpeza completa...');
  
  const messagesDeleted = await cleanupTemporaryMessages(hoursOld);
  const chatsDeleted = await cleanupEmptyChats();

  console.log(`[Chat Cleanup] Limpeza completa finalizada. Mensagens: ${messagesDeleted}, Chats: ${chatsDeleted}`);
  
  return {
    messagesDeleted,
    chatsDeleted
  };
}
