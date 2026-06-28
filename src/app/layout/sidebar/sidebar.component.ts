/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Router,
  NavigationEnd,
  RouterLinkActive,
  RouterLink,
} from '@angular/router';
import { DOCUMENT, NgClass } from '@angular/common';
import {
  Component,
  Inject,
  ElementRef,
  OnInit,
  Renderer2,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { RouteInfo } from './sidebar.metadata';
import { AuthService, Role } from '@core';
import { TranslateModule } from '@ngx-translate/core';
import { NgScrollbar } from 'ngx-scrollbar';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { SidebarService } from './sidebar.service';
import { DashboardService } from 'app/siteadmin/dashboard/dashboard.service';
import { environment } from 'environments/environment';
@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    imports: [
        NgScrollbar,
        RouterLinkActive,
        RouterLink,
        NgClass,
        TranslateModule
    ]
})
export class SidebarComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit, OnDestroy
{
  private readonly brandAdminLogo = 'assets/images/cavero-logo.png';
  isBrandUserLogo = false;
  public sidebarItems!: RouteInfo[];
  public innerHeight?: number;
  public bodyTag!: HTMLElement;
  listMaxHeight?: string;
  listMaxWidth?: string;
  userFullName?: string;
  userImg?: string;
  userType?: string;
  headerHeight = 60;
  currentRoute?: string;
  token: any;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    public elementRef: ElementRef,
    private authService: AuthService,
    private router: Router,
    private sidebarService: SidebarService,
    private dashboardService: DashboardService,
  ) {
    super();
    this.elementRef.nativeElement.closest('body');
    this.subs.sink = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // close sidebar on mobile screen after menu select
        this.renderer.removeClass(this.document.body, 'overlay-open');
      }
    });
  }
  @HostListener('window:resize', ['$event'])
  windowResizecall() {
    this.setMenuHeight();
    this.checkStatuForResize(false);
  }
  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.renderer.removeClass(this.document.body, 'overlay-open');
    }
  }

  callToggleMenu(event: Event, length: number) {
    console.log("event",event)
    if (length > 0) {
      const parentElement = (event.target as HTMLInputElement).closest('li');
      const activeClass = parentElement?.classList.contains('active');

      if (activeClass) {
        this.renderer.removeClass(parentElement, 'active');
      } else {
        this.renderer.addClass(parentElement, 'active');
      }
    }
  }
  ngOnInit() {
    this.token = this.authService.getDecodeToken();
    console.log('this.token',this.token)
    if (this.token) {
      this.userFullName = this.token.username;
      const showBrandLogo = ['superuser', 'admin'].includes(
        String(this.token?.role || '').toLowerCase()
      );
      this.isBrandUserLogo = showBrandLogo;
      if (showBrandLogo) {
        this.userImg = this.brandAdminLogo;
      } else if (this.token?.img) {
        if(this.token.role == 'Admin'){
          this.userImg = `${environment.apiGatewayBaseUrl}/uploads/user_profile/${this.token.img}`;
        }else{
          this.userImg = `${environment.apiGatewayBaseUrl}/uploads/user/${this.token.img}`;
        }
        
      } else {
        this.userImg = 'assets/images/default-patient.png'; // fallback image
      }
      
      this.subs.sink = this.sidebarService
        .getRouteInfo()
        .subscribe((routes: RouteInfo[]) => {
          this.sidebarItems = routes;
          this.injectLowStockBadge();
        
          console.log("this.sidebarItems",this.sidebarItems);
          this.sidebarItems.forEach((item: any) => {
            if (item.path?.includes(':id')) {
              if(this.token.role == 'Patient'){
                item.path = item.path.replace(':id', this.token.patient_id);
              }else{
                item.path = item.path.replace(':id', this.token.employee_id);
              }
             
            }
            if (item.submenu && item.submenu.length > 0) {
              item.submenu.forEach((sub: any) => {
                if (sub.path?.includes(':id')) {
                  if(this.token.role == 'Patient'){
                    sub.path = sub.path.replace(':id', this.token.patient_id);
                  }else{
                    sub.path = sub.path.replace(':id', this.token.employee_id);
                  }
                  
                }
              });
            }
          });
        });

        const userRole = this.token.role;
      if (userRole === Role.Admin) {
        this.userType = Role.Admin;
      } else if (userRole === Role.Patient) {
        this.userType = Role.Patient;
      } else if (userRole === Role.Doctor) {
        this.userType = Role.Doctor;
      }else if (userRole === Role.Nurse) {
        this.userType = Role.Nurse;
      } else if(userRole === Role.HR){
        this.userType = Role.HR;
      } else {
        this.userType = userRole;
      }
      
    }

    // this.sidebarItems = ROUTES.filter((sidebarItem) => sidebarItem);
    this.initLeftSidebar();
    this.bodyTag = this.document.body;
  }
  injectLowStockBadge() {
    this.dashboardService.getLiveCounts().subscribe({
      next: (counts) => {
        if (counts.lowStock > 0) {
          const inventoryItem = this.sidebarItems.find((item: any) => item.path === '/siteadmin/inventory');
          if (inventoryItem) {
            (inventoryItem as any).badge = String(counts.lowStock);
            (inventoryItem as any).badgeClass = 'low-stock-badge';
          }
        }
      }
    });
  }

  initLeftSidebar() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    // Set menu height
    _this.setMenuHeight();
    _this.checkStatuForResize(true);
  }
  setMenuHeight() {
    this.innerHeight = window.innerHeight;
    const height = this.innerHeight - this.headerHeight;
    this.listMaxHeight = height + '';
    this.listMaxWidth = '500px';
  }
  isOpen() {
    return this.bodyTag.classList.contains('overlay-open');
  }

  checkStatuForResize(firstTime: boolean) {
    if (window.innerWidth < 1025) {
      this.renderer.addClass(this.document.body, 'ls-closed');
    } else {
      this.renderer.removeClass(this.document.body, 'ls-closed');
    }
  }
  mouseHover() {
    const body = this.elementRef.nativeElement.closest('body');
    if (body.classList.contains('submenu-closed')) {
      this.renderer.addClass(this.document.body, 'side-closed-hover');
      this.renderer.removeClass(this.document.body, 'submenu-closed');
    }
  }
  mouseOut() {
    const body = this.elementRef.nativeElement.closest('body');
    if (body.classList.contains('side-closed-hover')) {
      this.renderer.removeClass(this.document.body, 'side-closed-hover');
      this.renderer.addClass(this.document.body, 'submenu-closed');
    }
  }
  logout() {
     this.subs.sink = this.authService.logout().subscribe((res) => {
       if (!res.success) {
         this.router.navigate(['/signin']);
       }
     });
  }
}
