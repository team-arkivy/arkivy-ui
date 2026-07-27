import { Injectable, computed, signal } from '@angular/core';
import { EMPTY, Observable, Subject, switchMap, tap, throwError } from 'rxjs';
import { ApiService, Attachment, Block, Page, PageCategory, Space, TocCategory } from './api.service';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Single source of truth for the Documentation feature — Spaces, TOC,
 * current Page/Blocks. Wraps ApiService; mutations patch the relevant
 * signal from the server's own response instead of reloading everything
 * (see [[arkivy-roadmap]] memory for why that was flagged as a problem in
 * the Groups rewrite).
 *
 * All async-updated state here MUST be a signal, not a plain property: this
 * app has no zone.js (see app.config.ts/main.ts — it's zoneless), so a
 * plain property mutated inside a `.subscribe()` callback that touches no
 * signal never triggers a re-render. Signals refresh through Angular's own
 * scheduler independent of zone, which is the only reason this pattern
 * works at all here.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  constructor(private api: ApiService) {
    // switchMap cancels any in-flight PUT .../blocks when a newer save is
    // triggered — without this, two overlapping saves (e.g. a debounced
    // typing save still in flight when an attachment upload fires an
    // immediate save) can resolve out of order and let the STALE request's
    // response overwrite the fresher one in the database.
    this.saveTrigger.pipe(
      switchMap(() => {
        const page = this.currentPage();
        if (!page) return EMPTY;
        this.saveStatus.set('saving');
        return this.api.replaceBlocks(page.id, this.currentBlocks());
      }),
    ).subscribe({
      next: () => this.saveStatus.set('saved'),
      error: () => this.saveStatus.set('error'),
    });
  }

  // ─── Spaces ─────────────────────────────────────────────────────────────
  readonly spaces = signal<Space[]>([]);
  readonly spacesLoading = signal(false);
  readonly spacesError = signal<string | null>(null);

  readonly selectedSpaceId = signal<string | null>(null);
  readonly selectedSpace = computed(() =>
    this.spaces().find(s => s.id === this.selectedSpaceId()) ?? null);

  // ─── Table of contents (current space) ─────────────────────────────────
  readonly toc = signal<TocCategory[]>([]);
  readonly tocLoading = signal(false);
  readonly tocError = signal<string | null>(null);
  readonly tocOpen = signal(true);

  // ─── Current page ───────────────────────────────────────────────────────
  readonly currentPage = signal<Page | null>(null);
  readonly currentBlocks = signal<Block[]>([]);
  readonly pageLoading = signal(false);
  readonly pageError = signal<string | null>(null);
  readonly saveStatus = signal<SaveStatus>('idle');

  // ═══════════════════════════════════════════════════════════════════════
  // CARGA
  // ═══════════════════════════════════════════════════════════════════════

  loadSpaces(): void {
    this.spacesLoading.set(true);
    this.spacesError.set(null);
    this.api.listSpaces().subscribe({
      next: spaces => {
        this.spaces.set(spaces);
        this.spacesLoading.set(false);
        if (!this.selectedSpaceId() && spaces.length > 0) {
          this.selectSpace(spaces[0].id);
        }
      },
      error: () => {
        this.spacesLoading.set(false);
        this.spacesError.set('No se pudieron cargar los espacios.');
      },
    });
  }

  selectSpace(spaceId: string): void {
    this.selectedSpaceId.set(spaceId);
    this.tocLoading.set(true);
    this.tocError.set(null);
    this.api.listPagesBySpace(spaceId).subscribe({
      next: toc => {
        this.toc.set(this.normalizeToc(toc));
        this.tocLoading.set(false);
      },
      error: () => {
        this.tocLoading.set(false);
        this.tocError.set('No se pudieron cargar las páginas de este espacio.');
      },
    });
  }

  /** Defensa en el límite de la API: una categoría vacía puede llegar como pages: null (slice nil de Go). */
  private normalizeToc(toc: TocCategory[]): TocCategory[] {
    return toc.map(cat => ({ ...cat, pages: cat.pages ?? [] }));
  }

  selectPage(pageId: string): void {
    this.flushPendingSave();
    this.pageLoading.set(true);
    this.pageError.set(null);
    this.api.getPage(pageId).subscribe({
      next: ({ page, blocks }) => {
        this.currentPage.set(page);
        this.currentBlocks.set(blocks ?? []);
        this.pageLoading.set(false);
        this.saveStatus.set('idle');
      },
      error: () => {
        this.pageLoading.set(false);
        this.currentPage.set(null);
        this.currentBlocks.set([]);
        this.pageError.set('No se pudo abrir esta página. Puede que no exista o no tengas acceso.');
      },
    });
  }

  toggleToc(): void {
    this.tocOpen.update(open => !open);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CRUD DE ESPACIOS Y PÁGINAS — cada mutación parcha el signal local con
  // la respuesta del servidor, nunca recarga todo el catálogo.
  // ═══════════════════════════════════════════════════════════════════════

  createSpace(name: string): Observable<Space> {
    return this.api.createSpace(name).pipe(
      tap(space => {
        this.spaces.update(list => [...list, space]);
        this.selectSpace(space.id);
      }),
    );
  }

  renameSpace(spaceId: string, name: string): Observable<{ message: string }> {
    return this.api.renameSpace(spaceId, name).pipe(
      tap(() => {
        this.spaces.update(list => list.map(s => (s.id === spaceId ? { ...s, name } : s)));
      }),
    );
  }

  deleteSpace(spaceId: string): Observable<{ message: string }> {
    return this.api.deleteSpace(spaceId).pipe(
      tap(() => {
        this.spaces.update(list => list.filter(s => s.id !== spaceId));
        if (this.selectedSpaceId() === spaceId) {
          this.selectedSpaceId.set(null);
          this.toc.set([]);
          const [next] = this.spaces();
          if (next) this.selectSpace(next.id);
        }
      }),
    );
  }

  createPage(category: PageCategory, title: string): Observable<Page> {
    const spaceId = this.selectedSpaceId();
    if (!spaceId) return throwError(() => new Error('No hay un espacio seleccionado'));
    return this.api.createPage(spaceId, category, title).pipe(
      tap(page => {
        this.toc.update(categories =>
          categories.map(cat => (cat.category === category ? { ...cat, pages: [...cat.pages, page] } : cat)));
      }),
    );
  }

  renamePage(pageId: string, title: string): Observable<{ message: string }> {
    return this.api.updatePage(pageId, { title }).pipe(
      tap(() => {
        this.patchTocPage(pageId, p => ({ ...p, title }));
        if (this.currentPage()?.id === pageId) {
          this.currentPage.update(p => (p ? { ...p, title } : p));
        }
      }),
    );
  }

  reorderPage(pageId: string, newIndex: number): Observable<{ message: string }> {
    return this.api.reorderPage(pageId, newIndex).pipe(
      tap(() => {
        const spaceId = this.selectedSpaceId();
        if (spaceId) this.api.listPagesBySpace(spaceId).subscribe(toc => this.toc.set(this.normalizeToc(toc)));
      }),
    );
  }

  deletePage(pageId: string): Observable<{ message: string }> {
    return this.api.deletePage(pageId).pipe(
      tap(() => {
        this.toc.update(categories =>
          categories.map(cat => ({ ...cat, pages: cat.pages.filter(p => p.id !== pageId) })));
        if (this.currentPage()?.id === pageId) {
          this.currentPage.set(null);
          this.currentBlocks.set([]);
        }
      }),
    );
  }

  private patchTocPage(pageId: string, updater: (p: Page) => Page): void {
    this.toc.update(categories => categories.map(cat => ({
      ...cat,
      pages: cat.pages.map(p => (p.id === pageId ? updater(p) : p)),
    })));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EDICIÓN DE BLOQUES — autoguardado con debounce
  // ═══════════════════════════════════════════════════════════════════════

  /** Muta el bloque in-place (sin re-crear el arreglo) para no perder el cursor mientras se escribe. */
  updateBlockContent(blockId: string, content: string): void {
    const block = this.currentBlocks().find(b => b.id === blockId);
    if (!block) return;
    block.content = content;
    this.scheduleSave();
  }

  updateBlockLanguage(blockId: string, language: string): void {
    const block = this.currentBlocks().find(b => b.id === blockId);
    if (!block) return;
    block.language = language;
    this.scheduleSave();
  }

  /** Inserta un bloque nuevo después de afterBlockId (o al final si es null) y devuelve su id. */
  insertBlockAfter(afterBlockId: string | null, type: Block['type']): string {
    const newBlock: Block = { id: crypto.randomUUID(), orderIndex: 0, type, content: '' };
    const blocks = [...this.currentBlocks()];
    const idx = afterBlockId ? blocks.findIndex(b => b.id === afterBlockId) : blocks.length - 1;
    blocks.splice(idx + 1, 0, newBlock);
    blocks.forEach((b, i) => (b.orderIndex = i));
    this.currentBlocks.set(blocks);
    this.scheduleSave();
    return newBlock.id;
  }

  /** Elimina un bloque sin fusionar contenido. Devuelve el id del bloque anterior, si existe. */
  deleteBlock(blockId: string): string | null {
    const blocks = this.currentBlocks();
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1 || blocks.length <= 1) return null;
    const prevId = idx > 0 ? blocks[idx - 1].id : null;
    const next = blocks.filter(b => b.id !== blockId);
    next.forEach((b, i) => (b.orderIndex = i));
    this.currentBlocks.set(next);
    this.scheduleSave();
    return prevId;
  }

  /**
   * Backspace al inicio de un bloque: fusiona su contenido con el bloque
   * anterior (si ambos son text/code) y lo elimina. Si el bloque anterior es
   * file/link (nada que fusionar) simplemente lo deja y borra el actual.
   */
  mergeBlockIntoPrevious(blockId: string): { focusId: string; caretOffset: number } | null {
    const blocks = this.currentBlocks();
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx <= 0) return null;
    const current = blocks[idx];
    const prev = blocks[idx - 1];
    const caretOffset = prev.content.length;
    if ((prev.type === 'text' || prev.type === 'code') && current.content) {
      prev.content += current.content;
    }
    const next = blocks.filter(b => b.id !== blockId);
    next.forEach((b, i) => (b.orderIndex = i));
    this.currentBlocks.set(next);
    this.scheduleSave();
    return { focusId: prev.id, caretOffset };
  }

  moveBlock(fromIdx: number, toIdx: number): void {
    const blocks = [...this.currentBlocks()];
    const [moved] = blocks.splice(fromIdx, 1);
    blocks.splice(toIdx, 0, moved);
    blocks.forEach((b, i) => (b.orderIndex = i));
    this.currentBlocks.set(blocks);
    this.scheduleSave();
  }

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly saveTrigger = new Subject<void>();

  private scheduleSave(): void {
    this.saveStatus.set('pending');
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveTrigger.next();
    }, 800);
  }

  /** Cancela el debounce y guarda de inmediato — llamar antes de cambiar de página o al destruir el componente. */
  flushPendingSave(): void {
    if (!this.saveTimer) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.saveTrigger.next();
  }

  /** Guarda ya, haya o no debounce pendiente — usado tras subir/borrar un adjunto (no es una ráfaga de tipeo). */
  private saveImmediately(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveTrigger.next();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADJUNTOS — no existe "listar adjuntos de un bloque"; la metadata del
  // bloque `file` es la única fuente de verdad del lado del cliente.
  // ═══════════════════════════════════════════════════════════════════════

  uploadAttachment(blockId: string, file: File): Observable<Attachment> {
    return this.api.uploadAttachment(blockId, file).pipe(
      tap(attachment => {
        const block = this.currentBlocks().find(b => b.id === blockId);
        if (!block) return;
        block.metadata = {
          attachmentId: attachment.id,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          fileSizeBytes: attachment.fileSizeBytes,
        };
        this.saveImmediately();
      }),
    );
  }

  deleteAttachment(blockId: string, attachmentId: string): Observable<{ message: string }> {
    return this.api.deleteAttachment(attachmentId).pipe(
      tap(() => {
        const block = this.currentBlocks().find(b => b.id === blockId);
        if (!block) return;
        block.metadata = undefined;
        this.saveImmediately();
      }),
    );
  }

  downloadAttachment(attachmentId: string): Observable<Blob> {
    return this.api.downloadAttachment(attachmentId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BLOQUES DE ENLACE — sin backlinks/grafo todavía (Fase 5); el chip guarda
  // una copia del título al momento de vincular, puede quedar desactualizado
  // si la página destino se renombra después.
  // ═══════════════════════════════════════════════════════════════════════

  setLinkTarget(blockId: string, target: Page): void {
    const block = this.currentBlocks().find(b => b.id === blockId);
    if (!block) return;
    block.metadata = {
      targetPageId: target.id,
      targetSpaceId: target.spaceId,
      targetPageTitle: target.title,
    };
    this.saveImmediately();
  }

  clearLinkTarget(blockId: string): void {
    const block = this.currentBlocks().find(b => b.id === blockId);
    if (!block) return;
    block.metadata = undefined;
    this.saveImmediately();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BÚSQUEDA — sin estado propio, cada consumidor (buscador global, selector
  // de enlace) mantiene su propia lista de resultados localmente.
  // ═══════════════════════════════════════════════════════════════════════

  searchPages(query: string): Observable<Page[]> {
    return this.api.search(query);
  }
}
