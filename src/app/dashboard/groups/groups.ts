import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon.component';

// ─── Interfaces del dominio ───────────────────────────────────────────────────

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: 'Editor' | 'Reader';
}

interface GroupSpace {
  id: string;
  name: string;
  access: 'Editor' | 'Reader';
}

interface GroupFile {
  id: string;
  name: string;
  space: string | null; // null = archivo suelto (sin espacio asignado)
  access: 'Editor' | 'Reader';
}

interface Group {
  id: string;
  name: string;
  createdAt: string;
  spaces: GroupSpace[];
  files: GroupFile[];
  members: GroupMember[];
}

// ─── Catálogo global (recursos disponibles en el sistema) ─────────────────────

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  selected: boolean;
}

interface AvailableSpace {
  id: string;
  name: string;
  fileCount: number;
  selected: boolean;
}

interface AvailableFile {
  id: string;
  name: string;
  space: string | null;
  selected: boolean;
}

// ─── Estado del panel contextual ─────────────────────────────────────────────

type ContextView =
  | { type: 'space'; space: GroupSpace }
  | { type: 'file'; file: GroupFile | AvailableFile };

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './groups.html',
  styleUrls: ['./groups.css'],
})
export class GroupsComponent {

  // ─── Selección y navegación ─────────────────────────────────────────────────
  searchQuery = '';
  activeTab: 'content' | 'members' = 'content';
  selectedGroupId: string | null = null;

  // ─── Panel contextual (previsualización) ────────────────────────────────────
  contextView: ContextView | null = null;

  // ─── Edición inline de nombres ──────────────────────────────────────────────
  editingSpaceId: string | null = null;
  editingFileId: string | null = null;
  editValue = '';

  // ─── Mover archivo a espacio ────────────────────────────────────────────────
  movingFileId: string | null = null;

  // ─── Maximizar sección de espacios ──────────────────────────────────────────
  spacesExpanded = false;

  // ─── Modales ─────────────────────────────────────────────────────────────────
  showCreateGroupModal = false;
  newGroupName = '';

  showAddSpaceModal = false;
  addSpaceSearch = '';
  pendingSpaceAccess: 'Editor' | 'Reader' = 'Reader';

  showAddFileModal = false;
  addFileSearch = '';
  pendingFileAccess: 'Editor' | 'Reader' = 'Reader';

  showAddMemberModal = false;
  addMemberSearch = '';
  pendingMemberRole: 'Editor' | 'Reader' = 'Reader';

  // ─── Catálogo del sistema ────────────────────────────────────────────────────
  readonly allUsers: AvailableUser[] = [
    { id: 'u1', name: 'Ana García',     email: 'ana@empresa.com',    selected: false },
    { id: 'u2', name: 'Carlos López',   email: 'carlos@empresa.com', selected: false },
    { id: 'u3', name: 'María Torres',   email: 'maria@empresa.com',  selected: false },
    { id: 'u4', name: 'Pedro Martínez', email: 'pedro@empresa.com',  selected: false },
    { id: 'u5', name: 'Laura Sánchez',  email: 'laura@empresa.com',  selected: false },
  ];

  readonly allSpaces: AvailableSpace[] = [
    { id: 's1', name: 'Tutorial',     fileCount: 2, selected: false },
    { id: 's2', name: 'How to guide', fileCount: 2, selected: false },
    { id: 's3', name: 'Reference',    fileCount: 2, selected: false },
    { id: 's4', name: 'Explanation',  fileCount: 2, selected: false },
    { id: 's5', name: 'Multiple',     fileCount: 2, selected: false },
  ];

  readonly allFiles: AvailableFile[] = [
    { id: 'f1', name: 'Tutorial_number_one',    space: 'Tutorial',     selected: false },
    { id: 'f2', name: 'Tutorial_number_two',    space: 'Tutorial',     selected: false },
    { id: 'f3', name: 'How_to_guide_one',       space: 'How to guide', selected: false },
    { id: 'f4', name: 'How_to_guide_two',       space: 'How to guide', selected: false },
    { id: 'f5', name: 'Reference_one',          space: 'Reference',    selected: false },
    { id: 'f6', name: 'Explanation_number_one', space: 'Explanation',  selected: false },
  ];

