import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CaveroService } from '../../../../themes/cavero/services/cavero.service';
import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss']
})
export class SignInComponent implements OnInit, AfterViewInit, OnDestroy {

  signInForm: FormGroup;
  showPassword = false;
  submitted = false;
  loading = false;
  errorMessage = '';

  private themeLink?: HTMLLinkElement;
  private iconLink?: HTMLLinkElement;
  private scriptsLoaded = false;

  constructor(
    private fb: FormBuilder,
    private caveroService: CaveroService,
    private authService: AuthService,
    private router: Router
  ) {
    this.signInForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.signInForm.controls; }

  ngOnInit(): void {
    this.loadCaveroAssets();

    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnUserType();
    }
  }

  ngAfterViewInit(): void {
    this.initializeWhenReady();
  }

  ngOnDestroy(): void {
    this.removeDynamicAssets();
  }
  private showSuccessNotification(message: string) {
    void message;
  }

  private showErrorNotification(message: string) {
    void message;
  }
  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.signInForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    this.authService.login({ ...this.signInForm.value, portal: 'frontend' }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const role = String(response?.user?.role || this.authService.getDecodeToken()?.role || '').toLowerCase();
          if (role === 'superuser' || role === 'admin') {
            this.authService.logout();
            this.errorMessage = 'Superuser accounts can only log in from the admin dashboard.';
            return;
          }
          this.showSuccessNotification('Brand updated successfully!');
          this.redirectBasedOnUserType();
        } else {
          this.showErrorNotification('Login failed. Please try again.');
          this.errorMessage = response.message || 'Login failed. Please try again.';
        }
      },
      error: (error) => {
        const statusCode = Number(error?.status ?? error?.error?.status ?? 0);
        const errorText = String(error?.error?.message || error?.message || error || '').toLowerCase();
        const isForbidden = statusCode === 403 || errorText.includes('forbidden') || errorText.includes('superuser');

        if (isForbidden) {
          this.tryAdminPortalLogin();
          return;
        }

        this.loading = false;
        if (error.status === 0) {
          this.errorMessage = 'Cannot reach server. Please try again later.';
        } else {
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
        }
      }
    });
  }

  private tryAdminPortalLogin(): void {
    this.authService.login({ ...this.signInForm.value, portal: 'admin' }).subscribe({
      next: (response) => {
        this.loading = false;
        if (response?.success) {
          this.router.navigate(['/siteadmin/dashboard']);
          return;
        }
        this.errorMessage = response?.message || 'Admin login failed. Please use the admin login page.';
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Admin login failed. Please use the admin login page.';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private redirectBasedOnUserType(): void {
    const user = this.authService.getCurrentUser() || this.authService.getDecodeToken();
    const role = String(user?.role || user?.user_role || user?.user_type || '').toLowerCase();
    if (role === 'superuser' || role === 'admin') {
      this.router.navigate(['/siteadmin/dashboard']);
      return;
    }
    this.router.navigate(['/']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signInForm.controls).forEach(key => {
      const control = this.signInForm.get(key);
      control?.markAsTouched();
    });
  }

  // ... rest of the methods (loadCaveroAssets, etc.) remain the same
  private loadCaveroAssets(): void {
    // Cavero theme
    this.themeLink = document.createElement('link');
    this.themeLink.rel = 'stylesheet';
    this.themeLink.href = 'assets/cavero/css/theme.min.css';
    document.head.appendChild(this.themeLink);

    this.iconLink = document.createElement('link');
    this.iconLink.rel = 'stylesheet';
    this.iconLink.href = 'assets/cavero/icons/cavero-icons.min.css';
    document.head.appendChild(this.iconLink);

    this.loadJavaScriptAssets().then(() => {
      this.scriptsLoaded = true;
      this.initializeCavero();
    });
  }

  private loadJavaScriptAssets(): Promise<void> {
    return new Promise((resolve) => {
      const scriptsToLoad = [
        'assets/cavero/js/theme.min.js',
      ];

      this.loadScriptsSequentially(scriptsToLoad, resolve);
    });
  }

  private loadScriptsSequentially(scripts: string[], callback: () => void): void {
    let index = 0;

    const loadNextScript = () => {
      if (index >= scripts.length) {
        callback();
        return;
      }

      const script = document.createElement('script');
      script.src = scripts[index];
      script.onload = () => {
        index++;
        loadNextScript();
      };
      script.onerror = () => {
        index++;
        loadNextScript();
      };
      document.head.appendChild(script);
    };

    loadNextScript();
  }

  private initializeWhenReady(): void {
    const maxWaitTime = 5000;
    const startTime = Date.now();

    const checkAndInitialize = () => {
      if (this.scriptsLoaded) {
        this.initializeCavero();
        return;
      }

      if (Date.now() - startTime < maxWaitTime) {
        setTimeout(checkAndInitialize, 100);
      } else {
        this.initializeCavero();
      }
    };

    checkAndInitialize();
  }

  private initializeCavero(): void {
    setTimeout(() => {
      this.caveroService.initializeCavero();
      this.initializeFormValidation();
    }, 300);
  }

  private initializeFormValidation(): void {
    const forms = document.querySelectorAll('.needs-validation');
    forms.forEach((form: any) => {
      form.addEventListener('submit', (event: Event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add('was-validated');
      }, false);
    });
  }

  private removeDynamicAssets(): void {
    [this.themeLink, this.iconLink].forEach(asset => {
      if (asset && asset.parentNode) {
        asset.parentNode.removeChild(asset);
      }
    });
  }
}

