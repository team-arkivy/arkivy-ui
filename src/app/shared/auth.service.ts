import { Injectable, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import {
  ApiService,
  LoginRequest,
  RegisterRequest,
  SessionResponse,
  MeResponse,
} from './api.service';
import { SESSION_ID_KEY, SESSION_TOKEN_KEY } from './interceptors/auth.interceptor';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<MeResponse | null>(null);

  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    if (isPlatformBrowser(this.platformId) && this.hasStoredSession()) {
      this.refreshCurrentUser();
    }
  }

  private hasStoredSession(): boolean {
    return isPlatformBrowser(this.platformId) &&
      !!localStorage.getItem(SESSION_ID_KEY) &&
      !!localStorage.getItem(SESSION_TOKEN_KEY);
  }

  private storeSession(session: SessionResponse): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(SESSION_ID_KEY, session.sessionId);
    localStorage.setItem(SESSION_TOKEN_KEY, session.sessionToken);
  }

  private clearSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }

  private refreshCurrentUser(): void {
    this.apiService.me().subscribe({
      next: user => this.currentUser.set(user),
      error: () => {
        this.clearSession();
        this.currentUser.set(null);
      },
    });
  }

  loginWithCredentials(credentials: LoginRequest): Observable<SessionResponse> {
    return this.apiService.login(credentials).pipe(
      tap(session => {
        this.storeSession(session);
        this.refreshCurrentUser();
      }),
    );
  }

  register(data: RegisterRequest): Observable<SessionResponse> {
    return this.apiService.register(data).pipe(
      tap(session => {
        this.storeSession(session);
        this.refreshCurrentUser();
      }),
    );
  }

  /** Local-only escape hatch while there's no real Zitadel session — see environment.devAuthBypass. */
  devLogin(): Observable<SessionResponse> {
    return this.apiService.devLogin().pipe(
      tap(session => {
        this.storeSession(session);
        this.refreshCurrentUser();
      }),
    );
  }

  /** Redirects the browser to Zitadel's Google consent screen. Zitadel redirects back to /auth/callback. */
  loginWithGoogle(): void {
    this.apiService.googleLogin().subscribe(res => {
      if (isPlatformBrowser(this.platformId)) window.location.href = res.authUrl;
    });
  }

  /** Redirects the browser to Zitadel's GitHub consent screen. Zitadel redirects back to /auth/callback. */
  loginWithGitHub(): void {
    this.apiService.githubLogin().subscribe(res => {
      if (isPlatformBrowser(this.platformId)) window.location.href = res.authUrl;
    });
  }

  /** Finishes the IDP flow once Zitadel redirects back to /auth/callback with intentId/intentToken/userId. */
  completeIdpLogin(intentId: string, intentToken: string, userId: string): Observable<SessionResponse> {
    return this.apiService.idpCallback({ intentId, intentToken, userId }).pipe(
      tap(session => {
        this.storeSession(session);
        this.refreshCurrentUser();
      }),
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      const sessionId = localStorage.getItem(SESSION_ID_KEY);
      const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
      if (sessionId && sessionToken) {
        this.apiService.logout(sessionId, sessionToken).subscribe();
      }
    }
    this.clearSession();
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return this.hasStoredSession();
  }

  getUserInfo(): MeResponse | null {
    return this.currentUser();
  }

  getRoles(): string[] {
    return this.currentUser()?.roles ?? [];
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.some(role => userRoles.includes(role));
  }
}
