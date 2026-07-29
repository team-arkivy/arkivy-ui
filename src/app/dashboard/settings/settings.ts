import { Component, Inject, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog';
import { AuthService } from '../../shared/auth.service';
import { ApiService, OrgUsage, Plan } from '../../shared/api.service';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  language: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ConfirmDialogComponent],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);

  profile: UserProfile = { firstName: '', lastName: '', email: '', language: 'es' };

  activeTab = signal<'profile' | 'preferences' | 'plan'>('profile');
  savedProfile = signal(false);
  savedPreferences = signal(false);

  /** Señales, no propiedades planas: se escriben desde .subscribe() — app zoneless, ver ContentService. */
  readonly usage = signal<OrgUsage | null>(null);
  readonly usageLoading = signal(false);
  readonly usageError = signal('');
  readonly plans = signal<Plan[]>([]);
  readonly changingPlan = signal(false);

  // Solo se togglea desde clicks (evento DOM) — propiedad plana está bien acá.
  confirmPlan: Plan | null = null;

  readonly languages = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    public authService: AuthService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUserInfo();
    const nameParts = (user?.displayName ?? '').split(' ');

    this.profile.firstName = nameParts[0] ?? '';
    this.profile.lastName = nameParts.slice(1).join(' ') ?? '';
    this.profile.email = user?.loginName ?? '';

    if (isPlatformBrowser(this.platformId)) {
      this.profile.firstName = localStorage.getItem('arkivy_firstName') ?? this.profile.firstName;
      this.profile.lastName = localStorage.getItem('arkivy_lastName') ?? this.profile.lastName;
      this.profile.language = localStorage.getItem('arkivy_language') ?? 'es';
    }

    if (this.isPlatformAdmin) this.loadUsage();
  }

  get isPlatformAdmin(): boolean {
    return !!this.authService.getUserInfo()?.isPlatformAdmin;
  }

  get userInitials(): string {
    const parts = [this.profile.firstName, this.profile.lastName].filter(Boolean);
    return parts.map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  get fullName(): string {
    return [this.profile.firstName, this.profile.lastName].filter(Boolean).join(' ') || 'Usuario';
  }

  setTab(tab: 'profile' | 'preferences' | 'plan'): void {
    this.activeTab.set(tab);
  }

  saveProfile(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('arkivy_firstName', this.profile.firstName);
      localStorage.setItem('arkivy_lastName', this.profile.lastName);
    }
    this.savedProfile.set(true);
    setTimeout(() => this.savedProfile.set(false), 2500);
  }

  savePreferences(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('arkivy_language', this.profile.language);
    }
    this.savedPreferences.set(true);
    setTimeout(() => this.savedPreferences.set(false), 2500);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PLAN Y CONSUMO (RF-PLAN-02/03)
  // ═══════════════════════════════════════════════════════════════════════

  formatBytes(bytes: number): string {
    if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB';
    if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(0) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  }

  private loadUsage(): void {
    this.usageLoading.set(true);
    this.usageError.set('');
    this.api.getUsage().subscribe({
      next: usage => {
        this.usage.set(usage);
        this.usageLoading.set(false);
        this.loadPlans();
      },
      error: () => {
        this.usageLoading.set(false);
        this.usageError.set('No se pudo cargar el consumo de tu plan.');
      },
    });
  }

  private loadPlans(): void {
    this.api.listPlans().subscribe({
      next: plans => this.plans.set(plans),
      error: () => this.plans.set([]),
    });
  }

  requestPlanChange(plan: Plan): void {
    this.confirmPlan = plan;
  }

  cancelPlanChange(): void {
    this.confirmPlan = null;
  }

  confirmPlanChangeNow(): void {
    const plan = this.confirmPlan;
    if (!plan) return;
    this.confirmPlan = null;
    this.changingPlan.set(true);
    this.usageError.set('');
    this.api.changePlan(plan.id).subscribe({
      next: () => {
        this.changingPlan.set(false);
        this.loadUsage();
      },
      error: (err: { error?: { error?: string } }) => {
        this.changingPlan.set(false);
        this.usageError.set(err?.error?.error ?? 'No se pudo cambiar el plan.');
      },
    });
  }
}
