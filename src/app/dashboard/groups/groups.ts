import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon.component';

interface DocPermission {
  name: string;
  role: string;
}

interface DocCategory {
  name: string;
  role: string;
  documents: DocPermission[];
}

interface Group {
  id: string;
  name: string;
  memberCount: number;
  access: DocCategory[];
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
  activeTab: 'access' | 'users' = 'access';
  roles = ['Viewer', 'Editor', 'Admin'];

  groups: Group[] = [
    {
      id: '0', name: 'Example group name 0', memberCount: 0,
      access: [
        { name: 'Tutorial',    role: 'Editor', documents: [{ name: 'Tutorial_number_one',    role: 'Editor' }] },
        { name: 'How to guide',role: 'Editor', documents: [{ name: 'How_to_guide_number_one',role: 'Editor' }] },
        { name: 'Reference',   role: 'Editor', documents: [{ name: 'Reference_number_one',   role: 'Editor' }] },
        { name: 'Explanation', role: 'Editor', documents: [{ name: 'Explanation_number_one', role: 'Editor' }] },
        { name: 'Multiple',    role: 'Editor', documents: [{ name: 'Multiple_number_one',    role: 'Editor' }] },
      ],
    },
    {
      id: '1', name: 'Example_group_name_1', memberCount: 3,
      access: [
        { name: 'Tutorial',  role: 'Viewer', documents: [{ name: 'Tutorial_number_one',  role: 'Viewer' }] },
        { name: 'Reference', role: 'Viewer', documents: [{ name: 'Reference_number_one', role: 'Viewer' }] },
      ],
    },
    {
      id: '2', name: 'Example_group_name_2', memberCount: 5,
      access: [
        { name: 'How to guide', role: 'Editor', documents: [{ name: 'How_to_guide_number_one', role: 'Editor' }] },
      ],
    },
    {
      id: '3', name: 'Example_group_name_3', memberCount: 2,
      access: [
        { name: 'Explanation', role: 'Admin', documents: [{ name: 'Explanation_number_one', role: 'Admin' }] },
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

  selectGroup(group: Group): void {
    this.selectedGroupId = group.id;
    this.activeTab = 'access';
  }

  setTab(tab: 'access' | 'users'): void {
    this.activeTab = tab;
  }
}
