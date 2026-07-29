import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentService } from '../../../shared/content.service';
import { Page } from '../../../shared/api.service';

/**
 * Debounced search-and-pick popover for a link block's target page.
 *
 * State is signal-based rather than plain properties on purpose: HttpClient
 * responses under provideHttpClient(withFetch()) can resolve outside
 * Angular's zone, so a plain `results: Page[] = []` mutated inside
 * `.subscribe()` updates correctly in memory but never triggers a
 * re-render. Signals refresh through Angular's own scheduler regardless of
 * zone context, which is why ContentService uses them everywhere else.
 */
@Component({
  selector: 'app-doc-link-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-link-picker.html',
  styleUrls: ['./doc-link-picker.css'],
})
export class DocLinkPickerComponent {
  @Output() picked = new EventEmitter<Page>();

  private content = inject(ContentService);

  readonly query = signal('');
  readonly results = signal<Page[]>([]);
  readonly searching = signal(false);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  onQueryChange(value: string): void {
    this.query.set(value);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const q = value.trim();
    if (!q) {
      this.results.set([]);
      return;
    }
    this.debounceTimer = setTimeout(() => this.runSearch(q), 300);
  }

  private runSearch(query: string): void {
    this.searching.set(true);
    this.content.searchPages(query).subscribe({
      next: results => {
        this.results.set(results);
        this.searching.set(false);
      },
      error: () => {
        this.results.set([]);
        this.searching.set(false);
      },
    });
  }

  select(page: Page): void {
    this.picked.emit(page);
  }
}
