import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/service/auth.service';

@Component({
  selector: 'app-page404',
  template: '',
})
export class Page404Component implements OnInit {
  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const token = this.authService.getDecodeToken();
    const isLoggedIn = !!token;
    const currentUrl = this.router.url;
    const isAdminRoute = currentUrl.startsWith('/siteadmin');

    if (isAdminRoute) {
      // Admin area — always go to dashboard
      this.router.navigate(['/siteadmin/dashboard'], { replaceUrl: true });
    } else if (isLoggedIn) {
      // Logged-in frontend user — go to home
      this.router.navigate(['/'], { replaceUrl: true });
    } else {
      // Guest — go to sign in
      this.router.navigate(['/signin'], { replaceUrl: true });
    }
  }
}
