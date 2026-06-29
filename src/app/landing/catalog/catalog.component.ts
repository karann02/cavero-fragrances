import { Component, AfterViewInit, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { CaveroService } from '../../../themes/cavero/services/cavero.service';
import { CaveroNavbarComponent } from '../../../themes/cavero/components/navbar/navbar.component';
import { CaveroFooterComponent } from '../../../themes/cavero/components/footer/footer.component';
import { CatalogFiltersComponent } from './section/filter/catalog-filters.component';
import { ActiveFilters } from './section/filter/catalog-filters.component';
import { CatalogProductsComponent } from './section/product/catalog-products.component';
import { environment } from '../../../environments/environment';
import { getSeoRouteParam } from '../../shared/utils/seo-url.util';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CaveroNavbarComponent,
    CaveroFooterComponent,
    CatalogFiltersComponent,
    CatalogProductsComponent
  ],
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss']
})
export class CatalogComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(CatalogFiltersComponent) filterSidebar?: CatalogFiltersComponent;

  categoryId: string | null = null;
  categorySlug: string | null = null;
  searchQuery: string | null = null;
  categoryName = 'Shop catalog';
  activeFilters: ActiveFilters = { priceRange: { min: 0, max: 99999 }, status: [], labels: [], concentration: [], fragranceFamily: [], gender: [] };

  private themeLink?: HTMLLinkElement;
  private iconLink?: HTMLLinkElement;
  private choicesLink?: HTMLLinkElement;
  private scriptsLoaded = false;

  constructor(
    private caveroService: CaveroService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit(): void {
    this.loadCaveroAssets();

    this.route.paramMap.subscribe(params => {
      this.categorySlug = params.get('slug') || params.get('id');
      if (this.categorySlug && this.categorySlug !== 'all') {
        this.http.get<any>(`${environment.authApiBaseUrl}/categories/${this.categorySlug}`).subscribe({
          next: res => {
            if (!res.success) return;
            this.categoryId = String(res.data.id);
            this.categoryName = res.data.name;
            this.updateCategorySeo(res.data);

            const canonicalParam = getSeoRouteParam(res.data);
            if (canonicalParam && canonicalParam !== this.categorySlug) {
              this.router.navigate(['/shop-category', canonicalParam], {
                replaceUrl: true,
                queryParamsHandling: 'preserve'
              });
            }
          },
          error: () => {
            this.categoryId = null;
            this.categoryName = 'Category Products';
          }
        });
      } else {
        this.categoryId = null;
        this.categoryName = 'Shop catalog';
        this.resetCatalogSeo();
      }
    });

    this.route.queryParamMap.subscribe(qp => {
      this.searchQuery = qp.get('search');
      if (this.searchQuery) {
        this.categoryName = `Search results for "${this.searchQuery}"`;
        this.updateSearchSeo(this.searchQuery);
      } else if (!this.categoryId) {
        this.resetCatalogSeo();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeWhenReady();
  }

  ngOnDestroy(): void {
    this.removeDynamicAssets();
  }

  onFiltersChanged(filters: ActiveFilters): void {
    this.activeFilters = { ...filters };
  }

  clearAllFilters(): void {
    this.activeFilters = { priceRange: { min: 0, max: 99999 }, status: [], labels: [], concentration: [], fragranceFamily: [], gender: [] };
    this.filterSidebar?.resetAll();
  }

  private loadCaveroAssets(): void {
    const addLink = (href: string) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href;
      document.head.appendChild(l);
      return l;
    };
    this.themeLink      = addLink('assets/cavero/css/theme.min.css');
    this.iconLink       = addLink('assets/cavero/icons/cavero-icons.min.css');
    this.choicesLink    = addLink('assets/cavero/vendor/choices.js/public/assets/styles/choices.min.css');

    const scripts = [
      'assets/cavero/js/theme.min.js',
      'assets/cavero/vendor/choices.js/public/assets/scripts/choices.min.js'
    ];
    let i = 0;
    const loadNext = () => {
      if (i >= scripts.length) { this.scriptsLoaded = true; this.initializeCavero(); return; }
      const s = document.createElement('script');
      s.src = scripts[i];
      s.onload = () => { i++; loadNext(); };
      s.onerror = () => { i++; loadNext(); };
      document.head.appendChild(s);
    };
    loadNext();
  }

  private initializeWhenReady(): void {
    const start = Date.now();
    const check = () => {
      if (this.scriptsLoaded) { this.initializeCavero(); return; }
      if (Date.now() - start < 5000) setTimeout(check, 100);
      else this.initializeCavero();
    };
    check();
  }

  private initializeCavero(): void {
    setTimeout(() => this.caveroService.initializeCavero(), 300);
  }

  private removeDynamicAssets(): void {
    [this.themeLink, this.iconLink, this.choicesLink].forEach(asset => {
      if (asset && asset.parentNode) {
        asset.parentNode.removeChild(asset);
      }
    });
  }

  private updateCategorySeo(category: any): void {
    const name = String(category?.name || 'Category').trim();
    const title = String(category?.meta_title || '').trim() || name;
    const description = String(category?.meta_description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
  }

  private updateSearchSeo(query: string): void {
    const safeQuery = String(query || '').trim();
    const title = safeQuery ? `Search results for ${safeQuery} | Cavero Fragrances` : 'Search | Cavero Fragrances';
    const description = safeQuery
      ? `Browse Cavero Fragrances search results for ${safeQuery}.`
      : 'Search Cavero Fragrances products.';

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'robots', content: 'noindex,follow' });
  }

  private resetCatalogSeo(): void {
    this.titleService.setTitle('Shop Beauty Products Online | Cavero Fragrances');
    this.metaService.updateTag({ name: 'description', content: 'Explore and shop skincare, cosmetics, and wellness products from Cavero Fragrances.' });
    this.metaService.updateTag({ name: 'robots', content: 'index,follow' });
  }
}

