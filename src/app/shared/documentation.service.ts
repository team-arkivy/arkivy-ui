import { Injectable, signal, WritableSignal, Signal } from '@angular/core';

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

  private readonly _pages = new Map<string, WritableSignal<DocPage>>();

  private pageSignal(docName: string): WritableSignal<DocPage> {
    if (!this._pages.has(docName)) {
      this._pages.set(docName, signal({ title: '', blocks: [{ id: this.newId(), content: '' }] }));
    }
    return this._pages.get(docName)!;
  }

  getPage(docName: string): DocPage {
    return this.pageSignal(docName)();
  }

  getPageSignal(docName: string): Signal<DocPage> {
    return this.pageSignal(docName).asReadonly();
  }

  updateTitle(docName: string, title: string): void {
    this.pageSignal(docName).update(p => ({ ...p, title }));
  }

  updateBlock(docName: string, blockId: string, content: string): void {
    // Mutate in-place to avoid signal re-render during typing (preserves cursor position)
    const page = this.pageSignal(docName)();
    const block = page.blocks.find(b => b.id === blockId);
    if (block) block.content = content;
  }

  insertBlockAfter(docName: string, blockId: string): string {
    const newBlock: DocBlock = { id: this.newId(), content: '' };
    this.pageSignal(docName).update(p => {
      const idx = p.blocks.findIndex(b => b.id === blockId);
      const blocks = [...p.blocks];
      blocks.splice(idx + 1, 0, newBlock);
      return { ...p, blocks };
    });
    return newBlock.id;
  }

  deleteBlock(docName: string, blockId: string): string | null {
    const page = this.pageSignal(docName)();
    if (page.blocks.length <= 1) return null;
    const idx = page.blocks.findIndex(b => b.id === blockId);
    const prevId = page.blocks[Math.max(0, idx - 1)].id;
    this.pageSignal(docName).update(p => ({
      ...p,
      blocks: p.blocks.filter(b => b.id !== blockId),
    }));
    return prevId;
  }

  moveBlock(docName: string, fromIdx: number, toIdx: number): void {
    this.pageSignal(docName).update(p => {
      const blocks = [...p.blocks];
      const [block] = blocks.splice(fromIdx, 1);
      blocks.splice(toIdx, 0, block);
      return { ...p, blocks };
    });
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
