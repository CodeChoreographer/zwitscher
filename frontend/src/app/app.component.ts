import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { NavbarComponent } from './features/navbar/navbar.component';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  imports: [NavbarComponent, RouterOutlet],
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
