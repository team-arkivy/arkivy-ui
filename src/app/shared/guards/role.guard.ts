import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {AuthService} from '../auth.service';

export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    if (authService.hasRole('sys-admin')) {
      return true; // sys-admin siempre tiene acceso
    }

    const hasAccess = allowedRoles.some(role => authService.hasRole(role));
    if (!hasAccess) {
      router.navigate(['/dashboard']); // redirige al dashboard si no tiene permiso
      return false;
    }

    return true;
  };
}
