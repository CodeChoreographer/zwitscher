import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  setUsername(newUsername: string): void {
    localStorage.setItem('username', newUsername);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
