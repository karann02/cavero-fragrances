import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnimateOnScrollDirective } from '../../../../app/core/directives/animate-on-scroll.directive';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { getSeoRouteParam } from '../../../../app/shared/utils/seo-url.util';

interface FeaturedCategory {
  id: number | string;
  name: string;
  slug?: string;
  image_url?: string | null;
  description?: string | null;
  product_count?: number | string | null;
  total_products?: number | string | null;
  products_count?: number | string | null;
  count?: number | string | null;
  products?: any[];
  sort_order?: number | string | null;
  is_featured?: boolean | number | string;
  status?: boolean | number | string;
}

interface FeaturedCategoryCard {
  id: number | string;
  title: string;
  description: string;
  count: number;
  image: string;
  link: string;
}

/** A single rotating slot — either the Combos slide or a category. */
interface ShowcaseItem {
  type: 'combo' | 'category';
  id: string;
  title: string;
  description: string;
  count: number;
  image: string;
  link: string;
  ctaLabel: string;
  subtitle: string;
}

@Component({
  selector: 'app-cavero-featured-categories',
  standalone: true,
  imports: [CommonModule, RouterModule, AnimateOnScrollDirective],
  templateUrl: './featured-categories.component.html',
  styleUrls: ['./featured-categories.component.scss'],
})
export class CaveroFeaturedCategoriesComponent implements OnInit, OnDestroy {
  featuredCategories: FeaturedCategoryCard[] = [];
  loading = true;

  /** The full rotating set: [intro, ...categories]. */
  items: ShowcaseItem[] = [];
  /** Cards rendered in the sliding right-hand row (length === items.length). */
  trackItems: ShowcaseItem[] = [];
  /** Number of small cards visible at once (= items.length - 1). */
  visibleCount = 0;

  /** Current featured (slot 0) content; during a swap the outgoing one too. */
  featIn: ShowcaseItem | null = null;
  featOut: ShowcaseItem | null = null;

  /** Live transform applied to the track, in px. */
  trackShift = 0;
  /** True only while a 1.3s slide is in flight — adds the CSS transition. */
  animating = false;
  /** OS "reduce motion" / headless → fully static, no rotation. */
  prefersReducedMotion = false;

  @ViewChild('symphonyTrack') trackRef?: ElementRef<HTMLElement>;

  private rotation = 0;
  private autoTimer: any = null;
  private slideTimer: any = null;
  private readonly INTERVAL_MS = 4500;
  private readonly SLIDE_MS = 1300;

  private readonly comboItem: ShowcaseItem = {
    type: 'combo',
    id: 'combo-showcase',
    title: 'Combos',
    description:
      'Curated value sets — pair our finest ouds and attars at a special price. ' +
      'Hand-picked combinations crafted for gifting and everyday indulgence.',
    count: 0,
    image: 'assets/images/combo-showcase.png',
    link: '/combo',
    ctaLabel: 'Shop Combos',
    subtitle: 'Curated Value Sets',
  };

