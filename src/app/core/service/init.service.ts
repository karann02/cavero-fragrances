// services/init.service.ts
import { Injectable } from '@angular/core';
import { PermissionService } from './permission.service';

@Injectable({
  providedIn: 'root'
})
export class InitService {
  constructor(private permissionService: PermissionService) {}

  initApp() {
    return this.permissionService.loadPermissions().toPromise();
  }
}