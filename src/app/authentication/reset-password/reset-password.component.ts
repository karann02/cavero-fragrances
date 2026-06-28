import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/service/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['../forgot-password/forgot-password.component.scss', './reset-password.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
  ]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  private token = '';
  private redirectTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.resetForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });

    if (!this.token) {
      this.errorMessage = 'This reset link is missing or invalid. Please request a new password reset link.';
      this.resetForm.disable();
    }
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }

  get f() {
    return this.resetForm.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.resetForm.invalid || !this.token) {
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.resetForm.value.password).subscribe({
      next: (response) => {
        this.successMessage = response?.message || 'Password updated successfully. Please sign in with your new password.';
        this.loading = false;
        this.resetForm.disable();
        this.redirectTimer = setTimeout(() => this.router.navigate(['/signin']), 1800);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to reset your password. Please request a new link.';
        this.loading = false;
      }
    });
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}
