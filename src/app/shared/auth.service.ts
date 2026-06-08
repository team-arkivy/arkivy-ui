import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from './api.service';
import { TOKEN_KEY } from './interceptors/auth.interceptor';

const authConfig: AuthConfig = {
  issuer: 'https://dev-arkivy-ybl40k.us1.zitadel.cloud',
  redirectUri: 'http://localhost:4200/auth/callback',
  postLogoutRedirectUri: 'http://localhost:4200',
  clientId: '371694118679670659',
  responseType: 'code',
  scope: 'openid profile email urn:zitadel:iam:org:project:id:zitadel:aud',
  showDebugInformation: true,
  requireHttps: false,
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private oauthService: OAuthService,
    private router: Router,
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    this.configure();
  }

  private configure(): void {
    this.oauthService.configure(authConfig);
    if (isPlatformBrowser(this.platformId)) {
      this.oauthService.loadDiscoveryDocumentAndTryLogin().then(() => {
        if (this.oauthService.hasValidAccessToken()) {
          void this.router.navigate(['/dashboard']);
        }
      });
    }
  }

  loginWithOAuth(): void {
    this.oauthService.initCodeFlow();
  }

  loginWithCredentials(credentials: LoginRequest): Observable<LoginResponse> {
    return this.apiService.login(credentials).pipe(
      tap(res => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem(TOKEN_KEY, res.access_token);
        }
      }),
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.apiService.register(data);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId) && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      this.apiService.logout().subscribe();
    }
    this.oauthService.logOut();
  }

  isLoggedIn(): boolean {
    if (isPlatformBrowser(this.platformId) && localStorage.getItem(TOKEN_KEY)) {
      return true;
    }
    return this.oauthService.hasValidAccessToken();
  }

  getAccessToken(): string {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) return token;
    }
    return this.oauthService.getAccessToken();
  }

  getUserInfo(): object {
    return this.oauthService.getIdentityClaims();
  }

  getRoles(): string[] {
    const claims = this.oauthService.getIdentityClaims() as Record<string, unknown>;
    if (!claims) return [];
    const rolesObj = claims['urn:zitadel:iam:org:project:roles'] as Record<string, unknown> | undefined;
    if (!rolesObj) return [];
    return Object.keys(rolesObj);
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.some(role => userRoles.includes(role));
  }
}
