export interface Source {
  index: number;
  type: string;
  id: string;
  title: string;
  distance: number;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[] | null;
  exportable?: boolean;
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
