import {
  Component, inject, computed, ElementRef, ViewChildren, ViewChild,
  QueryList, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentationService, DocBlock } from '../../shared/documentation.service';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documentation.html',
  styleUrls: ['./documentation.css'],
})
export class DocumentationComponent implements AfterViewChecked {
  docService = inject(DocumentationService);
  private pendingFocusId: string | null = null;
  private pendingFocusEnd = false;

  @ViewChildren('blockRef') blockRefs!: QueryList<ElementRef<HTMLTextAreaElement>>;
  @ViewChild('titleRef') titleRef!: ElementRef<HTMLTextAreaElement>;

  page = computed(() => this.docService.getPage(this.docService.selectedDoc()));

  // dragOverIdx is a gap position: 0 = before block 0, N = before block N, blocks.length = after last
  draggingIdx: number | null = null;
  dragOverIdx: number | null = null;

  ngAfterViewChecked(): void {
    if (this.pendingFocusId) {
      const id = this.pendingFocusId;
      const end = this.pendingFocusEnd;
      this.pendingFocusId = null;
      this.pendingFocusEnd = false;
      const ref = this.blockRefs.find(r => r.nativeElement.dataset['blockId'] === id);
      if (ref) {
        ref.nativeElement.focus();
        if (end) {
          const len = ref.nativeElement.value.length;
          ref.nativeElement.setSelectionRange(len, len);
        } else {
          ref.nativeElement.setSelectionRange(0, 0);
        }
      }
    }
  }

  onTitleInput(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    this.docService.updateTitle(this.docService.selectedDoc(), ta.value);
    this.autoResize(ta);
  }

  onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  onBlockInput(event: Event, blockId: string): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.docService.updateBlock(this.docService.selectedDoc(), blockId, val);
    this.autoResize(event.target as HTMLTextAreaElement);
  }

  onBlockKeydown(event: KeyboardEvent, block: DocBlock): void {
    const doc = this.docService.selectedDoc();
    const ta = event.target as HTMLTextAreaElement;

    if (event.key === 'Enter') {
      event.preventDefault();
      const caretPos = ta.selectionStart;
      const before = ta.value.slice(0, caretPos);
      const after = ta.value.slice(caretPos);
      this.docService.updateBlock(doc, block.id, before);
      const newId = this.docService.insertBlockAfter(doc, block.id);
      if (after) this.docService.updateBlock(doc, newId, after);
      this.pendingFocusId = newId;
      this.pendingFocusEnd = false;
    } else if (event.key === 'Backspace' && ta.selectionStart === 0 && ta.selectionEnd === 0) {
      const page = this.docService.getPage(doc);
      if (page.blocks.length > 1) {
        event.preventDefault();
        const prevId = this.docService.deleteBlock(doc, block.id);
        if (prevId) {
          this.pendingFocusId = prevId;
          this.pendingFocusEnd = true;
        }
      }
    }
  }

  autoResize(ta: HTMLTextAreaElement): void {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }

  // --- Drag & Drop ---
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
    // Top half → insert before idx, bottom half → insert after idx
    this.dragOverIdx = event.clientY <= rect.top + rect.height / 2 ? idx : idx + 1;
  }

  onDragOverTitle(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverIdx = 0;
  }

  onDragOverEnd(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverIdx = this.page().blocks.length;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.draggingIdx !== null && this.dragOverIdx !== null) {
      const from = this.draggingIdx;
      const gap = this.dragOverIdx;
      // Skip if gap is the block's current position or immediately after it
      if (gap !== from && gap !== from + 1) {
        // Adjust for the index shift caused by removing the dragged element
        const actualTo = gap <= from ? gap : gap - 1;
        this.docService.moveBlock(this.docService.selectedDoc(), from, actualTo);
      }
    }
    this.draggingIdx = null;
    this.dragOverIdx = null;
  }

  onDragEnd(): void {
    this.draggingIdx = null;
    this.dragOverIdx = null;
  }

  trackById(_: number, b: DocBlock): string {
    return b.id;
  }
}
