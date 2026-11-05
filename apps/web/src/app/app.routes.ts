import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';

/**
 * Lazy `loadComponent` throughout: the list is the only screen most sessions
 * touch, and the two form screens pull in @angular/forms.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'leads' },
  {
    path: 'login',
    title: 'Log in',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Create account',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/register/register').then((m) => m.Register),
  },
  {
    path: 'leads',
    title: 'Leads',
    canActivate: [authGuard],
    loadComponent: () => import('./leads/lead-list/lead-list').then((m) => m.LeadList),
  },
  {
    path: 'leads/new',
    title: 'New lead',
    canActivate: [authGuard],
    loadComponent: () => import('./leads/lead-form/lead-form').then((m) => m.LeadForm),
  },
  {
    path: 'leads/:id',
    title: 'Lead',
    canActivate: [authGuard],
    loadComponent: () => import('./leads/lead-detail/lead-detail').then((m) => m.LeadDetailPage),
  },
  {
    path: 'leads/:id/edit',
    title: 'Edit lead',
    canActivate: [authGuard],
    loadComponent: () => import('./leads/lead-form/lead-form').then((m) => m.LeadForm),
  },
  { path: '**', redirectTo: 'leads' },
];
