"use client";

import { createContext, useContext, useState } from 'react';
import { Conversation } from '@/types/inbox';

interface AdminConversationContextValue {
  selectedConversation: Conversation | null;
  openConversation: (conversation: Conversation) => void;
  closeConversation: () => void;
}

const AdminConversationContext = createContext<AdminConversationContextValue>({
  selectedConversation: null,
  openConversation: () => {},
  closeConversation: () => {},
});

export function AdminConversationProvider({ children }: { children: React.ReactNode }) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const openConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  const closeConversation = () => {
    setSelectedConversation(null);
  };

  return (
    <AdminConversationContext.Provider value={{ selectedConversation, openConversation, closeConversation }}>
      {children}
    </AdminConversationContext.Provider>
  );
}

export function useAdminConversation() {
  return useContext(AdminConversationContext);
}
