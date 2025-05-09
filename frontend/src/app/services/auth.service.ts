import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private socketService: SocketService) {}

  login(token: string, username: string): void {
    localStorage.setItem('token', token);
    this.socketService.connect();
  }

  logout(): void {
    this.socketService.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  setUsername(newUsername: string): void {
    localStorage.setItem('username', newUsername);
  }

  getUserId(): number | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId ?? null;
    } catch {
      return null;
    }
  }
}
