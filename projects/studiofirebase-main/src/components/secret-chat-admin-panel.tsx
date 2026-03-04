import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

interface ChatInfo {
  id: string;
  createdAt?: string;
}

export default function SecretChatAdminPanel() {
  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchChats() {
    setLoading(true);
    const chatsRef = collection(db, 'chats');
    const snapshot = await getDocs(chatsRef);
    const secretChats = snapshot.docs
      .filter(doc => doc.id.startsWith('secret-chat-'))
      .map(doc => ({
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate?.().toLocaleString() || '',
      }));
    setChats(secretChats);
    setLoading(false);
  }

  async function handleDelete(chatId: string) {
    if (!window.confirm('Tem certeza que deseja excluir este chat?')) return;
    setDeleting(chatId);
    // Exclui todas as mensagens do chat
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const messagesSnapshot = await getDocs(messagesRef);
    for (const msg of messagesSnapshot.docs) {
      await deleteDoc(msg.ref);
    }
    // Exclui o chat
    await deleteDoc(doc(db, 'chats', chatId));
    setDeleting(null);
    fetchChats();
  }

  useEffect(() => {
    fetchChats();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Chats Secretos</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <ul className="space-y-2">
          {chats.map(chat => (
            <li key={chat.id} className="flex items-center justify-between border p-2 rounded">
              <span>
                <b>{chat.id}</b>
                {chat.createdAt && <span className="ml-2 text-xs text-gray-500">{chat.createdAt}</span>}
              </span>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting === chat.id}
                onClick={() => handleDelete(chat.id)}
              >
                {deleting === chat.id ? 'Excluindo...' : 'Excluir'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
