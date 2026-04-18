import { Routes } from '@angular/router';

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
        path: 'users',
        loadComponent: () =>
          import('./dashboard/users/users').then((m) => m.UsersComponent),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./dashboard/groups/groups').then((m) => m.GroupsComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
