// guards/permission.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredPermission = route.data['permission'] as {module: number, action: number};
    
    if (!requiredPermission) {
      return true; // No permission required
    }

    if (this.authService.hasPermission(requiredPermission.module, requiredPermission.action)) {
      return true;
    }

    this.router.navigate(['/access-denied']);
    return false;
  }
}