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
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

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
    private router: Router,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit() {
    this.username = this.auth.getUsername() ?? 'Unbekannter Benutzer';
    this.userId = this.auth.getUserId()!;

    // Anfrage entgegennehmen
    this.privateChatSub = this.socketService.privateChatRequest$.subscribe(
      async ({ fromId, fromUsername, room }) => {
        if (fromId === this.userId) return;

        const accept = await this.confirmDialog.confirm(
          `${fromUsername} möchte mit dir einen Privatchat starten.`
        );

        this.socketService.emit('privateChatResponse', {
          fromId: this.userId,
          toId: fromId,
          room,
          accepted: accept
        });

        if (accept) {
          this.router.navigate(['/private-chat'], { queryParams: { room } });
        }
      }
    );

    // Initiale Daten laden
    this.socketService.emit('getActiveUser');
    this.socketService.emit('getMessages');

    // Event-Listener
    this.socketService.on('messages', (msgs: ChatMessage[]) => {
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
      const user = this.activeUsers.find(u => u.id === userId);
      if (user) {
        user.username = newUsername;
      }
      this.messages.forEach(msg => {
        if (msg.userId === userId) {
          msg.username = newUsername;
        }
      });
    });

    this.socketService.on('navigateToPrivateChat', (payload: any) => {
      if (!payload?.room) {
        console.error('❌ navigateToPrivateChat: Ungültiger Payload:', payload);
        return;
      }

      const { room } = payload;
      this.socketService.emit('joinPrivateRoom', room);
      this.notify.success('Deine Anfrage wurde angenommen. zwitschert los.');
      this.router.navigate(['/private-chat'], { queryParams: { room } });
    });

    this.socketService.on('privateChatRejected', () => {
      this.notify.error('Deine Anfrage wurde abgelehnt. Du bist wieder im öffentlichen Chat.');
      this.router.navigate(['/chat']);
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
    this.socketService.off('navigateToPrivateChat');
    this.socketService.off('privateChatRejected');
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

  async confirmPrivateChat(user: UserMinimal) {
    const confirmed = await this.confirmDialog.confirm(
      `Privatchat mit ${user.username} starten?`,
      { confirmText: 'Ja', cancelText: 'Nein' }
    );


    if (confirmed) {
      // Kein festen roomNamen erzeugen, sondern serverseitig generieren lassen
      this.socketService.emit('privateChatRequest', {
        fromId: this.userId,
        toId: user.id
      });
      this.notify.info('Anfrage an ' + user.username + ' gesendet. Warte auf Antwort...');
    }
  }

  startBotChat() {
    const botUserId = -2;

    this.socketService.emit('privateChatRequest', {
      fromId: this.userId,
      toId: botUserId
    });
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
