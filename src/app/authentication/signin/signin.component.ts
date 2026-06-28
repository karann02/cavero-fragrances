import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { AuthService, Role } from '@core';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { environment } from 'environments/environment';

declare const google: any;
@Component({
    selector: 'app-signin',
    templateUrl: './signin.component.html',
    styleUrls: ['./signin.component.scss'],
    imports: [
        RouterLink,
        MatButtonModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
         CommonModule,          // ✅ fix for *ngIf and *ngFor
         ReactiveFormsModule,   // for formGroup, formControlName
         MatFormFieldModule,
         MatInputModule,
         MatIconModule,
        MatButtonModule
    ]
})
export class SigninComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  error = '';
  hide = true;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    super();
  }

  ngOnInit() {
    this.authForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });


    const token: any = this.authService.getDecodeToken();
    if(token != null && token != 'null')
      {
        if (token.role?.toLowerCase() === 'superuser') {
          this.router.navigate(['/siteadmin/dashboard']);
        } else {
          this.router.navigate(['/admin/dashboard/main']);
        }
      }
    
    // Initialize Google Sign-In
    this.initializeGoogleSignIn();
  }
  get f() {
    return this.authForm.controls;
  }
  adminSet() {
    this.router.navigate(['/admin/dashboard/main']);
  }
  doctorSet() {
 
  }
  patientSet() {
   
  }

onSubmit(data: any) {
  this.error = '';
  this.loading = true;
  this.authService.login({ ...data, portal: 'admin' }).subscribe({
    next: (res) => {
      this.loading = false;
      if (res.success) {
        this.authService.storeToken(res.token);
        const token: any = this.authService.getDecodeToken();
        this.redirectBasedOnRole(token.role);
      } else {
        this.error = res.message || 'Login failed';
      }
    },
    error: (err) => {
      this.loading = false;
      this.error = this.parseHttpError(err);
    }
  });
}

private parseHttpError(err: any): string {
  if (err.status === 0) return 'Cannot reach server. Please ensure the backend is running.';
  if (err.status === 401) return err.error?.message || 'Invalid email or password.';
  if (err.status === 403) return err.error?.message || 'Access denied.';
  if (err.status === 429) return 'Too many login attempts. Please wait a minute and try again.';
  return err.error?.message || 'Server error. Please try again later.';
}


private redirectBasedOnRole(role: string) {
  if (role?.toLowerCase() === 'superuser') {
    this.router.navigate(['/siteadmin/dashboard']);
  } else {
    this.router.navigate(['/admin/dashboard/main']);
  }
}

initializeGoogleSignIn() {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: this.handleGoogleSignIn.bind(this)
    });
    
    google.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      { 
        theme: 'outline', 
        size: 'large',
        width: '100%',
        text: 'signin_with'
      }
    );
  }
}

handleGoogleSignIn(response: any) {
  this.loading = true;
  this.error = '';
  
  this.authService.googleSignIn(response.credential).subscribe({
    next: (res) => {
      this.loading = false;
      if (res.success) {
        this.authService.storeToken(res.token);
        const token: any = this.authService.getDecodeToken();
        this.redirectBasedOnRole(token.role);
      } else {
        this.error = res.message || 'Google sign-in failed';
      }
    },
    error: () => {
      this.loading = false;
      this.error = 'Server error during Google sign-in';
    }
  });
}

}
 
