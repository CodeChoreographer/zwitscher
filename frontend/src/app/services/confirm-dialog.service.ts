import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Öffnet einen Bestätigungsdialog.
   * @param message Die Nachricht im Dialog.
   * @param options Optional: eigene Beschriftungen für die Buttons.
   */
  async confirm(message: string, options?: { confirmText?: string; cancelText?: string }): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message,
        confirmText: options?.confirmText ?? 'Annehmen',
        cancelText: options?.cancelText ?? 'Ablehnen'
      }
    });
    return await firstValueFrom(ref.afterClosed());
  }

}
