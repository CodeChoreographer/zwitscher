import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket!: Socket;

  connect(): void {
    const token = localStorage.getItem('token');
    this.socket = io(environment.apiUrl, {
      auth: { token }
    });
  }



  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket.on(event, callback);
  }

  emit(event: string, data?: any): void {
    this.socket.emit(event, data);
  }
}
