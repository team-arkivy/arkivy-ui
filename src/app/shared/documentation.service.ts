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

export interface DocBlock {
  id: string;
  content: string;
}

export interface DocPage {
  title: string;
  blocks: DocBlock[];
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

  private pages = new Map<string, DocPage>();

  getPage(docName: string): DocPage {
    if (!this.pages.has(docName)) {
      this.pages.set(docName, { title: '', blocks: [{ id: this.newId(), content: '' }] });
    }
    return this.pages.get(docName)!;
  }

  updateTitle(docName: string, title: string): void {
    const page = this.getPage(docName);
    page.title = title;
  }

  updateBlock(docName: string, blockId: string, content: string): void {
    const page = this.getPage(docName);
    const block = page.blocks.find(b => b.id === blockId);
    if (block) block.content = content;
  }

  insertBlockAfter(docName: string, blockId: string): string {
    const page = this.getPage(docName);
    const idx = page.blocks.findIndex(b => b.id === blockId);
    const newBlock: DocBlock = { id: this.newId(), content: '' };
    page.blocks.splice(idx + 1, 0, newBlock);
    return newBlock.id;
  }

  deleteBlock(docName: string, blockId: string): string | null {
    const page = this.getPage(docName);
    if (page.blocks.length <= 1) return null;
    const idx = page.blocks.findIndex(b => b.id === blockId);
    page.blocks.splice(idx, 1);
    return page.blocks[Math.max(0, idx - 1)].id;
  }

  moveBlock(docName: string, fromIdx: number, toIdx: number): void {
    const page = this.getPage(docName);
    const [block] = page.blocks.splice(fromIdx, 1);
    page.blocks.splice(toIdx, 0, block);
  }

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

  private newId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
