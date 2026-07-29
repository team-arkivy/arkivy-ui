import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { IconComponent } from '../../shared/icon/icon.component';
import {
  ApiService,
  Group as ApiGroup,
  GroupDetail,
  Space,
  TocCategory,
  Page as ApiPage,
} from '../../shared/api.service';

// ─── Interfaces del dominio (vistas hidratadas desde la API real) ─────────────

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: 'Editor' | 'Reader';
}

interface GroupSpace {
  id: string;
  name: string;
}

// Metadatos comunes de una página/archivo, ya resueltos contra el catálogo
// de la organización (nombre del espacio, autor, categoría legible, etc.)
interface FileMeta {
  id: string;
  name: string;
  spaceId: string;
  space: string;
  category: string;
  status: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

type GroupFile = FileMeta;

interface Group {
  id: string;
  name: string;
  createdAt: string;
  spaces: GroupSpace[];
  files: GroupFile[];
  members: GroupMember[];
}

// ─── Catálogo global (recursos disponibles en la organización) ────────────────

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  selected: boolean;
}

interface AvailableSpace {
  id: string;
  name: string;
  pageCount: number;
  selected: boolean;
}

interface AvailableFile extends FileMeta {
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
export class GroupsComponent implements OnInit {

  constructor(private api: ApiService) {}

  // ─── Carga y estado de red ──────────────────────────────────────────────────
  loading = true;
  refreshing = false;
  busy = false;
  errorMessage = '';
  actionError = '';
  private pendingSelectId: string | null = null;

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

  // ─── Maximizar sección de espacios ──────────────────────────────────────────
  spacesExpanded = false;

  // ─── Modales ─────────────────────────────────────────────────────────────────
  showCreateGroupModal = false;
  newGroupName = '';

  showAddSpaceModal = false;
  addSpaceSearch = '';

  showAddFileModal = false;
  addFileSearch = '';

  showAddMemberModal = false;
  addMemberSearch = '';
  pendingMemberRole: 'Editor' | 'Reader' = 'Reader';

  // ─── Catálogo de la organización (cargado desde la API real) ────────────────
  allUsers: AvailableUser[] = [];
  allSpaces: AvailableSpace[] = [];
  allFiles: AvailableFile[] = [];

  // ─── Grupos (hidratados con el catálogo de arriba) ───────────────────────────
  groups: Group[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.loadEverything();
  }

  retryLoad(): void {
    this.loading = true;
    this.errorMessage = '';
    this.loadEverything();
  }

  private refresh(): void {
    this.refreshing = true;
    this.loadEverything();
  }

  private loadEverything(): void {
    this.errorMessage = '';
    this.actionError = '';

    forkJoin({
      groups: this.api.listGroups(),
      users: this.api.listUsers(),
      spaces: this.api.listSpaces(),
    }).pipe(
      switchMap(({ groups, users, spaces }) =>
        forkJoin({
          users: of(users),
          spaces: of(spaces),
          pagesBySpace: spaces.length
            ? forkJoin(spaces.map(space =>
                this.api.listPagesBySpace(space.id).pipe(map(toc => ({ space, toc })))
              ))
            : of([] as { space: Space; toc: TocCategory[] }[]),
          details: groups.length
            ? forkJoin(groups.map(g => this.api.getGroup(g.id)))
            : of([] as GroupDetail[]),
        })
      ),
    ).subscribe({
      next: ({ users, spaces, pagesBySpace, details }) => {
        this.allUsers = users.map(u => ({ id: u.id, name: u.name, email: u.email, selected: false }));
        this.allFiles = this.buildFilesCatalog(pagesBySpace);
        this.allSpaces = spaces.map(s => ({
          id: s.id,
          name: s.name,
          pageCount: this.allFiles.filter(f => f.spaceId === s.id).length,
          selected: false,
        }));
        this.groups = details.map(d => this.hydrateGroup(d));
        this.finishLoad();
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los grupos. Verifica tu sesión e inténtalo de nuevo.';
        this.finishLoad();
      },
    });
  }

