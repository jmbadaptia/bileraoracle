export interface Source {
  index: number;
  title: string;
  documentId: string;
  sessionType: string;
  similarity: number;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
  createdAt?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
