import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

/** Header slot: "First Last" + Logout when signed in, a "Log in" link when not. */
@Component({
  selector: 'app-auth-menu',
  imports: [RouterLink],
  template: `
    @if (auth.isAuthenticated()) {
      <span class="auth-name">{{ fullName() }}</span>
      <button type="button" class="button" (click)="logout()">Logout</button>
    } @else {
      <a class="button" routerLink="/login">Log in</a>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
    }

    .auth-name {
      font-weight: 500;
    }
  `,
})
export class AuthMenu {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly fullName = computed(() => {
    const user = this.auth.user();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
