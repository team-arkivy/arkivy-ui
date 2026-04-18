import { Injectable, signal } from '@angular/core';

export interface TocSection {
  category: string;
  items: string[];
  action: string;
}

export interface DocSpace {
  id: string;
  name: string;
  tableOfContents: TocSection[];
}

@Injectable({ providedIn: 'root' })
export class DocumentationService {
  readonly spaces: DocSpace[] = [
    {
      id: 'elegant-man-doc-space',
      name: 'Elegant man doc space',
      tableOfContents: [
        { category: 'Tutorials', items: ['Tutorial_number_one', 'Tutorial_number_two'], action: 'Create a new tutorial' },
        { category: 'How to guide', items: ['How_to_guide_one', 'How_to_guide_two'], action: 'Create a new how to guide' },
        { category: 'Reference', items: ['Reference_one', 'Reference_two'], action: 'Create a new reference' },
        { category: 'Explanation', items: ['Explanation_one', 'Explanation_two'], action: 'Create a new explanation' },
        { category: 'Multiple', items: ['Multiple_one', 'Multiple_two'], action: 'Create a new multiple' },
      ],
    },
  ];

  selectedSpaceId = signal<string>(this.spaces[0].id);
  selectedDoc = signal<string>('Tutorial_number_one');
  tocOpen = signal<boolean>(true);

  toggleToc(): void {
    this.tocOpen.update(v => !v);
  }

  get selectedSpace(): DocSpace {
    return this.spaces.find(s => s.id === this.selectedSpaceId()) ?? this.spaces[0];
  }

  selectSpace(id: string): void {
    this.selectedSpaceId.set(id);
    const space = this.spaces.find(s => s.id === id);
    if (space?.tableOfContents[0]?.items[0]) {
      this.selectedDoc.set(space.tableOfContents[0].items[0]);
    }
  }

  selectDoc(name: string): void {
    this.selectedDoc.set(name);
  }
}
