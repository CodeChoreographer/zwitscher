import { Component, OnInit, OnDestroy } from '@angular/core';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule
  ]
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: { user: string; text: string; time: string }[] = [];
  message = '';
  username = '';

  constructor(private socketService: SocketService, private auth: AuthService) {}

  ngOnInit() {
    this.username = this.auth.getUsername() ?? 'Unbekannter Benutzer';

    this.socketService.connect();

    this.socketService.on('chatMessage', (msg: { user: string; text: string; time: string }) => {
      this.messages.push(msg);
    });
  }

  ngOnDestroy() {
    this.socketService.disconnect();
  }

  sendMessage() {
    if (this.message.trim() !== '') {
      const chatMessage = {
        user: this.username,
        text: this.message,
        time: new Date().toISOString()
      };

      this.socketService.emit('chatMessage', chatMessage);
      this.message = '';
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }
}
