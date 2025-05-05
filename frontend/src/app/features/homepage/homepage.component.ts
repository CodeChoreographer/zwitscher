import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-homepage',
  imports: [
    RouterLink
  ],
  templateUrl: './homepage.component.html',
})
export class HomepageComponent {

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }
}
