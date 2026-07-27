import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog';
import { DocSearchComponent } from '../doc-search/doc-search';
import { ContentService } from '../../../shared/content.service';
import { AuthService } from '../../../shared/auth.service';
import { Page, PageCategory, Space } from '../../../shared/api.service';

const CATEGORY_LABELS: Record<PageCategory, string> = {
  tutorial: 'Tutorial',
  how_to: 'Cómo hacer',
  reference: 'Referencia',
  explanation: 'Explicación',
  multiple: 'Múltiple',
};

@Component({
  selector: 'app-doc-toc',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ConfirmDialogComponent, DocSearchComponent],
  templateUrl: './doc-toc.html',
  styleUrls: ['./doc-toc.css'],
})
export class DocTocComponent implements OnInit {
  content = inject(ContentService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals (not plain properties) because they're written from inside
  // .subscribe() error callbacks — this app is zoneless, so a plain property
  // written there with no accompanying ContentService signal write (as
  // happens on the success path) never triggers a re-render. Everything
  // else below is only ever written from template-bound DOM events (click,
  // dragstart...), which Angular's zoneless CD does pick up, so plain
  // properties are fine there.
  readonly busy = signal(false);
  readonly actionError = signal('');

  // ─── Edición inline del nombre del espacio ─────────────────────────────
  editingSpaceId: string | null = null;
  editValue = '';

  // ─── Crear espacio ──────────────────────────────────────────────────────
  showCreateSpace = false;
  newSpaceName = '';

  // ─── Crear página ───────────────────────────────────────────────────────
  creatingPageCategory: PageCategory | null = null;
  newPageTitle = '';

  // ─── Confirmaciones de borrado ──────────────────────────────────────────
  confirmDeleteSpace: Space | null = null;
  confirmDeletePage: Page | null = null;

  // ─── Reordenar páginas (drag & drop, solo dentro de la misma categoría) ─
  draggingPageId: string | null = null;
  draggingCategory: PageCategory | null = null;
  dragOverIndex: number | null = null;

  ngOnInit(): void {
    if (this.content.spaces().length === 0) {
      this.content.loadSpaces();
    }
  }

  get isPlatformAdmin(): boolean {
    return !!this.authService.getUserInfo()?.isPlatformAdmin;
  }

  categoryLabel(category: PageCategory): string {
    return CATEGORY_LABELS[category];
  }

  openPage(pageId: string): void {
    void this.router.navigate(['/dashboard/documentation', pageId]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ESPACIOS
  // ═══════════════════════════════════════════════════════════════════════

  startEditSpace(space: Space, event: Event): void {
    event.stopPropagation();
    this.editingSpaceId = space.id;
    this.editValue = space.name;
    this.focusInlineInput('.toc-space-edit-input');
  }

  saveSpaceName(space: Space): void {
    const name = this.editValue.trim();
    this.editingSpaceId = null;
    if (!name || name === space.name) return;
    this.busy.set(true);
    this.content.renameSpace(space.id, name).subscribe({
      next: () => this.busy.set(false),
      error: () => {
        this.busy.set(false);
        this.actionError.set('No se pudo renombrar el espacio.');
      },
    });
  }

  cancelEditSpace(): void {
    this.editingSpaceId = null;
  }

  openCreateSpace(): void {
    this.newSpaceName = '';
    this.showCreateSpace = true;
    this.focusInlineInput('.toc-inline-form:not(.toc-inline-form--page) .toc-inline-input');
  }

  cancelCreateSpace(): void {
    this.showCreateSpace = false;
  }

  confirmCreateSpace(): void {
    const name = this.newSpaceName.trim();
    if (!name) return;
    this.busy.set(true);
    this.content.createSpace(name).subscribe({
      next: () => {
        this.busy.set(false);
        this.showCreateSpace = false;
      },
      error: () => {
        this.busy.set(false);
        this.actionError.set('No se pudo crear el espacio.');
      },
    });
  }

  requestDeleteSpace(space: Space, event: Event): void {
    event.stopPropagation();
    this.confirmDeleteSpace = space;
  }

  cancelDeleteSpace(): void {
    this.confirmDeleteSpace = null;
  }

  confirmDeleteSpaceNow(): void {
    const space = this.confirmDeleteSpace;
    if (!space) return;
    this.confirmDeleteSpace = null;
    this.busy.set(true);
    this.content.deleteSpace(space.id).subscribe({
      next: () => this.busy.set(false),
      error: () => {
        this.busy.set(false);
        this.actionError.set('No se pudo eliminar el espacio.');
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÁGINAS
  // ═══════════════════════════════════════════════════════════════════════

  openCreatePage(category: PageCategory): void {
    this.newPageTitle = '';
    this.creatingPageCategory = category;
    this.focusInlineInput('.toc-inline-form--page .toc-inline-input');
  }

  cancelCreatePage(): void {
    this.creatingPageCategory = null;
  }

  confirmCreatePage(): void {
    const category = this.creatingPageCategory;
    if (!category) return;
    const title = this.newPageTitle.trim() || 'Nueva página';
    this.creatingPageCategory = null;
    this.busy.set(true);
    this.content.createPage(category, title).subscribe({
      next: page => {
        this.busy.set(false);
        this.openPage(page.id);
      },
      error: () => {
        this.busy.set(false);
        this.actionError.set('No se pudo crear la página.');
      },
    });
  }

  requestDeletePage(page: Page, event: Event): void {
    event.stopPropagation();
    this.confirmDeletePage = page;
  }

  cancelDeletePage(): void {
    this.confirmDeletePage = null;
  }

  confirmDeletePageNow(): void {
    const page = this.confirmDeletePage;
    if (!page) return;
    this.confirmDeletePage = null;
    this.busy.set(true);
    const wasOpen = this.content.currentPage()?.id === page.id;
    this.content.deletePage(page.id).subscribe({
      next: () => {
        this.busy.set(false);
        if (wasOpen) void this.router.navigate(['/dashboard/documentation']);
      },
      error: () => {
        this.busy.set(false);
        this.actionError.set('No se pudo eliminar la página.');
      },
    });
  }

  // ─── Drag & Drop de páginas (dentro de la misma categoría) ─────────────

  onPageDragStart(event: DragEvent, page: Page, category: PageCategory): void {
    this.draggingPageId = page.id;
    this.draggingCategory = category;
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onPageDragOver(event: DragEvent, category: PageCategory, idx: number): void {
    if (category !== this.draggingCategory) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.dragOverIndex = event.clientY <= rect.top + rect.height / 2 ? idx : idx + 1;
  }

  onPageDrop(event: DragEvent, category: PageCategory, pages: Page[]): void {
    event.preventDefault();
    const draggingId = this.draggingPageId;
    const gap = this.dragOverIndex;
    if (category === this.draggingCategory && draggingId && gap !== null) {
      const fromIdx = pages.findIndex(p => p.id === draggingId);
      if (fromIdx !== -1 && gap !== fromIdx && gap !== fromIdx + 1) {
        const actualTo = gap <= fromIdx ? gap : gap - 1;
        this.content.reorderPage(draggingId, actualTo).subscribe({
          error: () => this.actionError.set('No se pudo reordenar la página.'),
        });
      }
    }
    this.resetPageDrag();
  }

  onPageDragEnd(): void {
    this.resetPageDrag();
  }

  private resetPageDrag(): void {
    this.draggingPageId = null;
    this.draggingCategory = null;
    this.dragOverIndex = null;
  }

  /** Angular hasn't rendered the just-shown input yet when this is called — defer to the next microtask. */
  private focusInlineInput(selector: string): void {
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(selector);
      input?.focus();
      input?.select();
    });
  }
}
