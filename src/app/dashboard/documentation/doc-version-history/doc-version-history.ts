import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ContentService } from '../../../shared/content.service';
import { PageVersion, VersionTrigger } from '../../../shared/api.service';

const TRIGGER_ICON: Record<VersionTrigger, string> = {
  submitted_for_review: 'send',
  approved: 'check',
  rejected: 'x-circle',
};

const TRIGGER_LABEL: Record<VersionTrigger, string> = {
  submitted_for_review: 'Enviado a revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

/** Historial de versiones de una página (RF-DOC-08) — panel lateral, mismo patrón visual que doc-search/doc-link-picker. */
@Component({
  selector: 'app-doc-version-history',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './doc-version-history.html',
  styleUrls: ['./doc-version-history.css'],
})
export class DocVersionHistoryComponent {
  content = inject(ContentService);

  @Output() close = new EventEmitter<void>();

  readonly triggerIcon = TRIGGER_ICON;
  readonly triggerLabel = TRIGGER_LABEL;

  diffSummary(v: PageVersion): string {
    const parts: string[] = [];
    if (v.diff.blocksAdded) parts.push(`${v.diff.blocksAdded} bloque(s) agregado(s)`);
    if (v.diff.blocksRemoved) parts.push(`${v.diff.blocksRemoved} bloque(s) eliminado(s)`);
    if (v.diff.blocksChanged) parts.push(`${v.diff.blocksChanged} bloque(s) modificado(s)`);
    if (v.diff.titleChanged) parts.push('título cambiado');
    return parts.length ? parts.join(', ') : 'sin cambios de contenido';
  }
}
