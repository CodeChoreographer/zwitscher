import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { DatePipe, CommonModule } from '@angular/common';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-private-chat',
  standalone: true,
  imports: [FormsModule, DatePipe, CommonModule],
  templateUrl: './private-chat.component.html'
})
export class PrivateChatComponent implements OnInit, OnDestroy {
  targetUserId = 0;
  targetUsername = '';
  userId = 0;
  username = '';
  room = '';
  message = '';
  messages: ChatMessage[] = [];
  systemMessage = '';
  waitingForResponse = false;

  constructor(
    private route: ActivatedRoute,
    private socket: SocketService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.targetUserId = Number(this.route.snapshot.paramMap.get('userId'));
    this.userId = this.auth.getUserId()!;
    this.username = this.auth.getUsername()!;
    this.room = [this.userId, this.targetUserId].sort().join('-');

    this.socket.emit('joinPrivateRoom', this.room);

    // Falls wir der Sender sind → zeigen nur Wartetext
    const fromRoute = this.route.snapshot.queryParamMap.get('initiator');
    if (fromRoute === 'true') {
      this.systemMessage = `Warte auf Antwort …`;
      this.waitingForResponse = true;
    }

    // Reaktion auf Antwort vom Empfänger
    this.socket.on('privateChatResponse', (data: any) => {
      if (data.room !== this.room) return;
      this.waitingForResponse = false;

      this.systemMessage = data.accepted
        ? `Chat angenommen – zwitschert los!`
        : `Der andere Benutzer hat den Chat abgelehnt.`;

      if (!data.accepted) {
        setTimeout(() => window.history.back(), 3000);
      }
    });

    // Falls wir der Empfänger sind → Anfrage entgegennehmen und reagieren
    this.socket.on('incomingPrivateChatRequest', (data: any) => {
      if (data.room !== this.room) return;

      const accept = confirm(`${data.fromUsername} möchte mit dir einen Privatchat starten. Annehmen?`);

      this.socket.emit('privateChatResponse', {
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

    this.socket.on('privateMessage', (msg: ChatMessage) => {
      if (msg.room === this.room) {
        this.messages.push(msg);
      }
    });
  }


  ngOnDestroy(): void {
    this.socket.off('privateChatResponse');
    this.socket.off('incomingPrivateChatRequest');
    this.socket.off('privateMessage');
  }

  sendMessage() {
    if (this.message.trim()) {
      const msg: ChatMessage = {
        room: this.room,
        userId: this.userId,
        text: this.message,
        time: new Date().toISOString()
      };
      this.socket.emit('privateMessage', msg);
      this.messages.push(msg);
      this.message = '';
    }
  }

  getUsernameById(id: number): string {
    if (id === -1) return 'System';
    if (id === this.userId) return 'Du';
    if (id === this.targetUserId) return this.targetUsername;
    return 'Unbekannt';
  }

}
