import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  username = '';
  password = '';
  error: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  get isFormValid(): boolean {
    return this.username.trim() !== '' && this.password.trim() !== '';
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  onSubmit() {
    this.error = null;
    this.http.post<any>(`${environment.apiUrl}/login`, {
      username: this.username,
      password: this.password
    }).subscribe({
      next: (res) => {
        const { token, username } = res;
        this.authService.login(token, username);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Login fehlgeschlagen';
      }
    });
  }
}