  constructor(private http: HttpClient, private zone: NgZone) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.prefersReducedMotion =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !!(navigator as any).webdriver;
    }
    this.loadFeaturedCategories();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    if (this.slideTimer) clearTimeout(this.slideTimer);
  }

  getProductCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'product' : 'products'}`;
  }

  trackById(_: number, category: FeaturedCategoryCard): string {
    return String(category.id);
  }

  /** trackBy index keeps the n card nodes fixed so only the transform moves. */
  trackBySlot(index: number): number {
    return index;
  }

  /** Build the rotating set once categories have loaded, then start the loop. */
  private buildShowcase(categories: FeaturedCategoryCard[]): void {
    const categoryItems: ShowcaseItem[] = categories.map((cat) => ({
      type: 'category',
      id: String(cat.id),
      title: cat.title,
      description: cat.description?.trim()
        ? cat.description.trim()
        : `Discover our curated ${cat.title} collection — a hand-picked edit of Cavero scents.`,
      count: cat.count,
      image: cat.image,
      link: cat.link,
      ctaLabel: `Shop ${cat.title}`,
      subtitle: this.getProductCountLabel(cat.count),
    }));

    this.items = [this.comboItem, ...categoryItems];
    this.visibleCount = Math.max(this.items.length - 1, 1);
    this.rotation = 0;
    this.featIn = this.items[0];
    this.featOut = null;
    this.trackShift = 0;
    this.animating = false;
    this.recomputeTrack();
    this.startAutoplay();
  }

  /** Right-row cards for the current rotation: the n-1 non-featured items
   *  followed by the current featured (pre-rendered, off-screen right). */
  private recomputeTrack(): void {
    const n = this.items.length;
    if (n === 0) {
      this.trackItems = [];
      return;
    }
    const out: ShowcaseItem[] = [];
    for (let j = 0; j < n; j++) {
      out.push(this.items[(this.rotation + 1 + j) % n]);
    }
    this.trackItems = out;
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    if (this.prefersReducedMotion || this.items.length < 2) return;
    this.zone.runOutsideAngular(() => {
      this.autoTimer = setInterval(() => this.zone.run(() => this.advance()), this.INTERVAL_MS);
    });
  }

  private stopAutoplay(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  /** One rotation step: slide the row left by a slot + cross-fade the featured. */
  private advance(): void {
    const n = this.items.length;
    if (this.animating || this.prefersReducedMotion || n < 2) return;

    const slot = this.measureSlot();
    if (slot <= 0) return; // not laid out yet — skip this tick

    // Cross-fade featured: current content slides out, the incoming one in.
    this.featOut = this.items[this.rotation % n];
    this.featIn = this.items[(this.rotation + 1) % n];

    // Slide the whole row one slot to the left.
    this.animating = true;
    this.trackShift = -slot;

    if (this.slideTimer) clearTimeout(this.slideTimer);
    this.slideTimer = setTimeout(() => {
      this.zone.run(() => {
        // Seamless reset: advance the index, drop the transition, snap to 0.
        this.rotation = (this.rotation + 1) % n;
        this.animating = false;
        this.trackShift = 0;
        this.featOut = null;
        this.featIn = this.items[this.rotation % n];
        this.recomputeTrack();
      });
    }, this.SLIDE_MS);
  }

  /** Exact pixel distance between two adjacent cards (card width + gap). */
  private measureSlot(): number {
    const track = this.trackRef?.nativeElement;
    if (!track) return 0;
    const cards = track.children;
    if (cards.length < 2) return 0;
    return (cards[1] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft;
  }

  loadFeaturedCategories(): void {
    this.loading = true;

    this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/categories`).pipe(
      map((response) => {
        if (!response?.success || !Array.isArray(response.data)) {
          return [];
        }

        const isTruthy = (value: any) => value === true || value === 1 || value === '1' || value === 'true';

        const activeCategories = response.data.filter((cat: FeaturedCategory) => isTruthy(cat.status));
        const featuredOnly = activeCategories.filter((cat: FeaturedCategory) => isTruthy(cat.is_featured));

        // Prefer featured categories; fall back to all active ones when none are flagged
        return (featuredOnly.length > 0 ? featuredOnly : activeCategories)
          .sort((a: FeaturedCategory, b: FeaturedCategory) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
          .map((category: FeaturedCategory) => ({
            id: category.id,
            title: category.name,
            description: String(category.description || '').trim(),
            count: this.resolveCategoryCount(category),
            image: this.getCategoryImageUrl(category.image_url || null),
            link: `/shop-category/${getSeoRouteParam(category)}`
          }));
      }),
      switchMap((categories: FeaturedCategoryCard[]) => {
        if (categories.length === 0) {
          return of([]);
        }

        return forkJoin(categories.map((category) => this.fetchCategoryProductCount(category)));
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (categories: FeaturedCategoryCard[]) => {
        this.featuredCategories = categories;
        this.buildShowcase(categories);
      },
      error: (error) => {
        console.error('Error loading featured categories:', error);
        this.featuredCategories = [];
      }
    });
  }

  private fetchCategoryProductCount(category: FeaturedCategoryCard) {
    const params = new HttpParams()
      .set('page', '1')
      .set('limit', '1')
      .set('category_id', String(category.id));

    return this.http.get<any>(`${environment.authApiBaseUrl}/categoryproducts`, { params }).pipe(
      map((response) => ({
        ...category,
        count: this.extractProductCount(response, category.count)
      })),
      catchError((error) => {
        console.warn(`Error loading count for category ${category.id}:`, error);
        return of(category);
      })
    );
  }

  private resolveCategoryCount(category: FeaturedCategory): number {
    const directCount = this.readNumericCount(
      category.product_count,
      category.total_products,
      category.products_count,
      category.count,
      Array.isArray(category.products) ? category.products.length : null
    );
    return directCount ?? 0;
  }

  private extractProductCount(response: any, fallback: number): number {
    const resolvedCount = this.readNumericCount(
      response?.total,
      response?.count,
      response?.pagination?.total,
      response?.meta?.total,
      Array.isArray(response?.data) ? response.data.length : null
    );
    return resolvedCount ?? fallback;
  }

  private readNumericCount(...candidates: any[]): number | null {
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined || candidate === '') {
        continue;
      }
      const parsedValue = Number(candidate);
      if (Number.isFinite(parsedValue) && parsedValue >= 0) {
        return parsedValue;
      }
    }
    return null;
  }

  private getCategoryImageUrl(imageUrl: string | null): string {
    if (!imageUrl) return 'assets/images/cavero-logo.png';
    if (imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${imageUrl}`;
    if (imageUrl.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${imageUrl}`;
    return imageUrl;
  }
}
