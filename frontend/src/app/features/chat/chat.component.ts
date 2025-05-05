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
  typingUser: string | null = null;
  typingTimeout: any;
  activeUsers: string[] = [];


  constructor(private socketService: SocketService, private auth: AuthService) {}

  ngOnInit() {
      this.username = this.auth.getUsername() ?? 'Unbekannter Benutzer';

      this.socketService.connect();

      this.socketService.emit('registerUser', this.username);

      this.socketService.on('activeUsers', (users: string[]) => {
        this.activeUsers = users;
      });

    this.socketService.connect();

    this.socketService.on('chatMessage', (msg: any) => {
      this.messages.push(msg);
    });

    this.socketService.on('typing', (username: string) => {
      this.typingUser = username;
    });

    this.socketService.on('stopTyping', () => {
      this.typingUser = null;
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
    } else {
      this.socketService.emit('typing', this.username);

      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => {
        this.socketService.emit('stopTyping');
      }, 2000);
    }
  }
}
