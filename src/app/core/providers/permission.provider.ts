// providers/permission.provider.ts
import { Injectable } from '@angular/core';
import { PermissionService } from '../service/permission.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionProvider {
  constructor(private permissionService: PermissionService) {}

  // get PERMISSIONS() {
  //   //return this.permissionService.getPermissions();
  // }
}