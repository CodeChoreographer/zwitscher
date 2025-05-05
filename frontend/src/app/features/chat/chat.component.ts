import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  messages: { user: string; text: string; time: string }[] = [];
  message = '';
  username = '';
  typingUser: string | null = null;
  activeUsers: string[] = [];

  @ViewChild('messageContainer') messageContainer!: ElementRef;

  constructor(private socketService: SocketService, private auth: AuthService) {}

  ngOnInit() {
    this.username = this.auth.getUsername() ?? 'Unbekannter Benutzer';

    this.socketService.connect();

    this.socketService.emit('registerUser', this.username);

    this.socketService.on('loadMessages', (msgs: any[]) => {
      this.messages = msgs;
    });

    this.socketService.on('chatMessage', (msg) => {
      this.messages.push(msg);
      setTimeout(() => this.scrollToBottom(), 0);
    });

    this.socketService.on('typing', (user: string) => {
      this.typingUser = user;
    });

    this.socketService.on('stopTyping', () => {
      this.typingUser = null;
    });

    this.socketService.on('activeUsers', (users: string[]) => {
      this.activeUsers = users;
    });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
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
      clearTimeout((this as any)._typingTimeout);
      (this as any)._typingTimeout = setTimeout(() => {
        this.socketService.emit('stopTyping', null);
      }, 1000);
    }
  }

  private scrollToBottom() {
    try {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Scroll-Fehler:', err);
    }
  }
}
