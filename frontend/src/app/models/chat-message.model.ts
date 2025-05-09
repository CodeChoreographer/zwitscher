export interface ChatMessage {
  room?: string;
  userId: number;
  username?: string;
  text: string;
  time: string;
}
