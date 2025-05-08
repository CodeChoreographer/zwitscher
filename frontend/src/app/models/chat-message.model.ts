export interface ChatMessage {
  userId: number;
  text: string;
  time: string;
  username?: string;
  room?: string;
}
