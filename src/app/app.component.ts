
import { Component } from '@angular/core';
import { Event, Router, NavigationStart, NavigationEnd, RouterModule } from '@angular/router';
import { PageLoaderComponent } from './layout/page-loader/page-loader.component';
import { PermissionService } from './core/service/permission.service';
import { InternetMonitorService } from './core/service/internet-monitor.service';
import { SeoService } from './core/service/seo.service';
import { CommonModule } from '@angular/common';
import { ScrollTopButtonComponent } from './shared/components/scroll-top-button/scroll-top-button.component';
import { MotionService } from './core/services/motion.service';
@Component({
    selector: 'app-root',
    imports: [
        RouterModule,
        PageLoaderComponent,
        CommonModule,
        ScrollTopButtonComponent
    ],
    providers: [],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isOnline = true;
  currentUrl!: string;
  constructor(
    private InternetMonitorService: InternetMonitorService,
    public _router: Router,
    private PermissionService: PermissionService,
    private seoService: SeoService,
    private motion: MotionService
  ) {
    this._router.events.subscribe((routerEvent: Event) => {
      if (routerEvent instanceof NavigationStart) {
        this.currentUrl = routerEvent.url.substring(
          routerEvent.url.lastIndexOf('/') + 1
        );
        this.releaseUiLocks();
      }
      if (routerEvent instanceof NavigationEnd) {
        this.seoService.applyRouteSeo(this._router.routerState.root, routerEvent.urlAfterRedirects);
        setTimeout(() => this.releaseUiLocks(), 0);
      }
      this.motion.scrollToTop(true);
    });
    this.InternetMonitorService.isOnline$.subscribe((status: boolean) => {
      this.isOnline = status;
    });
  }
  ngOnInit(): void {
    this.PermissionService.load();
    this.seoService.applyRouteSeo(this._router.routerState.root, this._router.url);
    this.releaseUiLocks();

    // Project-wide: when a number input is focused, select its value so typing
    // overwrites the default "0" (prevents leading-zero like "04345"). The
    // setTimeout lets the browser finish its native focus handling first
    // (an inline (focus)="select()" fired too early to take effect).
    document.addEventListener('focusin', (e) => {
      const el = (e.target as HTMLElement | null);
      if (el instanceof HTMLInputElement) {
        // search / data fields shouldn't show the browser's red spellcheck squiggle
        if (el.type !== 'password' && el.type !== 'email') {
          el.setAttribute('spellcheck', 'false');
          el.setAttribute('autocomplete', el.getAttribute('autocomplete') || 'off');
        }
        // number inputs: select on focus so typing replaces the default 0
        if (el.type === 'number') {
          setTimeout(() => { try { el.select(); } catch { /* noop */ } }, 0);
        }
      }
    });
    // Sitewide smooth scroll (single Lenis instance, reused by the homepage motion
    // scene). No-op under reduced-motion / automated browsers.
    this.motion.initSmoothScroll();
  }

  private releaseUiLocks(): void {
    const body = document.body;
    const bootstrap = (window as any).bootstrap;

    // Close active Bootstrap overlays using API to avoid internal state desync.
    if (bootstrap?.Offcanvas) {
      document.querySelectorAll('.offcanvas.show').forEach((el) => {
        const instance = bootstrap.Offcanvas.getInstance(el) || bootstrap.Offcanvas.getOrCreateInstance(el);
        instance.hide();
      });
    }
    if (bootstrap?.Modal) {
      document.querySelectorAll('.modal.show').forEach((el) => {
        const instance = bootstrap.Modal.getInstance(el) || bootstrap.Modal.getOrCreateInstance(el);
        instance.hide();
      });
    }

    // Always clear stale page locks on navigation transitions.
    body.classList.remove('modal-open');
    body.style.removeProperty('overflow');
    body.style.removeProperty('padding-right');
    body.style.removeProperty('pointer-events');
    body.removeAttribute('inert');
    body.removeAttribute('aria-hidden');

    // Remove stale backdrops / full-page overlays that can block header clicks.
    document
      .querySelectorAll('.modal-backdrop, .offcanvas-backdrop, .modal-overlay, .custom-confirm-overlay, .reel-modal-overlay')
      .forEach(el => el.remove());
  }
}
