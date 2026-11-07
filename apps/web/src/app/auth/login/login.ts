import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessages } from '../../core/api-error';
import { safeReturnUrl } from '../../core/auth/auth.guards';
import { AuthService } from '../../core/auth/auth.service';
import { controlError, trimmedRequired } from '../../core/form-validation';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pending = signal(false);
  protected readonly errors = signal<string[]>([]);

  protected readonly form = new FormGroup({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.email],
    }),
    // No length rule: a short password is "Invalid credentials", not a policy hint.
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected get registerQuery(): { returnUrl?: string } {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl ? { returnUrl } : {};
  }

  protected submit(): void {
    if (this.pending()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errors.set(['Fix the highlighted fields before signing in.']);
      return;
    }

    this.errors.set([]);
    this.pending.set(true);

    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email.trim(), password }).subscribe({
      next: () => {
        this.pending.set(false);
        const target = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
        void this.router.navigateByUrl(target);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.errors.set(apiErrorMessages(error));
      },
    });
  }

  protected error(name: 'email' | 'password', label: string): string | null {
    return controlError(this.form.get(name), label);
  }
}
