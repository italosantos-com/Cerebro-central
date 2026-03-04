
"use client";

import InboxLayout from '@/components/InboxLayout';

export default function AdminConversationsPage() {
  return (
    <main
      className="min-h-screen p-4"
      style={{ backgroundColor: 'var(--app-background-color)', color: 'var(--app-text-color)' }}
    >
      <InboxLayout />
    </main>
  );
}
