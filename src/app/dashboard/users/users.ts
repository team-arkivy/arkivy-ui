import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon.component';

interface User {
  id: string;
  name: string;
  email: string;
  group: string;
  status: 'Active' | 'Inactive';
  lastAccess: string;
  initials: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
})
export class UsersComponent {
  filterEmail = '';
  filterGroup = '';
  filterName = '';
  filterUserId = '';

  users: User[] = [
    { id: 'new-user-id-01', name: 'Elegant man number 1', email: 'Elegant_man_number_1@gmail.com', group: 'Group_number_01', status: 'Active', lastAccess: 'Jan 16, 2026', initials: 'E' },
    { id: 'new-user-id-02', name: 'Elegant man number 1', email: 'Elegant_man_number_1@gmail.com', group: 'Group_number_01', status: 'Active', lastAccess: 'Jan 16, 2026', initials: 'E' },
    { id: 'new-user-id-03', name: 'Elegant man number 1', email: 'Elegant_man_number_1@gmail.com', group: 'Group_number_01', status: 'Active', lastAccess: 'Jan 16, 2026', initials: 'E' },
    { id: 'new-user-id',    name: 'Elegant man number 1', email: 'Elegant_man_number_1@gmail.com', group: 'Group_number_01', status: 'Active', lastAccess: 'Jan 16, 2026', initials: 'E' },
    { id: 'new-user-id-05', name: 'Elegant man number 1', email: 'Elegant_man_number_1@gmail.com', group: 'Group_number_01', status: 'Active', lastAccess: 'Jan 16, 2026', initials: 'E' },
  ];

  get filteredUsers(): User[] {
    return this.users.filter((u) => {
      const matchEmail  = !this.filterEmail   || u.email.toLowerCase().includes(this.filterEmail.toLowerCase());
      const matchGroup  = !this.filterGroup   || u.group.toLowerCase().includes(this.filterGroup.toLowerCase());
      const matchName   = !this.filterName    || u.name.toLowerCase().includes(this.filterName.toLowerCase());
      const matchId     = !this.filterUserId  || u.id.toLowerCase().includes(this.filterUserId.toLowerCase());
      return matchEmail && matchGroup && matchName && matchId;
    });
  }

  get resultCount(): number {
    return this.filteredUsers.length;
  }
}
