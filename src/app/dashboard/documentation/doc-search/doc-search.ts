import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ContentService } from '../../../shared/content.service';
import { Page } from '../../../shared/api.service';

/** Org-wide page search (RF-DOC-07) — title or block content. Signal-based state, see ContentService's doc comment on why. */
@Component({
  selector: 'app-doc-search',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './doc-search.html',
  styleUrls: ['./doc-search.css'],
})
export class DocSearchComponent {
  private content = inject(ContentService);
  private router = inject(Router);

  readonly open = signal(false);
  readonly query = signal('');
  readonly results = signal<Page[]>([]);
  readonly searching = signal(false);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  toggleOpen(): void {
    this.open.update(v => !v);
    if (!this.open()) this.reset();
  }

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

  openResult(page: Page): void {
    void this.router.navigate(['/dashboard/documentation', page.id]);
    this.open.set(false);
    this.reset();
  }

  private reset(): void {
    this.query.set('');
    this.results.set([]);
  }
}
