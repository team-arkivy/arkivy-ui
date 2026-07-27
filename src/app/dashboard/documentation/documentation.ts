import {
  AfterViewChecked, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../shared/content.service';
import { DocBlockListComponent } from './doc-block-list/doc-block-list';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, DocBlockListComponent],
  templateUrl: './documentation.html',
  styleUrls: ['./documentation.css'],
})
export class DocumentationComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() pageId?: string;
  content = inject(ContentService);

  @ViewChild('titleRef') private titleRef?: ElementRef<HTMLTextAreaElement>;

  /** Signal, not a plain property: written from a .subscribe() error callback in a zoneless app — see ContentService's doc comment. */
  readonly titleError = signal('');

  ngOnChanges(): void {
    if (this.pageId) {
      this.content.selectPage(this.pageId);
    }
  }

  ngAfterViewChecked(): void {
    const el = this.titleRef?.nativeElement;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }

  ngOnDestroy(): void {
    this.content.flushPendingSave();
  }

  onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).blur();
    }
  }

  onTitleBlur(event: Event): void {
    const pageId = this.content.currentPage()?.id;
    if (!pageId) return;
    const title = (event.target as HTMLTextAreaElement).value.trim();
    if (!title || title === this.content.currentPage()?.title) return;
    this.titleError.set('');
    this.content.renamePage(pageId, title).subscribe({
      error: () => this.titleError.set('No se pudo renombrar la página.'),
    });
  }
}
