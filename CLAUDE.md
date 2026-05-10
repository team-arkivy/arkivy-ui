# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start           # Dev server at localhost:4200
npm run build       # Production build
npm test            # Run tests with Vitest
npm run watch       # Dev build with watch mode
node dist/arkivy-ui/server/server.mjs  # Serve SSR build
```

## Architecture

Angular 21 app with SSR (Express 5), TypeScript strict mode, standalone components, and Angular signals for state.

### Routes

| Path | Component | Notes |
|---|---|---|
| `/login` | `app/login/login.ts` | Network canvas background, mock 1800ms auth |
| `/register` | `app/sing-up/sing-up.ts` | Wave canvas background |
| `/dashboard` | `app/dashboard/dashboard.ts` | Layout shell with collapsible sidebar |
| `/dashboard/documentation` | `app/dashboard/documentation/` | Block-based doc editor |
| `/dashboard/users` | `app/dashboard/users/` | User table with multi-field filtering |
| `/dashboard/groups` | `app/dashboard/groups/` | Group management with RBAC UI |

### State Management

`DocumentationService` (`app/shared/documentation.service.ts`) holds all doc-editor state using Angular signals — spaces, table of contents, pages (keyed in a `Map`), and editable blocks. Components use computed signals or getters for derived state (e.g., filtered user lists).

### Key Patterns

**Standalone components** — every component uses `imports: []` instead of NgModules.

**Angular 17+ control flow** — use `@if`, `@for`, `@switch` in templates (not `*ngIf`, `*ngFor`).

**Canvas animations** — login and dashboard use a network-node animation; register uses diagonal sine waves. All animations are SSR-safe via `isPlatformBrowser(platformId)` and clean up with `cancelAnimationFrame` in `ngOnDestroy`.

**Styling** — global CSS partials live in `src/styles/` and are imported via `src/styles.css`. Design tokens are CSS custom properties (`--clr-*`, `--radius-*`, `--font-*`). Each component has a paired `.css` file for scoped styles. Dark theme with purple/cyan accents; fonts: Orbitron (display), Syne (body), Inter (UI).

**Icon component** — `app/shared/icon/icon.component.ts` renders inline SVG via `DomSanitizer`. Use `<app-icon name="...">` to reference icons.

**TypeScript interfaces** — defined within the component file that owns them (`User`, `Group`, `DocSpace`, `DocPage`, `DocBlock`, etc.).
