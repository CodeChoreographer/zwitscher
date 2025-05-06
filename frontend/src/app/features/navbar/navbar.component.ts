import { Component } from '@angular/core';
import {Router, RouterModule} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import {NotificationService}  from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  constructor(private auth: AuthService, private router: Router, private notify: NotificationService) {}

  logout() {
    this.auth.logout();
    this.notify.success('Du wurdest erfolgreich abgemeldet.');
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }
}
