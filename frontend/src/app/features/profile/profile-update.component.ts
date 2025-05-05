import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile-update',
  templateUrl: './profile-update.component.html',
  standalone: true,
  imports: [FormsModule]
})
export class ProfileUpdateComponent implements OnInit {
  currentUsername = '';
  newUsername = '';
  oldPassword = '';
  newPassword = '';

  constructor(private http: HttpClient, private notify: NotificationService) {}

  ngOnInit() {
    this.http.get<{ username: string }>(`${environment.apiUrl}/api/users/profile`).subscribe({
      next: (res) => {
        this.currentUsername = res.username;
      },
      error: () => {
        this.notify.error('Fehler beim Laden des Profils');
      }
    });
  }

  updateUsername() {
    if (!this.newUsername.trim()) {
      this.notify.warning('Benutzername darf nicht leer sein');
      return;
    }

    this.http.put(`${environment.apiUrl}/api/users/update-username`, { newUsername: this.newUsername })
      .subscribe({
        next: () => {
          this.notify.success('Benutzername erfolgreich geändert');
          this.currentUsername = this.newUsername;
          this.newUsername = '';
        },
        error: err => {
          const msg = err.error?.message || 'Fehler beim Ändern des Benutzernamens';
          this.notify.error(msg);
        }
      });
  }

  changePassword() {
    const regex = /^(?=.*[0-9])(?=.*[\W_]).{8,}$/;
    if (!regex.test(this.newPassword)) {
      this.notify.warning('Passwort zu schwach (mind. 8 Zeichen, 1 Zahl, 1 Sonderzeichen)');
      return;
    }

    this.http.put(`${environment.apiUrl}/api/users/change-password`, {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.notify.success('Passwort erfolgreich geändert');
        this.oldPassword = '';
        this.newPassword = '';
      },
      error: err => {
        const msg = err.error?.message || 'Fehler beim Ändern des Passworts';
        this.notify.error(msg);
      }
    });
  }
}