  // ─── Datos de grupos ──────────────────────────────────────────────────────────
  groups: Group[] = [
    {
      id: 'g1', name: 'Lectores', createdAt: '12/10/2025',
      spaces: [{ id: 's1', name: 'Tutorial', access: 'Reader' }],
      files: [{ id: 'f6', name: 'Explanation_number_one', space: 'Explanation', access: 'Reader' }],
      members: [
        { id: 'u1', name: 'Ana García',   email: 'ana@empresa.com',   role: 'Reader' },
        { id: 'u3', name: 'María Torres', email: 'maria@empresa.com', role: 'Reader' },
      ],
    },
    {
      id: 'g2', name: 'Editores', createdAt: '01/15/2025',
      spaces: [
        { id: 's2', name: 'How to guide', access: 'Editor' },
        { id: 's3', name: 'Reference',    access: 'Editor' },
      ],
      files: [],
      members: [{ id: 'u2', name: 'Carlos López', email: 'carlos@empresa.com', role: 'Editor' }],
    },
    {
      id: 'g3', name: 'Equipo documentación', createdAt: '03/20/2025',
      spaces: [],
      files: [{ id: 'f3', name: 'How_to_guide_one', space: 'How to guide', access: 'Editor' }],
      members: [
        { id: 'u4', name: 'Pedro Martínez', email: 'pedro@empresa.com', role: 'Editor' },
        { id: 'u5', name: 'Laura Sánchez',  email: 'laura@empresa.com', role: 'Reader' },
      ],
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECCIÓN Y NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  get filteredGroups(): Group[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.groups;
    return this.groups.filter(g => g.name.toLowerCase().includes(q));
  }

  get selectedGroup(): Group | undefined {
    return this.groups.find(g => g.id === this.selectedGroupId);
  }

  selectGroup(group: Group): void {
    this.selectedGroupId = group.id;
    this.activeTab = 'content';
    this.contextView = null;
    this.cancelEdit();
    this.closeMoveMenu();
    this.spacesExpanded = false;
  }

  setTab(tab: 'content' | 'members'): void {
    this.activeTab = tab;
    this.contextView = null;
    this.cancelEdit();
    this.closeMoveMenu();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL CONTEXTUAL — Previsualización de espacios y archivos
  // ═══════════════════════════════════════════════════════════════════════════

  /** Espacio actualmente visible en el panel contextual (null si no hay ninguno) */
  get activeSpace(): GroupSpace | null {
    return this.contextView?.type === 'space' ? this.contextView.space : null;
  }

  /** Archivo actualmente visible en el panel contextual (null si no hay ninguno) */
  get activeFile(): GroupFile | AvailableFile | null {
    return this.contextView?.type === 'file' ? this.contextView.file : null;
  }

  openSpaceView(space: GroupSpace, event: Event): void {
    if (this.editingSpaceId === space.id) return;
    event.stopPropagation();
    this.contextView = { type: 'space', space };
    this.closeMoveMenu();
  }

  openFileView(file: GroupFile | AvailableFile, event: Event): void {
    if ('id' in file && this.editingFileId === file.id) return;
    event.stopPropagation();
    this.contextView = { type: 'file', file };
    this.closeMoveMenu();
  }

  closeContextPanel(): void {
    this.contextView = null;
  }

  /** Devuelve los archivos del catálogo que pertenecen a un espacio dado */
  getFilesInSpace(spaceName: string): AvailableFile[] {
    return this.allFiles.filter(f => f.space === spaceName);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDICIÓN INLINE DE NOMBRES
  // ═══════════════════════════════════════════════════════════════════════════

  startEditSpace(space: GroupSpace, event: Event): void {
    event.stopPropagation();
    this.editingSpaceId = space.id;
    this.editingFileId = null;
    this.editValue = space.name;
    this.contextView = null;
    this.focusEditInput();
  }

  saveSpaceName(space: GroupSpace): void {
    const name = this.editValue.trim();
    if (name) space.name = name;
    this.editingSpaceId = null;
  }

  startEditFile(file: GroupFile, event: Event): void {
    event.stopPropagation();
    this.editingFileId = file.id;
    this.editingSpaceId = null;
    this.editValue = file.name;
    this.contextView = null;
    this.focusEditInput();
  }

  saveFileName(file: GroupFile): void {
    const name = this.editValue.trim();
    if (name) file.name = name;
    this.editingFileId = null;
  }

  cancelEdit(): void {
    this.editingSpaceId = null;
    this.editingFileId = null;
  }

  private focusEditInput(): void {
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('.inline-edit-input');
      input?.focus();
      input?.select();
    }, 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVER ARCHIVO A ESPACIO
  // ═══════════════════════════════════════════════════════════════════════════

  toggleMoveMenu(fileId: string, event: Event): void {
    event.stopPropagation();
    this.movingFileId = this.movingFileId === fileId ? null : fileId;
    this.cancelEdit();
  }

  closeMoveMenu(): void {
    this.movingFileId = null;
  }

  moveFileToSpace(file: GroupFile, spaceName: string): void {
    file.space = spaceName;
    this.movingFileId = null;
    // Si el panel contextual mostraba este archivo, actualiza la vista
    if (this.contextView?.type === 'file' && this.contextView.file === file) {
      this.contextView = { type: 'file', file };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAXIMIZAR SECCIÓN DE ESPACIOS
  // ═══════════════════════════════════════════════════════════════════════════

  toggleSpacesExpanded(): void {
    this.spacesExpanded = !this.spacesExpanded;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR GRUPO
  // ═══════════════════════════════════════════════════════════════════════════

  openCreateGroupModal(): void {
    this.newGroupName = '';
    this.showCreateGroupModal = true;
  }

  closeCreateGroupModal(): void {
    this.showCreateGroupModal = false;
  }

  confirmCreateGroup(): void {
    const name = this.newGroupName.trim();
    if (!name) return;
    const id = 'g' + Date.now();
    const d = new Date();
    const createdAt = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    this.groups = [...this.groups, { id, name, createdAt, spaces: [], files: [], members: [] }];
    this.selectedGroupId = id;
    this.activeTab = 'content';
    this.showCreateGroupModal = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGREGAR ESPACIO AL GRUPO
  // ═══════════════════════════════════════════════════════════════════════════

  get filteredAvailableSpaces(): AvailableSpace[] {
    const taken = new Set(this.selectedGroup?.spaces.map(s => s.id) ?? []);
    const q = this.addSpaceSearch.toLowerCase().trim();
    return this.allSpaces
      .filter(s => !taken.has(s.id))
      .filter(s => !q || s.name.toLowerCase().includes(q));
  }

  openAddSpaceModal(): void {
    this.allSpaces.forEach(s => (s.selected = false));
    this.addSpaceSearch = '';
    this.pendingSpaceAccess = 'Reader';
    this.showAddSpaceModal = true;
  }

  closeAddSpaceModal(): void { this.showAddSpaceModal = false; }

  confirmAddSpaces(): void {
    const group = this.selectedGroup;
    if (!group) return;
    for (const s of this.allSpaces.filter(s => s.selected)) {
      if (!group.spaces.find(gs => gs.id === s.id)) {
        group.spaces.push({ id: s.id, name: s.name, access: this.pendingSpaceAccess });
      }
    }
    this.showAddSpaceModal = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGREGAR ARCHIVO AL GRUPO
  // ═══════════════════════════════════════════════════════════════════════════

  get filteredAvailableFiles(): AvailableFile[] {
    const taken = new Set(this.selectedGroup?.files.map(f => f.id) ?? []);
    const q = this.addFileSearch.toLowerCase().trim();
    return this.allFiles
      .filter(f => !taken.has(f.id))
      .filter(f => !q || f.name.toLowerCase().includes(q) || (f.space?.toLowerCase().includes(q) ?? false));
  }

  openAddFileModal(): void {
    this.allFiles.forEach(f => (f.selected = false));
    this.addFileSearch = '';
    this.pendingFileAccess = 'Reader';
    this.showAddFileModal = true;
  }

  closeAddFileModal(): void { this.showAddFileModal = false; }

  confirmAddFiles(): void {
    const group = this.selectedGroup;
    if (!group) return;
    for (const f of this.allFiles.filter(f => f.selected)) {
      if (!group.files.find(gf => gf.id === f.id)) {
        group.files.push({ id: f.id, name: f.name, space: f.space, access: this.pendingFileAccess });
      }
    }
    this.showAddFileModal = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGREGAR MIEMBRO AL GRUPO
  // ═══════════════════════════════════════════════════════════════════════════

  get filteredAvailableUsers(): AvailableUser[] {
    const taken = new Set(this.selectedGroup?.members.map(m => m.id) ?? []);
    const q = this.addMemberSearch.toLowerCase().trim();
    return this.allUsers
      .filter(u => !taken.has(u.id))
      .filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  openAddMemberModal(): void {
    this.allUsers.forEach(u => (u.selected = false));
    this.addMemberSearch = '';
    this.pendingMemberRole = 'Reader';
    this.showAddMemberModal = true;
  }

  closeAddMemberModal(): void { this.showAddMemberModal = false; }

  confirmAddMembers(): void {
    const group = this.selectedGroup;
    if (!group) return;
    for (const u of this.allUsers.filter(u => u.selected)) {
      if (!group.members.find(m => m.id === u.id)) {
        group.members.push({ id: u.id, name: u.name, email: u.email, role: this.pendingMemberRole });
      }
    }
    this.showAddMemberModal = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIMINAR
  // ═══════════════════════════════════════════════════════════════════════════

  removeSpace(group: Group, space: GroupSpace, event: Event): void {
    event.stopPropagation();
    group.spaces = group.spaces.filter(s => s.id !== space.id);
    if (this.contextView?.type === 'space' && this.contextView.space === space) {
      this.contextView = null;
    }
  }

  removeFile(group: Group, file: GroupFile, event: Event): void {
    event.stopPropagation();
    group.files = group.files.filter(f => f.id !== file.id);
    if (this.contextView?.type === 'file' && this.contextView.file === file) {
      this.contextView = null;
    }
  }

  removeMember(group: Group, member: GroupMember): void {
    group.members = group.members.filter(m => m.id !== member.id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIAR ACCESO / ROL
  // ═══════════════════════════════════════════════════════════════════════════

  changeSpaceAccess(space: GroupSpace, access: 'Editor' | 'Reader', event: Event): void {
    event.stopPropagation();
    space.access = access;
  }

  changeFileAccess(file: GroupFile, access: 'Editor' | 'Reader', event: Event): void {
    event.stopPropagation();
    file.access = access;
  }

  changeMemberRole(member: GroupMember, role: 'Editor' | 'Reader'): void {
    member.role = role;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS DE UI
  // ═══════════════════════════════════════════════════════════════════════════

  countSelected(items: { selected: boolean }[]): number {
    return items.filter(i => i.selected).length;
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
