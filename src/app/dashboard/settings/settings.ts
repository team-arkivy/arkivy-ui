import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/icon/icon.component';
import { AuthService } from '../../shared/auth.service';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  language: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
})
export class SettingsComponent implements OnInit {
  profile: UserProfile = { firstName: '', lastName: '', email: '', language: 'es' };

  activeTab = signal<'profile' | 'preferences'>('profile');
  savedProfile = signal(false);
  savedPreferences = signal(false);

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
  }

  get userInitials(): string {
    const parts = [this.profile.firstName, this.profile.lastName].filter(Boolean);
    return parts.map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  get fullName(): string {
    return [this.profile.firstName, this.profile.lastName].filter(Boolean).join(' ') || 'Usuario';
  }

  setTab(tab: 'profile' | 'preferences'): void {
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
}
