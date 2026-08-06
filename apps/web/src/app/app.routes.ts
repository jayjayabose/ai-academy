import { Routes } from '@angular/router';

/**
 * Lazy `loadComponent` throughout: the list is the only screen most sessions
 * touch, and the two form screens pull in @angular/forms.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'leads' },
  {
    path: 'leads',
    title: 'Leads',
    loadComponent: () => import('./leads/lead-list/lead-list').then((m) => m.LeadList),
  },
  {
    path: 'leads/new',
    title: 'New lead',
    loadComponent: () => import('./leads/lead-form/lead-form').then((m) => m.LeadForm),
  },
  {
    path: 'leads/:id',
    title: 'Lead',
    loadComponent: () =>
      import('./leads/lead-detail/lead-detail').then((m) => m.LeadDetailPage),
  },
  {
    path: 'leads/:id/edit',
    title: 'Edit lead',
    loadComponent: () => import('./leads/lead-form/lead-form').then((m) => m.LeadForm),
  },
  { path: '**', redirectTo: 'leads' },
];
