import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

interface DeleteSecretChatButtonProps {
  chatId: string;
  onDeleted?: () => void;
}

export default function DeleteSecretChatButton({ chatId, onDeleted }: DeleteSecretChatButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Tem certeza que deseja excluir este chat?')) return;
    setLoading(true);
    // Exclui todas as mensagens do chat
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const messagesSnapshot = await getDocs(messagesRef);
    for (const msg of messagesSnapshot.docs) {
      await deleteDoc(msg.ref);
    }
    // Exclui o chat
    await deleteDoc(doc(db, 'chats', chatId));
    setLoading(false);
    if (onDeleted) onDeleted();
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      {loading ? 'Excluindo...' : 'Excluir'}
    </Button>
  );
}
