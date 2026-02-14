export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AiChat {
  id: number;
  userId: number;
  messages: AiChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AiChatRequest {
  message: string;
  chatId?: number;
}

export interface AiChatResponse {
  chatId: number;
  message: string;
  creditsUsed: number;
  creditsRemaining: number;
}
