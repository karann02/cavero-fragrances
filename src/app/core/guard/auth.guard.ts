import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { SidebarService } from 'app/layout/sidebar/sidebar.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router,
    private sidebarService: SidebarService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = this.authService.getDecodeToken();

    // Not logged in — redirect to admin signin if accessing admin routes, else customer signin
    if (!token) {
      const target = state.url.startsWith('/siteadmin') ? '/authentication/signin' : '/signin';
      this.router.navigate([target], { replaceUrl: true });
      return false;
    }

    const userRole: string = (token.role || '').toLowerCase();
    const isSuperuser = userRole === 'superuser' || userRole === 'admin';

    // Check if this route requires a specific role
    const requiredRoles: string[] = (route.data?.['role'] || []).map((r: string) => r.toLowerCase());

    if (requiredRoles.length > 0) {
      const hasRole = requiredRoles.some(r => r === userRole);
      if (!hasRole) {
        // Non-admin trying to access admin area — redirect to home
        this.router.navigate(['/'], { replaceUrl: true });
        return false;
      }
    }

    // Block any /siteadmin access for non-superusers as a safety net
    if (state.url.startsWith('/siteadmin') && !isSuperuser) {
      this.router.navigate(['/'], { replaceUrl: true });
      return false;
    }

    return true;
  }
}
