import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessages } from '../../core/api-error';
import { safeReturnUrl } from '../../core/auth/auth.guards';
import { AuthService } from '../../core/auth/auth.service';
import { controlError, trimmedRequired } from '../../core/form-validation';

/** Mirrors RegisterDto: the API is the authority, this only saves a round trip. */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

type RegisterField = 'firstName' | 'lastName' | 'email' | 'password';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly pending = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly passwordMin = PASSWORD_MIN;

  protected readonly form = new FormGroup({
    firstName: new FormControl<string>('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.maxLength(100)],
    }),
    lastName: new FormControl<string>('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.maxLength(100)],
    }),
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [trimmedRequired, Validators.email, Validators.maxLength(255)],
    }),
    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(PASSWORD_MIN),
        Validators.maxLength(PASSWORD_MAX),
      ],
    }),
  });

  protected get loginQuery(): { returnUrl?: string } {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl ? { returnUrl } : {};
  }

  protected submit(): void {
    if (this.pending()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errors.set(['Fix the highlighted fields before creating your account.']);
      return;
    }

    this.errors.set([]);
    this.pending.set(true);

    const value = this.form.getRawValue();
    this.auth
      .register({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
        password: value.password,
      })
      .subscribe({
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

  protected error(name: RegisterField, label: string): string | null {
    return controlError(this.form.get(name), label);
  }
}
