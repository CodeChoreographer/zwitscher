import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';
import { ChatMessage } from '../../models/chat-message.model';
import { UserMinimal } from '../../models/user-minimal.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewInit {
  userId: number = 0;
  messages: ChatMessage[] = [];
  message = '';
  username = '';
  typingUser: string | null = null;
  activeUsers: UserMinimal[] = [];
  private privateChatSub!: Subscription;

  @ViewChild('messageContainer') messageContainer!: ElementRef;

  constructor(
    private socketService: SocketService,
    private auth: AuthService,
    private notify: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.username = this.auth.getUsername() ?? 'Unbekannter Benutzer';
    this.userId = this.auth.getUserId()!;

    // Initialdaten anfordern
    this.socketService.emit('getActiveUser');
    this.socketService.emit('getMessages');

    this.socketService.on('messages', (msgs: ChatMessage[]) => {
      console.log('[DEBUG] Nachrichten erhalten:', msgs);
      this.messages = msgs;
      setTimeout(() => this.scrollToBottom(), 0);
    });

    this.socketService.on('chatMessage', (msg: ChatMessage) => {
      this.messages.push(msg);
      setTimeout(() => this.scrollToBottom(), 0);
    });

    this.socketService.on('typing', (user: string) => {
      this.typingUser = user;
    });

    this.socketService.on('stopTyping', () => {
      this.typingUser = null;
    });

    this.socketService.on('activeUsers', (users: UserMinimal[]) => {
      this.activeUsers = users;
    });

    this.socketService.on('yourUsername', (uname: string) => {
      this.username = uname;
    });

    this.socketService.on('usernameChanged', ({ userId, newUsername }) => {
      // Update aktive Benutzerliste (optional visuell)
      const user = this.activeUsers.find(u => u.id === userId);
      if (user) {
        user.username = newUsername;
      }

      // Update aller Nachrichten mit dem Benutzer
      this.messages.forEach(msg => {
        if (msg.userId === userId) {
          msg.username = newUsername;
        }
      });
    });

    this.privateChatSub = this.socketService.privateChatRequest$.subscribe(({ fromId, fromUsername, room }) => {
      const accept = confirm(`${fromUsername} möchte mit dir einen Privatchat starten. Annehmen?`);
      this.socketService.emit('privateChatResponse', {
        fromId: this.auth.getUserId(),
        toId: fromId,
        room,
        accepted: accept
      });

      if (accept) {
        this.router.navigate(['/private-chat', fromId]);
      }
    });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.socketService.emit('setOnlineStatus', false);
    this.socketService.off('messages');
    this.socketService.off('chatMessage');
    this.socketService.off('typing');
    this.socketService.off('stopTyping');
    this.socketService.off('activeUsers');
    this.socketService.off('yourUsername');
    this.socketService.off('usernameChanged');
    this.privateChatSub?.unsubscribe();
  }

  sendMessage() {
    if (this.message.trim()) {
      const chatMessage: ChatMessage = {
        userId: this.userId,
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
      this.socketService.emit('typing', this.userId);
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

  confirmPrivateChat(user: UserMinimal) {
    const confirmed = confirm(`Privatchat mit ${user.username} starten?`);
    if (confirmed) {
      const room = [this.userId, user.id].sort().join('-');

      this.socketService.emit('privateChatRequest', {
        fromId: this.userId,
        toId: user.id,
        room
      });

      this.router.navigate(['/private-chat', user.id], {
        queryParams: { initiator: 'true' }
      });
    }
  }
}
