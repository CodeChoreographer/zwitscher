import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  constructor(private auth: AuthService, protected router: Router) {}

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  get username() {
    return this.auth.getUsername();
  }
}
