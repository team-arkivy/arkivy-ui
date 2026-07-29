import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { DocLinkPickerComponent } from '../doc-link-picker/doc-link-picker';
import { Block, Page } from '../../../shared/api.service';
import { ContentService } from '../../../shared/content.service';

const LANGUAGE_OPTIONS = [
  'javascript', 'typescript', 'python', 'go', 'bash', 'json', 'html', 'css', 'sql', 'other',
];

const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md', '.xls', '.xlsx'];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

interface FileMeta {
  attachmentId: string;
  fileName: string;
  fileSizeBytes: number;
}

/**
 * Renders a single block. Mostly presentational — text/code edits go up via
 * outputs, DocBlockListComponent owns the array — but the `file` block's
 * upload/download/delete lifecycle has local transient state (uploading,
 * error) that doesn't belong in ContentService, so it injects it directly
 * for that one action. That local state is signal-based, not plain
 * properties: this app is zoneless (no zone.js), so a plain property
 * mutated inside a .subscribe() callback with no signal write in the same
 * chain never triggers a re-render — see ContentService's own doc comment.
 */
@Component({
  selector: 'app-doc-block',
  standalone: true,
  imports: [CommonModule, IconComponent, DocLinkPickerComponent],
  templateUrl: './doc-block.html',
  styleUrls: ['./doc-block.css'],
})
export class DocBlockComponent implements AfterViewInit {
  @Input({ required: true }) block!: Block;

  @Output() contentChange = new EventEmitter<string>();
  @Output() languageChange = new EventEmitter<string>();
  @Output() splitRequested = new EventEmitter<{ before: string; after: string }>();
  @Output() mergeRequested = new EventEmitter<void>();
  @Output() linkInsertRequested = new EventEmitter<Page>();

  private content = inject(ContentService);
  private router = inject(Router);

  @ViewChild('textRef') private textRef?: ElementRef<HTMLTextAreaElement>;

  readonly languageOptions = LANGUAGE_OPTIONS;
  readonly copied = signal(false);

  ngAfterViewInit(): void {
    if (this.textRef) this.autoResize(this.textRef.nativeElement);
  }

  // ─── Bloque de enlace (RF-NODE-02/03/05) ────────────────────────────────

  get linkTarget(): { pageId: string; title: string; broken: boolean } | null {
    const m = this.block.metadata;
    if (!m?.['targetPageId']) return null;
    const pageId = m['targetPageId'] as string;
    const broken = !this.content.currentPageLinks().some(l => l.targetPageId === pageId);
    return { pageId, title: m['targetPageTitle'] as string, broken };
  }

  onLinkPicked(page: Page): void {
    this.content.setLinkTarget(this.block.id, page);
  }

  clearLinkTarget(): void {
    this.content.clearLinkTarget(this.block.id);
  }

  navigateToLinkTarget(): void {
    const target = this.linkTarget;
    if (target) void this.router.navigate(['/dashboard/documentation', target.pageId]);
  }

  /** Enlace roto (RF-NODE-05): la página destino se borró — crea una nueva en su lugar, reusando el título cacheado. */
  recreateLinkTarget(): void {
    const target = this.linkTarget;
    const page = this.content.currentPage();
    if (!target || !page) return;
    this.content.createPage(page.category, target.title).subscribe({
      next: newPage => this.content.setLinkTarget(this.block.id, newPage),
    });
  }

  // ─── Autocompletar [[ dentro de un bloque de texto (RF-NODE-01) ────────

  readonly showLinkTrigger = signal(false);

  onLinkTriggerPicked(page: Page): void {
    const ta = this.textRef?.nativeElement;
    let value = ta?.value ?? this.block.content;
    if (value.endsWith('[[')) value = value.slice(0, -2);
    this.contentChange.emit(value);
    this.showLinkTrigger.set(false);
    this.linkInsertRequested.emit(page);
  }

  cancelLinkTrigger(): void {
    this.showLinkTrigger.set(false);
  }

  // ─── Bloque de archivo (RF-DOC-11) ──────────────────────────────────────

  readonly uploading = signal(false);
  readonly downloading = signal(false);
  readonly fileError = signal('');

  get fileMeta(): FileMeta | null {
    const m = this.block.metadata;
    if (!m?.['attachmentId']) return null;
    return {
      attachmentId: m['attachmentId'] as string,
      fileName: m['fileName'] as string,
      fileSizeBytes: m['fileSizeBytes'] as number,
    };
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      this.fileError.set(`Tipo de archivo no permitido. Se aceptan: ${ALLOWED_FILE_EXTENSIONS.join(', ')}.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.fileError.set('El archivo supera el límite de 25MB.');
      return;
    }

    this.fileError.set('');
    this.uploading.set(true);
    this.content.uploadAttachment(this.block.id, file).subscribe({
      next: () => this.uploading.set(false),
      error: (err: { error?: { error?: string } }) => {
        this.uploading.set(false);
        this.fileError.set(err?.error?.error ?? 'No se pudo subir el archivo.');
      },
    });
  }

  removeAttachment(): void {
    const meta = this.fileMeta;
    if (!meta) return;
    this.content.deleteAttachment(this.block.id, meta.attachmentId).subscribe({
      error: () => this.fileError.set('No se pudo eliminar el archivo.'),
    });
  }

  downloadAttachment(): void {
    const meta = this.fileMeta;
    if (!meta) return;
    this.downloading.set(true);
    this.content.downloadAttachment(meta.attachmentId).subscribe({
      next: blob => {
        this.downloading.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = meta.fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading.set(false);
        this.fileError.set('No se pudo descargar el archivo.');
      },
    });
  }

  // ─── Bloque de texto: Enter divide, Backspace-al-inicio fusiona ────────

  onInput(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    this.contentChange.emit(ta.value);
    this.autoResize(ta);
    if (this.block.type === 'text' && ta.value.endsWith('[[')) {
      this.showLinkTrigger.set(true);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showLinkTrigger()) {
      event.preventDefault();
      this.cancelLinkTrigger();
      return;
    }
    const ta = event.target as HTMLTextAreaElement;
    if (event.key === 'Enter') {
      event.preventDefault();
      const pos = ta.selectionStart;
      this.splitRequested.emit({ before: ta.value.slice(0, pos), after: ta.value.slice(pos) });
    } else if (event.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0) {
      event.preventDefault();
      this.mergeRequested.emit();
    }
  }

  // ─── Bloque de código: Enter inserta salto de línea real, solo ───────
  // Backspace-al-inicio fusiona (RF-DOC-10)

  onCodeKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Backspace') return;
    const ta = event.target as HTMLTextAreaElement;
    if (ta.selectionStart === 0 && ta.selectionEnd === 0) {
      event.preventDefault();
      this.mergeRequested.emit();
    }
  }

  onLanguageChange(event: Event): void {
    this.languageChange.emit((event.target as HTMLSelectElement).value);
  }

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.block.content);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      /* Clipboard API unavailable (e.g. insecure context) — nothing to fall back to. */
    }
  }

  /** Called by DocBlockListComponent after insert/merge to restore focus. */
  focusAt(offset?: number): void {
    const el = this.textRef?.nativeElement;
    if (!el) return;
    this.autoResize(el);
    el.focus();
    const pos = offset ?? el.value.length;
    el.setSelectionRange(pos, pos);
  }

  private autoResize(ta: HTMLTextAreaElement): void {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }
}
