import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { CaveroService } from '../../../themes/cavero/services/cavero.service';
import { ProductDetailService, Product } from './product-detail.service';
import { CartService } from '../cart/cart.service';
import { Subscription } from 'rxjs';
import { getSeoRouteParam } from '../../shared/utils/seo-url.util';

// Cavero theme
import { CaveroNavbarComponent } from '../../../themes/cavero/components/navbar/navbar.component';
import { CaveroFooterComponent } from '../../../themes/cavero/components/footer/footer.component';

// Import product-detail-specific components
import { ProductDetailBreadcrumbComponent } from './section/breadcrumb/product-detail-breadcrumb.component';
import { ProductDetailGalleryComponent } from './section/gallery/product-detail-gallery.component';
import { ProductDetailInfoComponent } from './section/info/product-detail-info.component';
import { ProductDetailRelatedComponent } from './section/related/product-detail-related.component';
import { ProductReviewsComponent } from './section/reviews/product-reviews.component'; // Import

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CaveroNavbarComponent,
    CaveroFooterComponent,
    ProductDetailBreadcrumbComponent,
    ProductDetailGalleryComponent,
    ProductDetailInfoComponent,
    ProductDetailRelatedComponent,
    ProductReviewsComponent // Add to imports
  ],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit, AfterViewInit, OnDestroy {

  private themeLink?: HTMLLinkElement;
  private iconLink?: HTMLLinkElement;
  private swiperLink?: HTMLLinkElement;
  private scriptsLoaded = false;
  private routerEventsSub?: Subscription;

  productId: string = '';
  productSlug: string = '';
  product: Product | null = null;
  loading: boolean = true;
  error: string = '';
  galleryRefreshToken = 0;

  constructor(
    private caveroService: CaveroService,
    private route: ActivatedRoute,
    private router: Router,
    private productDetailService: ProductDetailService,
    private cartService: CartService,
    private titleService: Title,
    private metaService: Meta
  ) { }

  ngOnInit(): void {
    this.loadCaveroAssets();
    this.getProductIdFromRoute();
    this.bindRouteInteractionRefresh();
    this.releaseUiLocks();
  }

  ngAfterViewInit(): void {
    this.initializeWhenReady();
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
    this.removeDynamicAssets();
  }

  private getProductIdFromRoute(): void {
    this.route.paramMap.subscribe(params => {
      this.productSlug = params.get('slug') || params.get('id') || '';
      this.productId = this.productSlug;
      if (this.productSlug) {
        this.loadProductData();
      } else {
        this.error = 'Product not found';
        this.loading = false;
      }
    });
  }

  private loadProductData(): void {
    this.loading = true;
    this.productDetailService.getProductById(this.productSlug)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.product = this.formatProductData(response.data);
            this.productId = String(this.product.id);
            this.redirectLegacyProductUrl(this.product);
            this.galleryRefreshToken++;
            this.updateSeoMeta(this.product);
            setTimeout(() => this.releaseUiLocks(), 0);
          } else {
            this.error = 'Failed to load product';
            this.resetSeoMeta();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading product:', error);
          this.error = 'Error loading product details';
          this.resetSeoMeta();
          this.loading = false;
        }
      });
  }

  private formatProductData(data: any): Product {
    const normalizedStock = Number(
      data?.stock ?? data?.quantity ?? data?.inventory_quantity ?? data?.available_stock ?? 0
    );
    return {
      id: data.id,
      name: data.name,
      slug: data.slug || '',
      price: parseFloat(data.price),
      compare_price: data.compare_price ? parseFloat(data.compare_price) : undefined,
      description: data.description || '',
      short_description: data.short_description || '',
      seo_title: data.seo_title || '',
      seo_description: data.seo_description || '',
      weight: data.weight ? `${data.weight}g` : '',
      category: data.category?.name || data.category_name || '',
      category_id: data.category?.id || data.category_id,
      category_slug: data.category?.slug || data.category_slug || '',
      images: data.images || (data.image ? [data.image] : []),
      features: data.features || [],
      stock: Number.isFinite(normalizedStock) && normalizedStock >= 0 ? normalizedStock : 0,
      sku: data.sku,
      brand: data.brand?.name,
      ingredients: data.ingredients,
      calories: data.calories,
      delivery_info: data.delivery_info,
      specifications: data.specifications || {},
      weight_unit: data.weight_unit || 'ml',
      tags: data.tags || [],
      variants: Array.isArray(data.variants) ? data.variants : []
    };
  }

  private updateSeoMeta(product: Product): void {
    const fallbackTitle = product.name ? product.name : 'Cavero Fragrances';
    const title = (product.seo_title || '').trim() || fallbackTitle;
    const description = (product.seo_description || '').trim();

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
  }

  private resetSeoMeta(): void {
    this.titleService.setTitle('Cavero Fragrances');
    this.metaService.updateTag({ name: 'description', content: 'Discover premium products at Cavero Fragrances.' });
    this.metaService.updateTag({ property: 'og:title', content: 'Cavero Fragrances' });
    this.metaService.updateTag({ property: 'og:description', content: 'Discover premium products at Cavero Fragrances.' });
    this.metaService.updateTag({ name: 'twitter:title', content: 'Cavero Fragrances' });
    this.metaService.updateTag({ name: 'twitter:description', content: 'Discover premium products at Cavero Fragrances.' });
  }

  private stripHtml(value: string): string {
    return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private redirectLegacyProductUrl(product: Product): void {
    const canonicalParam = getSeoRouteParam(product);
    if (!canonicalParam || canonicalParam === this.productSlug) return;

    this.router.navigate(['/product', canonicalParam], {
      replaceUrl: true,
      queryParamsHandling: 'preserve'
    });
  }

  private loadCaveroAssets(): void {
    // Load CSS
    this.themeLink = document.createElement('link');
    this.themeLink.rel = 'stylesheet';
    this.themeLink.href = 'assets/cavero/css/theme.min.css';
    document.head.appendChild(this.themeLink);

    this.iconLink = document.createElement('link');
    this.iconLink.rel = 'stylesheet';
    this.iconLink.href = 'assets/cavero/icons/cavero-icons.min.css';
    document.head.appendChild(this.iconLink);

    this.swiperLink = document.createElement('link');
    this.swiperLink.rel = 'stylesheet';
    this.swiperLink.href = 'assets/cavero/vendor/swiper/swiper-bundle.min.css';
    document.head.appendChild(this.swiperLink);

    // Load JavaScript
    this.loadJavaScriptAssets().then(() => {
      this.scriptsLoaded = true;
      this.initializeCavero();
    });
  }

  private loadJavaScriptAssets(): Promise<void> {
    return new Promise((resolve) => {
      const scriptsToLoad = [
        'assets/cavero/js/theme.min.js',
        'assets/cavero/vendor/swiper/swiper-bundle.min.js',
      ];

      this.loadScriptsSequentially(scriptsToLoad, resolve);
    });
  }

  private loadScriptsSequentially(scripts: string[], callback: () => void): void {
    let index = 0;

    const loadNextScript = () => {
      if (index >= scripts.length) {
        callback();
        return;
      }

      const script = document.createElement('script');
      script.src = scripts[index];
      script.onload = () => {
        index++;
        loadNextScript();
      };
      script.onerror = () => {
        console.error(`Failed to load script: ${scripts[index]}`);
        index++;
        loadNextScript();
      };
      document.head.appendChild(script);
    };

    loadNextScript();
  }

  private initializeWhenReady(): void {
    const maxWaitTime = 5000;
    const startTime = Date.now();

    const checkAndInitialize = () => {
      if (this.scriptsLoaded) {
        this.initializeCavero();
        return;
      }

      if (Date.now() - startTime < maxWaitTime) {
        setTimeout(checkAndInitialize, 100);
      } else {
        console.warn('Scripts loading timeout, initializing anyway');
        this.initializeCavero();
      }
    };

    checkAndInitialize();
  }

  private initializeCavero(): void {
    setTimeout(() => {
      this.caveroService.initializeCavero();
      this.releaseUiLocks();
    }, 300);
  }

  private removeDynamicAssets(): void {
    [this.themeLink, this.iconLink, this.swiperLink].forEach(asset => {
      if (asset && asset.parentNode) {
        asset.parentNode.removeChild(asset);
      }
    });
  }

  addToCart(event: { product: Product, quantity: number, selected_size?: string, variant_id?: number }): void {
    this.cartService.addToCart(event.product, event.quantity, true, event.selected_size, event.variant_id);
  }

  /** Discount % off the base product (compare_price vs price) for the image flag. */
  getDiscountPercentage(): number {
    const cp = Number((this.product as any)?.compare_price || 0);
    const p = Number(this.product?.price || 0);
    if (!cp || cp <= p) return 0;
    return Math.round(((cp - p) / cp) * 100);
  }

  private bindRouteInteractionRefresh(): void {
    this.routerEventsSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd && event.urlAfterRedirects.startsWith('/product')) {
        setTimeout(() => {
          this.galleryRefreshToken++;
          this.initializeCavero();
          this.releaseUiLocks();
        }, 0);
      }
    });
  }

  private releaseUiLocks(): void {
    const body = document.body;
    body.classList.remove('modal-open', 'offcanvas-open');
    body.style.removeProperty('overflow');
    body.style.removeProperty('padding-right');
    body.style.removeProperty('pointer-events');
    body.removeAttribute('inert');
    body.removeAttribute('aria-hidden');

    document
      .querySelectorAll('.modal-backdrop, .offcanvas-backdrop, .modal-overlay, .custom-confirm-overlay, .reel-modal-overlay')
      .forEach(el => el.remove());
  }
}

