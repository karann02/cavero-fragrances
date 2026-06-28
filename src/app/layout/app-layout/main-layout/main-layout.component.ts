import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { AuthService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { filter } from 'rxjs/operators';

interface NavItem { label: string; icon: string; path: string; badge?: number; }
interface NavGroup { group: string; items: NavItem[]; }
interface CmdItem { label: string; icon: string; path: string; cap: string; }

/**
 * Cavero Atelier — admin shell (built from scratch).
 * Floating grouped sidebar + sticky topbar + ⌘K command palette + mobile drawer.
 */
@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class MainLayoutComponent extends UnsubscribeOnDestroyAdapter implements OnInit, OnDestroy {
  readonly nav: NavGroup[] = [
    { group: 'Overview', items: [
      { label: 'Dashboard', icon: 'space_dashboard', path: '/siteadmin/dashboard' },
    ]},
    { group: 'Catalog', items: [
      { label: 'Products', icon: 'inventory_2', path: '/siteadmin/products' },
      { label: 'Inventory', icon: 'tune', path: '/siteadmin/inventory' },
      { label: 'Variant Types', icon: 'straighten', path: '/siteadmin/variant-types' },
      { label: 'Categories', icon: 'category', path: '/siteadmin/categories' },
      { label: 'Combos', icon: 'widgets', path: '/siteadmin/combo' },
    ]},
    { group: 'Sales', items: [
      { label: 'Orders', icon: 'shopping_bag', path: '/siteadmin/orders' },
      { label: 'Returns', icon: 'assignment_return', path: '/siteadmin/returns' },
      { label: 'Coupons', icon: 'local_offer', path: '/siteadmin/coupons' },
      { label: 'Free Gifts', icon: 'card_giftcard', path: '/siteadmin/freegifts' },
    ]},
    { group: 'People', items: [
      { label: 'Customers', icon: 'group', path: '/siteadmin/customers' },
      { label: 'Product Reviews', icon: 'rate_review', path: '/siteadmin/reviews' },
      { label: 'Support Tickets', icon: 'support_agent', path: '/siteadmin/support-tickets' },
    ]},
    { group: 'Storefront', items: [
      { label: 'Sliders', icon: 'view_carousel', path: '/siteadmin/sliders' },
      { label: 'Influencer Reels', icon: 'video_library', path: '/siteadmin/influencer-reels' },
      { label: 'CMS Pages', icon: 'article', path: '/siteadmin/cms-pages' },
    ]},
    { group: 'Settings', items: [
      { label: 'Logo', icon: 'image', path: '/siteadmin/logo' },
      { label: 'Contact Settings', icon: 'contact_page', path: '/siteadmin/contact-settings' },
      { label: 'Change Password', icon: 'lock_reset', path: '/siteadmin/change-password' },
    ]},
  ];

  /** flattened destinations for the command palette */
  readonly cmdAll: CmdItem[] = this.nav.flatMap(g => g.items.map(i => ({ ...i, cap: g.group })));

  railOpen = false;
  paletteOpen = false;
  query = '';
  selIndex = 0;
  pageTitle = 'Dashboard';
  pageGroup = 'Overview';
  animOn = true;

  constructor(private auth: AuthService, private router: Router) {
    super();
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animOn = !reduce && !(navigator as any).webdriver;
  }

  ngOnInit(): void {
    this.syncTitle(this.router.url);
    this.subs.sink = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => { this.syncTitle(e.urlAfterRedirects); this.railOpen = false; });

    this.subs.sink = this.auth.logoutEvent$.subscribe(() => this.router.navigate(['/signin']));
  }

  private syncTitle(url: string): void {
    const hit = this.cmdAll.find(i => url.startsWith(i.path));
    if (hit) { this.pageTitle = hit.label; this.pageGroup = hit.cap; }
  }

  // ---- current user -------------------------------------------------------
  get user(): any { return this.auth.getCurrentUser() || {}; }
  get userName(): string { return this.user?.name || this.user?.email || 'Admin'; }
  get userRole(): string { return this.user?.role || 'Superuser'; }
  get initials(): string {
    const n = (this.userName || 'A').trim().split(/\s+/);
    return ((n[0]?.[0] || '') + (n[1]?.[0] || '')).toUpperCase() || 'A';
  }

  // ---- command palette ----------------------------------------------------
  get filtered(): CmdItem[] {
    const q = this.query.trim().toLowerCase();
    if (!q) return this.cmdAll;
    return this.cmdAll.filter(i => i.label.toLowerCase().includes(q) || i.cap.toLowerCase().includes(q));
  }

  openPalette(): void { this.paletteOpen = true; this.query = ''; this.selIndex = 0; }
  closePalette(): void { this.paletteOpen = false; }
  go(item: CmdItem | NavItem): void { this.router.navigate([item.path]); this.closePalette(); }

  onPaletteKey(e: KeyboardEvent): void {
    const list = this.filtered;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.selIndex = Math.min(this.selIndex + 1, list.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.selIndex = Math.max(this.selIndex - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); if (list[this.selIndex]) this.go(list[this.selIndex]); }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); this.paletteOpen ? this.closePalette() : this.openPalette(); }
    else if (e.key === 'Escape' && this.paletteOpen) { this.closePalette(); }
  }

  toggleRail(): void { this.railOpen = !this.railOpen; }
  refresh(): void { window.location.reload(); }
  logout(): void { this.auth.logout(); this.router.navigate(['/signin']); }
}
