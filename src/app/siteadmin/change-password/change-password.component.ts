import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@core';
import { environment } from 'environments/environment';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const np = group.get('newPassword')?.value;
  const cp = group.get('confirmPassword')?.value;
  return np && cp && np !== cp ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <section class="content">
      <div class="content-block" style="padding-top:24px;max-width:520px;margin:0 auto">
        <div class="card" style="border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#4FA28E,#1A322D);padding:24px 28px;border-bottom:1px solid rgba(159,227,197,0.18)">
            <h2 style="margin:0;color:#fff;font-size:1.2rem;font-weight:700">
              <mat-icon style="vertical-align:middle;margin-right:8px">lock_reset</mat-icon>
              Change Password
            </h2>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px">Update your admin account password</p>
          </div>

          <div style="padding:28px">
            <form [formGroup]="form" (ngSubmit)="submit()">

              <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px">
                <mat-label>Current Password</mat-label>
                <input matInput [type]="showCurrent ? 'text' : 'password'" formControlName="currentPassword" autocomplete="current-password">
                <button mat-icon-button matSuffix type="button" (click)="showCurrent = !showCurrent">
                  <mat-icon>{{ showCurrent ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (form.get('currentPassword')?.invalid && form.get('currentPassword')?.touched) {
                  <mat-error>Current password is required</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px">
                <mat-label>New Password</mat-label>
                <input matInput [type]="showNew ? 'text' : 'password'" formControlName="newPassword" autocomplete="new-password">
                <button mat-icon-button matSuffix type="button" (click)="showNew = !showNew">
                  <mat-icon>{{ showNew ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (form.get('newPassword')?.errors?.['required'] && form.get('newPassword')?.touched) {
                  <mat-error>New password is required</mat-error>
                }
                @if (form.get('newPassword')?.errors?.['minlength'] && form.get('newPassword')?.touched) {
                  <mat-error>Minimum 8 characters required</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%;margin-bottom:16px">
                <mat-label>Confirm New Password</mat-label>
                <input matInput [type]="showConfirm ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password">
                <button mat-icon-button matSuffix type="button" (click)="showConfirm = !showConfirm">
                  <mat-icon>{{ showConfirm ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (form.errors?.['mismatch'] && form.get('confirmPassword')?.touched) {
                  <mat-error>Passwords do not match</mat-error>
                }
              </mat-form-field>

              @if (errorMsg) {
                <div style="background:rgba(242,163,156,0.12);border:1px solid rgba(242,163,156,0.4);border-radius:10px;padding:12px 16px;margin-bottom:16px;color:#F2A39C;font-size:13px">
                  {{ errorMsg }}
                </div>
              }

              <button mat-raised-button type="submit" [disabled]="isLoading || form.invalid"
                style="width:100%;background:linear-gradient(135deg,#6FC3A6,#9FE3C5);color:#06231B;height:44px;font-size:15px;font-weight:600;border-radius:10px">
                @if (isLoading) {
                  <mat-spinner diameter="20" style="display:inline-block;vertical-align:middle;margin-right:8px"></mat-spinner>
                }
                {{ isLoading ? 'Updating...' : 'Update Password' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  `
})
export class ChangePasswordComponent {
  form: FormGroup;
  isLoading = false;
  errorMsg = '';
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      currentPassword:  ['', Validators.required],
      newPassword:      ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword:  ['', Validators.required],
    }, { validators: passwordsMatch });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading = true;
    this.errorMsg = '';
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const { currentPassword, newPassword } = this.form.value;

    this.http.put(`${environment.authApiBaseUrl}/user/change-password`, { currentPassword, newPassword }, { headers }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res?.success) {
          this.snackBar.open('Password updated successfully!', '', { duration: 3000, panelClass: 'snackbar-success' });
          this.form.reset();
        } else {
          this.errorMsg = res?.message || 'Failed to update password.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Current password is incorrect.';
      }
    });
  }
}
