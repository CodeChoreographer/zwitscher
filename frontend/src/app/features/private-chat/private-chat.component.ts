// private-chat.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-private-chat',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './private-chat.component.html'
})
export class PrivateChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  messages: ChatMessage[] = [];
  message = '';
  room = '';
  userId = 0;
  typingUser: string | null = null;
  systemMessage: string | null = null;
  private messageSub!: Subscription;
  private requestSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userId = this.authService.getUserId()!;
    const otherUserId = Number(this.route.snapshot.paramMap.get('id'));
    this.room = [this.userId, otherUserId].sort().join('-');

    console.log('[Init] PrivateChatComponent gestartet für Raum:', this.room);

    this.socketService.connect();

    // Socket Ready melden
    setTimeout(() => {
      console.log('[Socket] Client bereit für Privatchat – sende Ready an Server');
      this.socketService.emit('privateChatReady', {
        userId: this.userId,
        room: this.room
      });
    }, 300); // kleine Verzögerung für Stabilität

    // Nachrichten empfangen
    this.messageSub = this.socketService.privateMessage$.subscribe(msg => {
      console.log('[Nachricht erhalten]', msg);
      if (msg.room === this.room) {
        this.messages.push(msg);
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });

    // Anfrage empfangen
    this.requestSub = this.socketService.privateChatRequest$.subscribe(data => {
      console.log('[PrivateChatRequest empfangen]', data);
      if (data.room !== this.room) return;
      if (data.fromId === this.userId) return;

      const accept = confirm(`${data.fromUsername} möchte mit dir einen Privatchat starten. Annehmen?`);
      this.socketService.emit('privateChatResponse', {
        fromId: this.userId,
        toId: data.fromId,
        room: data.room,
        accepted: accept
      });

      this.systemMessage = accept
        ? `Du hast den Chat mit ${data.fromUsername} angenommen.`
        : `Du hast den Chat mit ${data.fromUsername} abgelehnt.`;

      if (!accept) {
        setTimeout(() => window.history.back(), 3000);
      }
    });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.messageSub?.unsubscribe();
    this.requestSub?.unsubscribe();
  }

  sendMessage(): void {
    if (this.message.trim()) {
      const payload = {
        room: this.room,
        text: this.message
      };
      console.log('[Sende Nachricht]', payload);
      this.socketService.emit('privateMessage', payload);
      this.message = '';
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop =
        this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Scroll-Fehler:', err);
    }
  }

  getUsernameById(id: number): string {
    if (id === -1) return 'System';
    const msg = this.messages.find(m => m.userId === id);
    return msg?.username ?? 'Unbekannt';
  }
}
