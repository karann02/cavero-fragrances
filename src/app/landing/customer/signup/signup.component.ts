import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CaveroService } from '../../../../themes/cavero/services/cavero.service';
import { AuthService } from '../../../core/service/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignUpComponent implements OnInit, AfterViewInit, OnDestroy {

  signUpForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  submitted = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  private themeLink?: HTMLLinkElement;
  private iconLink?: HTMLLinkElement;
  private scriptsLoaded = false;

  constructor(
    private fb: FormBuilder,
    private caveroService: CaveroService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.signUpForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      referralCode: [''],
      savePassword: [false],
      privacyPolicy: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.signUpForm.controls; }

  ngOnInit(): void {
    this.loadCaveroAssets();

    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnUserType();
    }

    // Pre-fill referral code from ?ref= query param
    this.route.queryParams.subscribe(params => {
      const ref = params['ref'];
      if (ref) {
        this.signUpForm.patchValue({ referralCode: ref.toUpperCase() });
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeWhenReady();
  }

  ngOnDestroy(): void {
    this.removeDynamicAssets();
  }

  // Custom validator for password match
  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.signUpForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;

    // Prepare user data
    const refCode = String(this.signUpForm.value.referralCode || '').trim().toUpperCase();
    const userData: any = {
      name: this.signUpForm.value.name,
      phone: this.normalizePhone(this.signUpForm.value.phone),
      email: this.signUpForm.value.email,
      password: this.signUpForm.value.password,
      user_type: 'customer'
    };
    if (refCode) userData['referred_by_code'] = refCode;
    this.authService.signUp(userData).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.success) {
          this.successMessage = response.message || 'Account created successfully!';
          // Auto login after successful signup
          if (response.token && response.user) {
            setTimeout(() => {
              this.redirectBasedOnUserType();
            }, 2000);
          } else {
            // Redirect to login page
            setTimeout(() => {
              this.router.navigate(['/signin']);
            }, 2000);
          }
        } else {
          this.errorMessage = response.message || 'Registration failed. Please try again.';
        }
      },
      error: (error: any) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'An error occurred. Please try again.';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private redirectBasedOnUserType(): void {
    const user = this.authService.getCurrentUser();
    if (user?.user_type === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/']);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.signUpForm.controls).forEach(key => {
      const control = this.signUpForm.get(key);
      control?.markAsTouched();
    });
  }

  private normalizePhone(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '').trim();
  }

  // ... rest of the methods (loadCaveroAssets, etc.) remain the same as in signin
  private loadCaveroAssets(): void {
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

