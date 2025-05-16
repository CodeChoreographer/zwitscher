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
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { environment } from '../../../environments/environment';


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
  selectedFile?: File;
  selectedFileName?: string;

  @ViewChild('messageContainer') messageContainer!: ElementRef;

  constructor(
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router,
    private notify: NotificationService,
    private auth: AuthService,
    private confirm: ConfirmDialogService
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
      this.notify.error('Zugriff verweigert.');
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
      this.messages.push(msg);
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
      this.notify.info('🚪 Der Chat wurde vom Partner beendet.');
      setTimeout(() => this.router.navigate(['/chat']), 2000);
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedFileName = this.selectedFile.name;
    } else {
      this.selectedFile = undefined;
      this.selectedFileName = undefined;
    }
  }

  sendMessage() {
    if (this.selectedFile) {
      const textAfterFile = this.message;
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      fetch(`${environment.apiUrl}/upload`, {
        method: 'POST',
        body: formData
      })

        .then(res => res.json())
        .then(data => {
          const fileMsg = `__file__:${data.url}|${data.originalName}`;
          this.socketService.emit('privateMessage', {
            room: this.room,
            text: fileMsg
          });

          this.selectedFile = undefined;
          this.selectedFileName = undefined;

          if (textAfterFile.trim()) {
            this.socketService.emit('privateMessage', {
              room: this.room,
              text: textAfterFile
            });
            this.message = '';
          }
        })
        .catch(err => {
          console.error('Upload-Fehler:', err);
          this.notify.error('❌ Datei konnte nicht hochgeladen werden.');
        });

      return;
    }

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

  async closePrivateChat() {
    const confirmed = await this.confirm.confirm('Möchtest du den Privatchat wirklich verlassen?', {
      confirmText: 'Ja',
      cancelText: 'Nein'
    });

    if (confirmed) {
      this.socketService.emit('privateChatEnded', this.room);
      this.router.navigate(['/chat']);
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
