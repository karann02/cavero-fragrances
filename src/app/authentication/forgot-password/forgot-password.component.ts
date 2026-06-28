import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '@core/service/auth.service';
@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterLink,
    ]
})
export class ForgotPasswordComponent implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authForm = this.formBuilder.group({
      email: [
        '',
        [Validators.required, Validators.email, Validators.minLength(5)],
      ],
    });
  }

  get f() {
    return this.authForm.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.authForm.invalid) {
      return;
    }

    this.loading = true;
    this.authService.requestPasswordReset(this.authForm.value.email).subscribe({
      next: (response) => {
        this.successMessage = response?.message || 'If this email exists, a reset link has been sent.';
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Unable to send the reset link. Please try again.';
        this.loading = false;
      }
    });
  }
}
