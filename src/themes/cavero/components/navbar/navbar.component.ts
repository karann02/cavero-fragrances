import {
  Component, OnInit, OnDestroy, ElementRef, ChangeDetectorRef, HostListener, Input,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, finalize } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { getSeoRouteParam } from '../../../../app/shared/utils/seo-url.util';
import { HeaderService } from '../header/header.service';

interface SearchSuggestion { id: number; name: string; slug?: string; price: number; image: string; }

/**
 * CaveroNavbarComponent — the CoLabs-style cream-pill navbar (logo · links · search/
 * wishlist/account/cart + Lordicon animated icons + Shop dropdown + mobile menu).
 * Extracted from the hero-slider so it can be reused on inner pages.
 *
 * variant:
 *   'overlay' — position:absolute, floats over a hero (homepage masthead).
 *   'solid'   — in-flow dark top bar (inner pages like the catalog).
 */
@Component({
  selector: 'app-cavero-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],   // allow the <lord-icon> custom element
})
export class CaveroNavbarComponent implements OnInit, OnDestroy {
  @Input() variant: 'overlay' | 'solid' = 'overlay';

  categories: { name: string; slug?: string; id?: any }[] = [];
  shopOpen = false;
  mobileOpen = false;

  /** storefront logo — admin-managed (Settings → Logo), falls back to the bundled asset */
  logoSrc = 'assets/images/cavero-logo.png';

  cartCount = 0;
  isLoggedIn = false;
  searchOpen = false;
  searchQuery = '';

  // ── Advanced real-time search ───────────────────────────────────────────────
  suggestions: SearchSuggestion[] = [];
  showSuggestions = false;
  searchLoading = false;
  private searchSubject = new Subject<string>();
  private searchCache = new Map<string, SearchSuggestion[]>();   // client-side cache
  private readonly SEARCH_URL = `${environment.authApiBaseUrl}/categoryproducts`;
  private readonly FALLBACK = 'assets/images/cavero-logo.png';

  private subs = new Subscription();
  private readonly CATEGORIES_URL = `${environment.apiGatewayBaseUrl}/api/auth/categories/menu`;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private elRef: ElementRef,
    private headerService: HeaderService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadLogo();
    this.subs.add(this.headerService.cart$.subscribe((c: any) => {
      this.cartCount = Number(c?.total_items) || 0;
      this.cdr.detectChanges();
    }));
    this.subs.add(this.headerService.user$.subscribe((u: any) => {
      this.isLoggedIn = !!u?.is_logged_in;
      this.cdr.detectChanges();
    }));

    // Real-time search: debounce → distinctUntilChanged → switchMap (+ client-side cache)
    this.subs.add(
      this.searchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((raw) => {
          const key = raw.trim().toLowerCase();
          if (key.length < 2) { this.applySuggestions([]); return of(null); }
          if (this.searchCache.has(key)) { this.applySuggestions(this.searchCache.get(key)!); return of(null); }
          this.searchLoading = true;
          this.cdr.detectChanges();
          const params = new HttpParams().set('search', raw).set('limit', '6');
          return this.http.get<any>(this.SEARCH_URL, { params }).pipe(
            catchError(() => of(null)),
            finalize(() => { this.searchLoading = false; this.cdr.detectChanges(); })
          );
        })
      ).subscribe((res) => {
        if (res === null) return;                       // cache hit / too-short / error already handled
        const data: any[] = res?.success && Array.isArray(res.data) ? res.data : [];
        const mapped: SearchSuggestion[] = data.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug || '',
          price: parseFloat(p.price),
          image: this.resolveImg(p),
        }));
        this.searchCache.set(this.searchQuery.trim().toLowerCase(), mapped);
        this.applySuggestions(mapped);
      })
    );
  }

  private loadCategories(): void {
    this.http.get<any>(this.CATEGORIES_URL).subscribe({
      next: (res) => {
        const data: any[] = res?.success && Array.isArray(res.data) ? res.data : [];
        this.categories = data
          .filter((c: any) => {
            const active = c?.status === true || c?.status === 1 || c?.status === '1' || c?.status === 'true';
            return active && Number(c?.sort_order ?? 0) !== 0;
          })
          .map((c: any) => ({ name: c?.name, slug: c?.slug, id: c?.id }));
        this.cdr.detectChanges();
      },
      error: () => { this.categories = []; },
    });
  }

  private loadLogo(): void {
    this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/logo-settings`).subscribe({
      next: (res) => {
        const url = res?.data?.logo_url;
        if (url) {
          this.logoSrc = `${environment.apiGatewayBaseUrl}${url}`;
          this.cdr.detectChanges();
        }
      },
      error: () => { /* keep bundled fallback */ },
    });
  }

  getCategoryRouteParam(category: any): string {
    return getSeoRouteParam(category);
  }

  toggleShop(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.shopOpen = !this.shopOpen;
  }

  toggleMobile(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.mobileOpen = !this.mobileOpen;
  }

  closeMenus(): void {
    this.shopOpen = false;
    this.mobileOpen = false;
    this.searchOpen = false;
    this.showSuggestions = false;
  }

  // ── Advanced search helpers ─────────────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  private applySuggestions(list: SearchSuggestion[]): void {
    this.suggestions = list;
    this.showSuggestions = list.length > 0;
    this.cdr.detectChanges();
  }

  selectSuggestion(s: SearchSuggestion): void {
    this.showSuggestions = false;
    this.searchQuery = '';
    this.router.navigate(['/product', getSeoRouteParam(s)]);
    this.closeMenus();
  }

  onImgError(e: Event): void {
    const img = e.target as HTMLImageElement;
    if (img && img.src.indexOf(this.FALLBACK) === -1) img.src = this.FALLBACK;
  }

  private resolveImg(p: any): string {
    const img = p?.images?.[0];
    if (!img) return this.FALLBACK;
    const direct = img.url || img.secure_url || img.path;
    if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) return direct;
    if (img.filename) return `${environment.apiGatewayBaseUrl}/uploads/products/${img.filename}`;
    const url = img.url || '';
    if (!url) return this.FALLBACK;
    return url.startsWith('/uploads/') ? `${environment.apiGatewayBaseUrl}${url}` : url;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (!this.elRef.nativeElement.contains(e.target)) this.closeMenus();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.closeMenus(); }

  toggleSearch(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) return;
    setTimeout(() => {
      const input = this.elRef.nativeElement.querySelector('.cvr-search-input') as HTMLInputElement | null;
      input?.focus();
    }, 60);
  }

  submitSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    this.router.navigate(['/shop'], { queryParams: { search: q } });
    this.searchQuery = '';
    this.closeMenus();
  }

  goAccount(): void {
    this.router.navigate([this.isLoggedIn ? '/profile' : '/signin']);
    this.closeMenus();
  }

  goWishlist(): void {
    this.router.navigateByUrl('/profile#wishlist');
    this.closeMenus();
  }

  goCart(): void {
    this.router.navigate(['/cart']);
    this.closeMenus();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
