import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { NotificationService } from '../../services/notification.service';
import { ChatMessage } from '../../models/chat-message.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PrivateChatComponent implements OnInit, OnDestroy, AfterViewInit {
  messages: ChatMessage[] = [];
  message = '';
  username = '';
  room = '';
  userId!: number;
  typingUser: string | null = null;

  @ViewChild('messageContainer') messageContainer!: ElementRef;

  constructor(
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router,
    private notify: NotificationService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    this.userId = this.auth.getUserId()!;

    this.route.queryParams.subscribe(params => {
      const roomId = params['room'];
      if (!roomId) {
        this.notify.error('Ungültiger Raumzugriff.');
        this.router.navigate(['/chat']);
        return;
      }

      this.room = roomId;
      this.socketService.emit('joinPrivateRoom', this.room);
    });

    this.socketService.on('unauthorizedRoom', () => {
      this.notify.error('Zugriff verweigert. Du bist nicht berechtigt, diesen Privatchat zu betreten.');
      this.router.navigate(['/chat']);
    });

    this.socketService.on('privateMessage', (msg: ChatMessage) => {
      this.messages.push(msg);
      setTimeout(() => this.scrollToBottom(), 0);
    });

    this.socketService.on('typing', (username: string) => {
      this.typingUser = username;
    });

    this.socketService.on('stopTyping', () => {
      this.typingUser = null;
    });

    this.socketService.on('chatMessage', (msg: ChatMessage) => {
      if (msg.userId === -1) {
        this.messages.push({
          userId: -1,
          text: msg.text,
          time: msg.time,
          username: 'System'
        });
      } else {
        this.messages.push(msg);
      }
      setTimeout(() => this.scrollToBottom(), 0);
    });

    this.socketService.on('privateChatRejected', () => {
      this.messages.push({
        userId: -1,
        text: '❌ Deine Anfrage wurde abgelehnt.',
        time: new Date().toISOString(),
        username: 'System'
      });
      setTimeout(() => this.router.navigate(['/chat']), 2000);
    });

    this.socketService.on('privateChatEnded', () => {
      setTimeout(() => this.router.navigate(['/chat']), 3000);
    });

  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.socketService.off('privateMessage');
    this.socketService.off('chatMessage');
    this.socketService.off('privateChatRejected');
    this.socketService.off('typing');
    this.socketService.off('stopTyping');
    this.socketService.off('unauthorizedRoom');
    this.socketService.off('privateChatEnded');
  }

  sendMessage() {
    if (this.message.trim()) {
      this.socketService.emit('privateMessage', {
        room: this.room,
        text: this.message
      });
      this.message = '';
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.sendMessage();
      this.socketService.emit('stopTyping', this.room);
    } else {
      this.socketService.emit('typing', { room: this.room, userId: this.userId });

      clearTimeout((this as any)._typingTimeout);
      (this as any)._typingTimeout = setTimeout(() => {
        this.socketService.emit('stopTyping', this.room);
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
