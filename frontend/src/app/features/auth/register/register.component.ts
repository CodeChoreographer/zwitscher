import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import {FormsModule} from '@angular/forms';
import {NotificationService} from '../../../services/notification.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  standalone: true,
  imports: [
    FormsModule
  ]
})
export class RegisterComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private notify: NotificationService
  ) {}

  isPasswordValid(): boolean {
    const regex = /^(?=.*[0-9])(?=.*[\W_]).{8,}$/;
    return regex.test(this.password);
  }

  get isFormValid(): boolean {
    return this.username.trim().length > 0 && this.password.trim().length > 0;
  }


  onSubmit() {
    this.errorMessage = '';

    this.http.post<any>(`${environment.apiUrl}/register`, {
      username: this.username,
      password: this.password
    }).subscribe({
      next: () => {
        this.notify.success('Registrierung erfolgreich!');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.notify.error(err.error.message || 'Registrierung fehlgeschlagen.');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
