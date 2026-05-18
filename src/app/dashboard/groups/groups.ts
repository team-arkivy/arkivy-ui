import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon.component';

interface GroupFile {
  name: string;
  space: string;
  access: 'Lectura' | 'Edición';
}

interface AvailableFile {
  name: string;
  space: string;
  selected: boolean;
}

interface AvailableSpace {
  name: string;
  selected: boolean;
}

interface Group {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  files: GroupFile[];
}

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './groups.html',
  styleUrls: ['./groups.css'],
})
export class GroupsComponent {
  searchQuery = '';
  activeTab: 'files' | 'users' = 'files';

  showAddFileModal = false;
  showAddSpaceModal = false;
  fileModalSearch = '';
  spaceModalSearch = '';

  availableFiles: AvailableFile[] = [
    { name: 'Archivo_1',              space: 'espacio_1',   selected: false },
    { name: 'Archivo_2',              space: 'espacio_1',   selected: false },
    { name: 'Tutorial_number_one',    space: 'Tutorial',    selected: false },
    { name: 'How_to_guide_one',       space: 'How to guide',selected: false },
    { name: 'Reference_number_one',   space: 'Reference',   selected: false },
    { name: 'Explanation_number_one', space: 'Explanation', selected: false },
  ];

  availableSpaces: AvailableSpace[] = [
    { name: 'espacio_1',   selected: false },
    { name: 'Tutorial',    selected: false },
    { name: 'How to guide',selected: false },
    { name: 'Reference',   selected: false },
    { name: 'Explanation', selected: false },
  ];

  groups: Group[] = [
    {
      id: '0', name: 'Reader group', createdAt: '12/10/2025', memberCount: 0,
      files: [
        { name: 'Explanation_number_one', space: 'Explanation', access: 'Lectura' },
        { name: 'How_to_guide_one',       space: 'How to guide',access: 'Edición' },
      ],
    },
    {
      id: '1', name: 'Example_group_name_1', createdAt: '01/15/2025', memberCount: 3,
      files: [
        { name: 'Tutorial_number_one', space: 'Tutorial', access: 'Lectura' },
      ],
    },
    {
      id: '2', name: 'Example_group_name_2', createdAt: '03/20/2025', memberCount: 5,
      files: [
        { name: 'How_to_guide_one', space: 'How to guide', access: 'Edición' },
      ],
    },
    {
      id: '3', name: 'Example_group_name_3', createdAt: '06/05/2025', memberCount: 2,
      files: [
        { name: 'Explanation_number_one', space: 'Explanation', access: 'Lectura' },
      ],
    },
  ];

  selectedGroupId = '0';

  get filteredGroups(): Group[] {
    if (!this.searchQuery.trim()) return this.groups;
    return this.groups.filter((g) =>
      g.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
    );
  }

  get selectedGroup(): Group | undefined {
    return this.groups.find((g) => g.id === this.selectedGroupId);
  }

  get filteredAvailableFiles(): AvailableFile[] {
    if (!this.fileModalSearch.trim()) return this.availableFiles;
    const q = this.fileModalSearch.toLowerCase();
    return this.availableFiles.filter(f =>
      f.name.toLowerCase().includes(q) || f.space.toLowerCase().includes(q),
    );
  }

  get filteredAvailableSpaces(): AvailableSpace[] {
    if (!this.spaceModalSearch.trim()) return this.availableSpaces;
    const q = this.spaceModalSearch.toLowerCase();
    return this.availableSpaces.filter(s => s.name.toLowerCase().includes(q));
  }

  selectGroup(group: Group): void {
    this.selectedGroupId = group.id;
    this.activeTab = 'files';
  }

  setTab(tab: 'files' | 'users'): void {
    this.activeTab = tab;
  }

  openAddFileModal(): void {
    this.availableFiles.forEach(f => (f.selected = false));
    this.fileModalSearch = '';
    this.showAddFileModal = true;
  }

  closeAddFileModal(): void {
    this.showAddFileModal = false;
  }

  addSelectedFiles(): void {
    const group = this.selectedGroup;
    if (!group) return;
    for (const file of this.availableFiles.filter(f => f.selected)) {
      if (!group.files.find(f => f.name === file.name)) {
        group.files.push({ name: file.name, space: file.space, access: 'Lectura' });
      }
    }
    this.showAddFileModal = false;
  }

  openAddSpaceModal(): void {
    this.availableSpaces.forEach(s => (s.selected = false));
    this.spaceModalSearch = '';
    this.showAddSpaceModal = true;
  }

  closeAddSpaceModal(): void {
    this.showAddSpaceModal = false;
  }

  addSelectedSpaces(): void {
    const group = this.selectedGroup;
    if (!group) return;
    for (const space of this.availableSpaces.filter(s => s.selected)) {
      for (const file of this.availableFiles.filter(f => f.space === space.name)) {
        if (!group.files.find(f => f.name === file.name)) {
          group.files.push({ name: file.name, space: file.space, access: 'Lectura' });
        }
      }
    }
    this.showAddSpaceModal = false;
  }
}
