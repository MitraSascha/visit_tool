import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.Login)
  },
  {
    // Shell wraps ALL authenticated pages — navigation is always visible
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/contacts/contacts-shell/contacts-shell').then(
        m => m.ContactsShell
      ),
    children: [
      { path: '', redirectTo: 'contacts', pathMatch: 'full' },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./features/contacts/contacts-list/contacts-list').then(
            m => m.ContactsList
          )
      },
      {
        path: 'contacts/:id/edit',
        loadComponent: () =>
          import('./features/contact-detail/contact-edit/contact-edit').then(
            m => m.ContactEdit
          )
      },
      {
        path: 'contacts/:id/evaluate',
        loadComponent: () =>
          import('./features/evaluations/evaluation-form/evaluation-form').then(
            m => m.EvaluationForm
          )
      },
      {
        path: 'contacts/:id',
        loadComponent: () =>
          import('./features/contact-detail/contact-detail').then(
            m => m.ContactDetail
          )
      },
      {
        path: 'capture',
        loadComponent: () =>
          import('./features/capture/capture').then(m => m.Capture)
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/contact-detail/contact-edit/contact-edit').then(
            m => m.ContactEdit
          )
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./features/map-view/map-view').then(m => m.MapView)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'reminders',
        loadComponent: () =>
          import('./features/reminders/reminders').then(m => m.RemindersComponent)
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./features/projects/projects-list/projects-list').then(m => m.ProjectsList)
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./features/contact-groups/groups-list/groups-list').then(m => m.ContactGroupsList)
      },
      {
        path: 'activity-log',
        loadComponent: () =>
          import('./features/activity-log/activity-log').then(m => m.ActivityLogComponent)
      },
    ]
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found').then(m => m.NotFound)
  }
];
