import { Component, HostListener } from '@angular/core';
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
  searchQuery = '';
  showAddModal = false;
  openMenuId: string | null = null;

  addForm = { name: '', email: '', group: '', status: 'Active' as 'Active' | 'Inactive' };
  addError = '';

  users: User[] = [
    { id: 'usr-001', name: 'Ana García',       email: 'ana.garcia@empresa.com',    group: 'Administradores', status: 'Active',   lastAccess: 'Jun 1, 2026',  initials: 'AG' },
    { id: 'usr-002', name: 'Carlos Martínez',  email: 'carlos.m@empresa.com',      group: 'Desarrolladores', status: 'Active',   lastAccess: 'Jun 2, 2026',  initials: 'CM' },
    { id: 'usr-003', name: 'Lucía Fernández',  email: 'lucia.f@empresa.com',       group: 'Diseño',          status: 'Active',   lastAccess: 'May 30, 2026', initials: 'LF' },
    { id: 'usr-004', name: 'David Rodríguez',  email: 'david.r@empresa.com',       group: 'Desarrolladores', status: 'Inactive', lastAccess: 'Apr 15, 2026', initials: 'DR' },
    { id: 'usr-005', name: 'María López',      email: 'maria.l@empresa.com',       group: 'Soporte',         status: 'Active',   lastAccess: 'Jun 2, 2026',  initials: 'ML' },
    { id: 'usr-006', name: 'Jorge Sánchez',    email: 'jorge.s@empresa.com',       group: 'Soporte',         status: 'Active',   lastAccess: 'May 28, 2026', initials: 'JS' },
    { id: 'usr-007', name: 'Elena Torres',     email: 'elena.t@empresa.com',       group: 'Administradores', status: 'Inactive', lastAccess: 'Mar 10, 2026', initials: 'ET' },
    { id: 'usr-008', name: 'Andrés Jiménez',   email: 'andres.j@empresa.com',      group: 'Desarrolladores', status: 'Active',   lastAccess: 'Jun 1, 2026',  initials: 'AJ' },
  ];

  private nextId = 9;

  get filteredUsers(): User[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.group.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.status.toLowerCase().includes(q)
    );
  }

  get resultCount(): number {
    return this.filteredUsers.length;
  }

  openAddModal(): void {
    this.addForm = { name: '', email: '', group: '', status: 'Active' };
    this.addError = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  submitAddUser(): void {
    const { name, email, group } = this.addForm;
    if (!name.trim() || !email.trim() || !group.trim()) {
      this.addError = 'Name, email and group are required.';
      return;
    }
    if (this.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      this.addError = 'A user with that email already exists.';
      return;
    }
    const initials = name.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
    this.users = [
      ...this.users,
      {
        id: `usr-${String(this.nextId++).padStart(3, '0')}`,
        name: name.trim(),
        email: email.trim(),
        group: group.trim(),
        status: this.addForm.status,
        lastAccess: '—',
        initials,
      },
    ];
    this.showAddModal = false;
  }

  deleteUser(id: string): void {
    this.users = this.users.filter(u => u.id !== id);
    this.openMenuId = null;
  }

  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.openMenuId = null;
  }
}
