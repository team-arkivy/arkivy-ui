import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../../../shared/content.service';

@Component({
  selector: 'app-doc-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doc-breadcrumb.html',
  styleUrls: ['./doc-breadcrumb.css'],
})
export class DocBreadcrumbComponent {
  content = inject(ContentService);
}
