import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './features/navbar/navbar.component';
import { AuthService } from './services/auth.service';
import { SocketService } from './services/socket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend';

  constructor(
    public auth: AuthService,
    private socketService: SocketService
  ) {}

  ngOnInit(): void {
    const token = this.auth.getToken();
    if (token && !this.socketService.isConnected()) {
      this.socketService.connect();
    }
  }
}