  private finishLoad(): void {
    this.loading = false;
    this.refreshing = false;
    this.busy = false;
    if (this.pendingSelectId) {
      const group = this.groups.find(g => g.id === this.pendingSelectId);
      this.pendingSelectId = null;
      if (group) this.selectGroup(group);
    }
  }

  private buildFilesCatalog(pagesBySpace: { space: Space; toc: TocCategory[] }[]): AvailableFile[] {
    const usersById = new Map(this.allUsers.map(u => [u.id, u]));
    const files: AvailableFile[] = [];
    for (const { space, toc } of pagesBySpace) {
      for (const category of toc) {
        for (const p of category.pages) {
          files.push(this.toFileMeta(p, space, usersById));
        }
      }
    }
    return files.map(f => ({ ...f, selected: false }));
  }

  private toFileMeta(page: ApiPage, space: Space, usersById: Map<string, AvailableUser>): AvailableFile {
    return {
      id: page.id,
      name: page.title,
      spaceId: space.id,
      space: space.name,
      category: this.categoryLabel(page.category),
      status: page.status,
      authorName: usersById.get(page.authorId)?.name ?? page.authorId,
      createdAt: this.formatDate(page.createdAt),
      updatedAt: this.formatDate(page.updatedAt),
      selected: false,
    };
  }

  private hydrateGroup(detail: GroupDetail): Group {
    const spaces: GroupSpace[] = detail.spaces
      .map(sa => this.allSpaces.find(s => s.id === sa.spaceId))
      .filter((s): s is AvailableSpace => !!s)
      .map(s => ({ id: s.id, name: s.name }));

    const files: GroupFile[] = detail.pages
      .map(pa => this.allFiles.find(f => f.id === pa.pageId))
      .filter((f): f is AvailableFile => !!f)
      .map(({ selected: _selected, ...meta }) => meta);

    const members: GroupMember[] = detail.members.map(m => {
      const u = this.allUsers.find(u => u.id === m.userId);
      return {
        id: m.userId,
        name: u?.name ?? m.userId,
        email: u?.email ?? '',
        role: m.role === 'editor' ? 'Editor' : 'Reader',
      };
    });

    return {
      id: detail.group.id,
      name: detail.group.name,
      createdAt: this.formatDate(detail.group.createdAt),
      spaces,
      files,
      members,
    };
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  private categoryLabel(cat: string): string {
    switch (cat) {
      case 'tutorial': return 'Tutorial';
      case 'how_to': return 'Cómo hacer';
      case 'reference': return 'Referencia';
      case 'explanation': return 'Explicación';
      case 'multiple': return 'Múltiple';
      default: return cat;
    }
  }

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
    this.spacesExpanded = false;
  }

  setTab(tab: 'content' | 'members'): void {
    this.activeTab = tab;
    this.contextView = null;
    this.cancelEdit();
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
  }

  openFileView(file: GroupFile | AvailableFile, event: Event): void {
    if ('id' in file && this.editingFileId === file.id) return;
    event.stopPropagation();
    this.contextView = { type: 'file', file };
  }

  closeContextPanel(): void {
    this.contextView = null;
  }

