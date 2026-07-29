import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../shared/icon/icon.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';
import { ApiService, Invitation, OrgUser, UserStatus } from '../../shared/api.service';
import { AuthService } from '../../shared/auth.service';

type RoleBadge = 'Platform Admin' | 'Editor' | 'Reader' | 'Sin grupo asignado';

/**
 * Página de Usuarios (RF-USR-01/02/03/04/06), conectada al backend real.
 * Los signals que se escriben desde .subscribe()/forkJoin son obligatorios
 * acá — esta app es zoneless, ver ContentService para el porqué.
 */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ConfirmDialogComponent],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
})
export class UsersComponent implements OnInit {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  searchQuery = '';
  openMenuId: string | null = null;

  readonly users = signal<OrgUser[]>([]);
  readonly usersLoading = signal(false);
  readonly usersError = signal('');
  readonly roleByUserId = signal<Record<string, RoleBadge>>({});

  readonly invitations = signal<Invitation[]>([]);

  showInviteModal = false;
  inviteEmail = '';
  readonly inviteError = signal('');
  readonly inviteBusy = signal(false);

  confirmDeleteUser: OrgUser | null = null;

  get isPlatformAdmin(): boolean {
    return !!this.authService.getUserInfo()?.isPlatformAdmin;
  }

  get filteredUsers(): OrgUser[] {
    const q = this.searchQuery.trim().toLowerCase();
    const list = this.users();
    if (!q) return list;
    return list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      this.roleLabel(u).toLowerCase().includes(q) ||
      u.status.toLowerCase().includes(q),
    );
  }

  get resultCount(): number {
    return this.filteredUsers.length;
  }

  ngOnInit(): void {
    this.loadUsers();
    if (this.isPlatformAdmin) this.loadInvitations();
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
  }

  roleLabel(user: OrgUser): RoleBadge {
    if (user.isPlatformAdmin) return 'Platform Admin';
    return this.roleByUserId()[user.id] ?? 'Sin grupo asignado';
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CARGA
  // ═══════════════════════════════════════════════════════════════════════

  private loadUsers(): void {
    this.usersLoading.set(true);
    this.usersError.set('');
    this.api.listUsers().subscribe({
      next: users => {
        this.users.set(users);
        this.usersLoading.set(false);
        this.loadRoles();
      },
      error: () => {
        this.usersLoading.set(false);
        this.usersError.set('No se pudieron cargar los usuarios.');
      },
    });
  }

  /** RF-USR-06: badge de rol combinado — el mayor rol (Editor > Reader) entre todos los Grupos donde el usuario es miembro. */
  private loadRoles(): void {
    this.api.listGroups().subscribe({
      next: groups => {
        if (groups.length === 0) {
          this.roleByUserId.set({});
          return;
        }
        forkJoin(groups.map(g => this.api.getGroup(g.id))).subscribe({
          next: details => {
            const roles: Record<string, RoleBadge> = {};
            for (const detail of details) {
              for (const member of detail.members) {
                if (roles[member.userId] === 'Editor') continue;
                roles[member.userId] = member.role === 'editor' ? 'Editor' : 'Reader';
              }
            }
            this.roleByUserId.set(roles);
          },
          error: () => this.roleByUserId.set({}),
        });
      },
      error: () => this.roleByUserId.set({}),
    });
  }

  private loadInvitations(): void {
    this.api.listInvitations().subscribe({
      next: invitations => this.invitations.set(invitations),
      error: () => this.invitations.set([]),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INVITAR (RF-USR-02, RF-AUTH-06)
  // ═══════════════════════════════════════════════════════════════════════

  openInviteModal(): void {
    this.inviteEmail = '';
    this.inviteError.set('');
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
  }

  submitInvite(): void {
    const email = this.inviteEmail.trim();
    if (!email) {
      this.inviteError.set('El email es obligatorio.');
      return;
    }
    this.inviteBusy.set(true);
    this.inviteError.set('');
    this.api.createInvitation(email).subscribe({
      next: invitation => {
        this.inviteBusy.set(false);
        this.showInviteModal = false;
        this.invitations.update(list => [invitation, ...list]);
      },
      error: (err: { error?: { error?: string } }) => {
        this.inviteBusy.set(false);
        this.inviteError.set(err?.error?.error ?? 'No se pudo enviar la invitación.');
      },
    });
  }

  revokeInvitation(id: string): void {
    this.api.revokeInvitation(id).subscribe({
      next: () => this.invitations.update(list => list.filter(i => i.id !== id)),
      error: () => this.usersError.set('No se pudo revocar la invitación.'),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DESACTIVAR / REACTIVAR / ELIMINAR (RF-USR-03)
  // ═══════════════════════════════════════════════════════════════════════

  toggleStatus(user: OrgUser): void {
    const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active';
    this.openMenuId = null;
    this.api.setUserStatus(user.id, newStatus).subscribe({
      next: () => this.users.update(list => list.map(u => (u.id === user.id ? { ...u, status: newStatus } : u))),
      error: () => this.usersError.set('No se pudo actualizar el estado del usuario.'),
    });
  }

  requestDeleteUser(user: OrgUser): void {
    this.confirmDeleteUser = user;
    this.openMenuId = null;
  }

  cancelDeleteUser(): void {
    this.confirmDeleteUser = null;
  }

  confirmDeleteUserNow(): void {
    const user = this.confirmDeleteUser;
    if (!user) return;
    this.confirmDeleteUser = null;
    this.api.deleteUser(user.id).subscribe({
      next: () => this.users.update(list => list.filter(u => u.id !== user.id)),
      error: (err: { error?: { error?: string } }) => {
        this.usersError.set(err?.error?.error ?? 'No se pudo eliminar el usuario.');
      },
    });
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
