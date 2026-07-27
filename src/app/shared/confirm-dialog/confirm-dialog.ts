import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Generic confirm/cancel modal, reused wherever a destructive action needs confirmation (RF-DOC-06). */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.css'],
})
export class ConfirmDialogComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) message!: string;
  @Input() confirmLabel = 'Eliminar';
  @Input() cancelLabel = 'Cancelar';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
