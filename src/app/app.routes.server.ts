import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Page IDs are user-generated content, not known at build time — can't
    // be prerendered (would need an exhaustive getPrerenderParams). It's
    // behind authGuard anyway, so client-side rendering is the right mode.
    path: 'dashboard/documentation/:pageId',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
