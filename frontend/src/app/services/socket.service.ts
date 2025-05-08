import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private connected = false;

  private privateChatRequestSubject = new Subject<{ fromId: number, fromUsername: string, room: string }>();
  public privateChatRequest$ = this.privateChatRequestSubject.asObservable();

  connect(): void {
    if (this.connected || this.socket) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    this.socket = io(environment.apiUrl, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('🔌 Socket verbunden:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('🛑 Socket getrennt');
    });

    this.socket.on('incomingPrivateChatRequest', (data) => {
      console.log('[📥] Empfangen im SocketService:', data);
      this.privateChatRequestSubject.next(data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string): void {
    this.socket?.off(event);
  }
}
