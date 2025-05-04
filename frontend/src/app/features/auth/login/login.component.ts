import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {FormsModule} from '@angular/forms';
import {NotificationService}  from '../../../services/notification.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [
    FormsModule
  ]
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notify: NotificationService
  ) {}

  get isFormValid(): boolean {
    return this.username.trim().length > 0 && this.password.trim().length > 0;
  }

  onSubmit() {
    this.errorMessage = '';

    this.http.post<any>(`${environment.apiUrl}/login`, {
      username: this.username,
      password: this.password
    }).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        this.notify.success('Login erfolgreich 🐦');
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.notify.error(err.error.message || 'Login fehlgeschlagen');
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
