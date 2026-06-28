import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root',
})
export class CustomerAuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.authService.getDecodeToken();
    if (!token) {
      this.router.navigate(['/signin'], { replaceUrl: true });
      return false;
    }

    const role = String(token.role || '').toLowerCase();
    const isSuperuser = role === 'superuser' || role === 'admin';
    if (isSuperuser) {
      this.router.navigate(['/siteadmin/dashboard'], { replaceUrl: true });
      return false;
    }

    return true;
  }
}
