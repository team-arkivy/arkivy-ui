import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/icon/icon.component';
import { DocumentationService } from '../../shared/documentation.service';

@Component({
  selector: 'app-documentation',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './documentation.html',
  styleUrls: ['./documentation.css'],
})
export class DocumentationComponent {
  docService = inject(DocumentationService);
}
