import { AfterViewChecked, Component, Input, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocBlockComponent } from '../doc-block/doc-block';
import { IconComponent } from '../../../shared/icon/icon.component';
import { Block, BlockType, Page } from '../../../shared/api.service';
import { ContentService } from '../../../shared/content.service';

/** Owns the block array: drag reorder, Enter/Backspace split-merge, focus restoration. */
@Component({
  selector: 'app-doc-block-list',
  standalone: true,
  imports: [CommonModule, DocBlockComponent, IconComponent],
  templateUrl: './doc-block-list.html',
  styleUrls: ['./doc-block-list.css'],
})
export class DocBlockListComponent implements AfterViewChecked {
  @Input({ required: true }) blocks: Block[] = [];

  private content = inject(ContentService);

  @ViewChildren('blockCmp') private blockCmps!: QueryList<DocBlockComponent>;
  private pendingFocus: { blockId: string; caretOffset?: number } | null = null;

  draggingIdx: number | null = null;
  dragOverIdx: number | null = null;

  showAddMenu = false;

  toggleAddMenu(): void {
    this.showAddMenu = !this.showAddMenu;
  }

  addBlock(type: BlockType): void {
    this.showAddMenu = false;
    const lastId = this.blocks.length > 0 ? this.blocks[this.blocks.length - 1].id : null;
    const newId = this.content.insertBlockAfter(lastId, type);
    if (type === 'text' || type === 'code') {
      this.pendingFocus = { blockId: newId };
    }
  }

  ngAfterViewChecked(): void {
    if (!this.pendingFocus) return;
    const { blockId, caretOffset } = this.pendingFocus;
    this.pendingFocus = null;
    this.blockCmps.find(c => c.block.id === blockId)?.focusAt(caretOffset);
  }

  onContentChange(block: Block, value: string): void {
    this.content.updateBlockContent(block.id, value);
  }

  onLanguageChange(block: Block, language: string): void {
    this.content.updateBlockLanguage(block.id, language);
  }

  onSplitRequested(block: Block, event: { before: string; after: string }): void {
    this.content.updateBlockContent(block.id, event.before);
    const newId = this.content.insertBlockAfter(block.id, 'text');
    if (event.after) this.content.updateBlockContent(newId, event.after);
    this.pendingFocus = { blockId: newId, caretOffset: 0 };
  }

  onMergeRequested(block: Block, index: number): void {
    if (index === 0) return;
    const result = this.content.mergeBlockIntoPrevious(block.id);
    if (result) this.pendingFocus = { blockId: result.focusId, caretOffset: result.caretOffset };
  }

  /** RF-NODE-01: escribir [[ en un bloque de texto inserta un bloque `link` nuevo justo después, ya apuntando a la página elegida. */
  onLinkInsertRequested(block: Block, page: Page): void {
    const newId = this.content.insertBlockAfter(block.id, 'link');
    this.content.setLinkTarget(newId, page);
  }

  // ─── Drag & Drop ────────────────────────────────────────────────────────

  onDragStart(event: DragEvent, idx: number): void {
    this.draggingIdx = idx;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(idx));
    }
  }

  onDragOver(event: DragEvent, idx: number): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.dragOverIdx = event.clientY <= rect.top + rect.height / 2 ? idx : idx + 1;
  }

  onDragOverEnd(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverIdx = this.blocks.length;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.draggingIdx !== null && this.dragOverIdx !== null) {
      const from = this.draggingIdx;
      const gap = this.dragOverIdx;
      if (gap !== from && gap !== from + 1) {
        const actualTo = gap <= from ? gap : gap - 1;
        this.content.moveBlock(from, actualTo);
      }
    }
    this.draggingIdx = null;
    this.dragOverIdx = null;
  }

  onDragEnd(): void {
    this.draggingIdx = null;
    this.dragOverIdx = null;
  }
}
