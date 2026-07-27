import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export const SESSION_ID_KEY = 'arkivy_session_id';
export const SESSION_TOKEN_KEY = 'arkivy_session_token';

// Matches the headers read by internal/middleware.SessionMiddleware on the backend.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return next(req);
  if (environment.apiUrl && !req.url.startsWith(environment.apiUrl)) return next(req);

  const sessionId = localStorage.getItem(SESSION_ID_KEY);
  const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!sessionId || !sessionToken) return next(req);

  return next(
    req.clone({
      setHeaders: { 'X-Session-Id': sessionId, 'X-Session-Token': sessionToken },
    }),
  );
};
