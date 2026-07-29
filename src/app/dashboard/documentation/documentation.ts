import {
  AfterViewChecked, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, inject, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentService } from '../../shared/content.service';
import { AuthService } from '../../shared/auth.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { PAGE_STATUS_CLASS, PAGE_STATUS_LABEL } from '../../shared/page-status';
import { DocBlockListComponent } from './doc-block-list/doc-block-list';
import { DocVersionHistoryComponent } from './doc-version-history/doc-version-history';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, DocBlockListComponent, DocVersionHistoryComponent],
  templateUrl: './documentation.html',
  styleUrls: ['./documentation.css'],
})
export class DocumentationComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() pageId?: string;
  content = inject(ContentService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('titleRef') private titleRef?: ElementRef<HTMLTextAreaElement>;

  readonly statusLabel = PAGE_STATUS_LABEL;
  readonly statusClass = PAGE_STATUS_CLASS;

  /** Signals, not plain properties: written from .subscribe() callbacks in a zoneless app — see ContentService's doc comment. */
  readonly titleError = signal('');
  readonly flowError = signal('');
  readonly flowBusy = signal(false);

  // Toggled only from template-bound clicks — plain properties are fine here.
  showReviewerPicker = false;
  selectedReviewerId = '';
  showRejectForm = false;
  rejectComment = '';
  showHistory = false;

  ngOnChanges(): void {
    if (this.pageId) {
      this.content.selectPage(this.pageId);
      this.showReviewerPicker = false;
      this.showRejectForm = false;
      this.showHistory = false;
      this.flowError.set('');
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

  // ═══════════════════════════════════════════════════════════════════════
  // FLUJO DE REVISIÓN (RF-FLOW)
  // ═══════════════════════════════════════════════════════════════════════

  private get currentUserId(): string | undefined {
    return this.authService.getUserInfo()?.userId;
  }

  get isPlatformAdmin(): boolean {
    return !!this.authService.getUserInfo()?.isPlatformAdmin;
  }

  get isAuthor(): boolean {
    return this.content.currentPage()?.authorId === this.currentUserId;
  }

  get isReviewer(): boolean {
    const page = this.content.currentPage();
    return !!page?.reviewerId && page.reviewerId === this.currentUserId;
  }

  get canSubmitForReview(): boolean {
    return this.content.currentPage()?.status === 'draft' && (this.isAuthor || this.isPlatformAdmin);
  }

  get canReview(): boolean {
    return this.content.currentPage()?.status === 'in_review' && (this.isReviewer || this.isPlatformAdmin);
  }

  openReviewerPicker(): void {
    this.selectedReviewerId = '';
    this.flowError.set('');
    this.showReviewerPicker = true;
    this.content.loadSpaceEditors();
  }

  cancelReviewerPicker(): void {
    this.showReviewerPicker = false;
  }

  confirmSubmitForReview(): void {
    if (!this.selectedReviewerId) return;
    this.flowBusy.set(true);
    this.content.submitForReview(this.selectedReviewerId).subscribe({
      next: () => {
        this.flowBusy.set(false);
        this.showReviewerPicker = false;
      },
      error: () => {
        this.flowBusy.set(false);
        this.flowError.set('No se pudo enviar la página a revisión.');
      },
    });
  }

  approve(): void {
    this.flowBusy.set(true);
    this.flowError.set('');
    this.content.approvePage().subscribe({
      next: () => this.flowBusy.set(false),
      error: () => {
        this.flowBusy.set(false);
        this.flowError.set('No se pudo aprobar la página.');
      },
    });
  }

  openRejectForm(): void {
    this.rejectComment = '';
    this.flowError.set('');
    this.showRejectForm = true;
  }

  cancelRejectForm(): void {
    this.showRejectForm = false;
  }

  confirmReject(): void {
    const comment = this.rejectComment.trim();
    if (!comment) return;
    this.flowBusy.set(true);
    this.content.rejectPage(comment).subscribe({
      next: () => {
        this.flowBusy.set(false);
        this.showRejectForm = false;
      },
      error: () => {
        this.flowBusy.set(false);
        this.flowError.set('No se pudo rechazar la página.');
      },
    });
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory) this.content.loadVersions();
  }

  openBacklink(pageId: string): void {
    void this.router.navigate(['/dashboard/documentation', pageId]);
  }
}
