import { Routes } from '@angular/router';
import {authGuard} from './shared/guards/auth.guard';
import {roleGuard} from './shared/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./sing-up/sing-up').then((m) => m.SingUp),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.DashboardComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'documentation',
      },
      {
        path: 'documentation',
        loadComponent: () =>
          import('./dashboard/documentation/documentation').then(
            (m) => m.DocumentationComponent,
          ),
      },
      {
        path: 'documentation/:pageId',
        loadComponent: () =>
          import('./dashboard/documentation/documentation').then(
            (m) => m.DocumentationComponent,
          ),
      },
      {
        path: 'users',
        canActivate: [roleGuard('sys-admin', 'plat-admin')],
        loadComponent: () =>
          import('./dashboard/users/users').then((m) => m.UsersComponent),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./dashboard/groups/groups').then((m) => m.GroupsComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./dashboard/settings/settings').then((m) => m.SettingsComponent),
      },
    ],
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./login/login').then((m) => m.LoginComponent),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
