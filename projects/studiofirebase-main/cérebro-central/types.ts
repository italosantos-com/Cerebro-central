export interface Attachment {
  type: 'image' | 'video';
  url: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks: GroundingChunk[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  modelId?: string; // Track which model generated this
  attachment?: Attachment;
  groundingMetadata?: GroundingMetadata;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface SafetySetting {
  category: string;
  threshold: string;
}

export type ViewMode = 'chat' | 'admin';

export interface UserData {
  id: string;
  email: string;
  status: 'active' | 'suspended' | 'pending';
  subscription: 'free' | 'premium' | 'vip';
  lastLogin: string;
}

export interface ServiceResponse {
  success: boolean;
  message: string;
  data?: any;
}

export type AIProvider = 'google' | 'openai' | 'meta' | 'xai';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  icon: string;
}
