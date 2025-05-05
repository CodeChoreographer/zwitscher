import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  constructor(private auth: AuthService) {}

  logout() {
    this.auth.logout();
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }
}
