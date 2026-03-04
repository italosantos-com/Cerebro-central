export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  social: string;
  lastMessage: string;
  timestamp: number;
  priority: number;
  archived: boolean;
  online?: boolean;
}
