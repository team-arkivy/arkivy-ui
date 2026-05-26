import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';

const authConfig: AuthConfig = {
  issuer: 'https://dev-arkivy-ybl40k.us1.zitadel.cloud',
  redirectUri: 'http://localhost:4200/auth/callback',
  postLogoutRedirectUri: 'http://localhost:4200',
  clientId: '371694118679670659',
  responseType: 'code',
  scope: 'openid profile email urn:zitadel:iam:org:project:id:zitadel:aud',
  showDebugInformation: true,
  requireHttps: false, // solo para desarrollo
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private oauthService: OAuthService,
    private router: Router,
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

  login(): void {
    this.oauthService.initCodeFlow();
  }

  logout(): void {
    this.oauthService.logOut();
    this.oauthService.postLogoutRedirectUri = 'http://localhost:4200';
  }

  isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  getAccessToken(): string {
    return this.oauthService.getAccessToken();
  }

  getUserInfo(): object {
    return this.oauthService.getIdentityClaims();
  }

  getRoles(): string[] {
    const claims = this.oauthService.getIdentityClaims() as any;
    if (!claims) return [];

    const rolesObj = claims['urn:zitadel:iam:org:project:roles'];
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
