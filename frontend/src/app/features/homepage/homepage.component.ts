import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthService} from '../../services/auth.service';

@Component({
  selector: 'app-homepage',
  imports: [
    RouterLink
  ],
  templateUrl: './homepage.component.html',
})
export class HomepageComponent {
  constructor(public auth: AuthService) {}

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}