  /** Devuelve las páginas del catálogo que pertenecen a un espacio dado */
  getFilesInSpace(spaceId: string): AvailableFile[] {
    return this.allFiles.filter(f => f.spaceId === spaceId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDICIÓN INLINE DE NOMBRES (renombra el Espacio/Página real)
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
    this.editingSpaceId = null;
    if (!name || name === space.name) return;
    this.busy = true;
    this.api.renameSpace(space.id, name).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudo renombrar el espacio.';
      },
    });
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
    this.editingFileId = null;
    if (!name || name === file.name) return;
    this.busy = true;
    this.api.updatePage(file.id, { title: name }).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudo renombrar el archivo.';
      },
    });
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
    this.busy = true;
    this.api.createGroup(name).subscribe({
      next: (group: ApiGroup) => {
        this.showCreateGroupModal = false;
        this.pendingSelectId = group.id;
        this.refresh();
      },
      error: (err: { error?: { error?: string } }) => {
        this.busy = false;
        this.actionError = err?.error?.error ?? 'No se pudo crear el grupo.';
      },
    });
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
    this.showAddSpaceModal = true;
  }

  closeAddSpaceModal(): void { this.showAddSpaceModal = false; }

  confirmAddSpaces(): void {
    const group = this.selectedGroup;
    const selected = this.allSpaces.filter(s => s.selected);
    if (!group || selected.length === 0) return;
    this.busy = true;
    forkJoin(selected.map(s => this.api.grantGroupSpaceAccess(group.id, s.id))).subscribe({
      next: () => {
        this.showAddSpaceModal = false;
        this.refresh();
      },
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudieron agregar los espacios.';
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AGREGAR ARCHIVO AL GRUPO
  // ═══════════════════════════════════════════════════════════════════════════

  get filteredAvailableFiles(): AvailableFile[] {
    const taken = new Set(this.selectedGroup?.files.map(f => f.id) ?? []);
    const q = this.addFileSearch.toLowerCase().trim();
    return this.allFiles
      .filter(f => !taken.has(f.id))
      .filter(f => !q || f.name.toLowerCase().includes(q) || f.space.toLowerCase().includes(q));
  }

  openAddFileModal(): void {
    this.allFiles.forEach(f => (f.selected = false));
    this.addFileSearch = '';
    this.showAddFileModal = true;
  }

  closeAddFileModal(): void { this.showAddFileModal = false; }

  confirmAddFiles(): void {
    const group = this.selectedGroup;
    const selected = this.allFiles.filter(f => f.selected);
    if (!group || selected.length === 0) return;
    this.busy = true;
    forkJoin(selected.map(f => this.api.grantGroupPageAccess(group.id, f.id))).subscribe({
      next: () => {
        this.showAddFileModal = false;
        this.refresh();
      },
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudieron agregar los archivos.';
      },
    });
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
    const selected = this.allUsers.filter(u => u.selected);
    if (!group || selected.length === 0) return;
    const role = this.pendingMemberRole === 'Editor' ? 'editor' : 'reader';
    this.busy = true;
    forkJoin(selected.map(u => this.api.addGroupMember(group.id, u.id, role))).subscribe({
      next: () => {
        this.showAddMemberModal = false;
        this.refresh();
      },
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudieron agregar los miembros.';
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIMINAR
  // ═══════════════════════════════════════════════════════════════════════════

  removeSpace(group: Group, space: GroupSpace, event: Event): void {
    event.stopPropagation();
    if (this.contextView?.type === 'space' && this.contextView.space === space) {
      this.contextView = null;
    }
    this.busy = true;
    this.api.revokeGroupSpaceAccess(group.id, space.id).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudo quitar el espacio.';
      },
    });
  }

  removeFile(group: Group, file: GroupFile, event: Event): void {
    event.stopPropagation();
    if (this.contextView?.type === 'file' && this.contextView.file === file) {
      this.contextView = null;
    }
    this.busy = true;
    this.api.revokeGroupPageAccess(group.id, file.id).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudo quitar el archivo.';
      },
    });
  }

  removeMember(group: Group, member: GroupMember): void {
    this.busy = true;
    this.api.removeGroupMember(group.id, member.id).subscribe({
      next: () => this.refresh(),
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudo quitar el miembro.';
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIAR ROL DE MIEMBRO
  // ═══════════════════════════════════════════════════════════════════════════

  changeMemberRole(member: GroupMember, role: 'Editor' | 'Reader'): void {
    const group = this.selectedGroup;
    if (!group || member.role === role) return;
    this.busy = true;
    this.api.changeGroupMemberRole(group.id, member.id, role === 'Editor' ? 'editor' : 'reader').subscribe({
      next: () => this.refresh(),
      error: () => {
        this.busy = false;
        this.actionError = 'No se pudo cambiar el rol.';
      },
    });
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
