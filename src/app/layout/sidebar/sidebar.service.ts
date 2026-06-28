import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouteInfo } from './sidebar.metadata';
import { AuthService } from '@core';
@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Get sidebar menu items from JSON file
   * @returns Observable<RouteInfo[]>
   */
  getRouteInfo(): Observable<RouteInfo[]> {
    // Assuming the JSON file is in the assets folder
    return this.http
      .get<{ routes: RouteInfo[] }>('assets/data/routes.json')
      .pipe( map(response => this.filterMenuItems(response.routes)));
  }
  private filterMenuItems(menuItems: RouteInfo[]): RouteInfo[] {
    const rawRole = this.authService.getDecodeToken()?.role || '';
    const userRoles = (Array.isArray(rawRole) ? rawRole : [rawRole]).map((r: string) => String(r).toLowerCase());

    return menuItems.filter(item => {
      // Role check — case-insensitive
      const hasRoleAccess = !item.role || item.role.length === 0 ||
                          item.role.some((role: string) => userRoles.includes(String(role).toLowerCase()));
      
      // Permission check
      return hasRoleAccess;
    }).map(item => {
      const filteredItem = {...item};
      if (filteredItem.submenu?.length > 0) {
        filteredItem.submenu = this.filterMenuItems(filteredItem.submenu);
      }
      return filteredItem;
    }).filter(item => {
      return !(item.submenu && item.submenu.length === 0 && item.class === 'menu-toggle');
    });
  }
}
