import { Component, OnInit } from '@angular/core';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-permission-management',
  templateUrl: './permission-management.component.html',
  styleUrls: ['./permission-management.component.scss']
})
export class PermissionManagementComponent implements OnInit {
  roles: any[] = [];
  modules: any[] = [];
  selectedRoleId: number | null = null;
  rolePermissions: Set<number> = new Set();

  constructor(private permissionService: PermissionService) {}

  ngOnInit(): void {
    this.loadPermissionsMatrix();
  }

  loadPermissionsMatrix() {
    this.permissionService.getPermissionsMatrix().subscribe(data => {
      this.roles = data.roles;
      this.modules = data.modules;
      if (this.roles.length > 0) {
        this.selectRole(this.roles[0].id);
      }
    });
  }

  selectRole(roleId: number) {
    this.selectedRoleId = roleId;
    this.rolePermissions.clear();

    // Assuming role has permissions array with permission ids
    const role = this.roles.find(r => r.id === roleId);
    if (role && role.Permissions) {
      role.Permissions.forEach((p: any) => this.rolePermissions.add(p.id));
    }
  }

  isPermissionChecked(permissionId: number): boolean {
    return this.rolePermissions.has(permissionId);
  }

  togglePermission(permissionId: number) {
    if (this.rolePermissions.has(permissionId)) {
      this.rolePermissions.delete(permissionId);
    } else {
      this.rolePermissions.add(permissionId);
    }
  }

  savePermissions() {
    if (this.selectedRoleId === null) return;

    this.permissionService.updateRolePermissions(this.selectedRoleId, Array.from(this.rolePermissions))
      .subscribe(() => {
        alert('Permissions updated successfully');
        this.loadPermissionsMatrix();
      }, error => {
        alert('Failed to update permissions');
      });
  }
}
