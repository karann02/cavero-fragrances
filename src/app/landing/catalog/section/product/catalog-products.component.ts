import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CatalogProductsService, ProductResponse } from './catalog-products.service';
import { WishlistService } from '../../../customer/wishlist/wishlist.service';
import { CartService } from '../../../../landing/cart/cart.service';
import { CartAnimationService } from '../../../../shared/services/cart-animation.service';
import { environment } from '../../../../../environments/environment';
import { getSeoRouteParam } from '../../../../shared/utils/seo-url.util';
import { AnimateOnScrollDirective } from '../../../../core/directives/animate-on-scroll.directive';

interface Product {
  id: number;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  image: string;
  weight: string;
  short_description?: string;
  discount?: boolean;
  discountAmount?: string;
  stock?: number;
  isFavorite?: boolean;
  quantity: number;
  images?: any[];
  variantCount?: number;
  variants?: Array<{ id: number; name: string; price: number; compare_price?: number | null; stock: number; is_active?: boolean; sort_order?: number }>;
  specifications?: {
    concentration?: string;
    fragrance_family?: string;
    gender?: string;
    [key: string]: any;
  };
}

@Component({
  selector: 'app-catalog-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AnimateOnScrollDirective],
  templateUrl: './catalog-products.component.html',
  styleUrls: ['./catalog-products.component.scss']
})
export class CatalogProductsComponent implements OnInit, OnChanges, OnDestroy {

  @Input() categoryId: string | null = null;
  @Input() searchQuery: string | null = null;
  @Input() activeFilters: any = null;
  @Output() clearAll = new EventEmitter<void>();

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  paginatedProducts: Product[] = [];

  loading = false;
  currentPage = 1;
  itemsPerPage = 12;
  sortBy = 'Relevance';
  sortOpen = false;
  sortOptions = ['Relevance', 'Popularity', 'Price: Low to High', 'Price: High to Low', 'Newest Arrivals'];

  private wishlistSub!: Subscription;
  private cartSub!: Subscription;

  constructor(
    private catalogProductsService: CatalogProductsService,
    private wishlistService: WishlistService,
    private cartService: CartService,
    private cartAnim: CartAnimationService,
    private elRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (!this.elRef.nativeElement.querySelector('.sort-dropdown')?.contains(e.target)) {
      this.sortOpen = false;
    }
  }

  ngOnInit(): void {
    this.loadProducts();
    this.wishlistSub = this.wishlistService.wishlist$.subscribe(() => this.syncWishlistStates());
    this.cartSub = this.cartService.cart$.subscribe(() => this.syncCartQuantities());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryId'] || changes['searchQuery']) {
      this.currentPage = 1;
      this.loadProducts();
    }
    if (changes['activeFilters'] && !changes['activeFilters'].firstChange) {
      this.currentPage = 1;
      this.applyFilters();
    }
  }

  ngOnDestroy(): void {
    this.wishlistSub?.unsubscribe();
    this.cartSub?.unsubscribe();
  }

  private syncWishlistStates(): void {
    this.allProducts.forEach(p => p.isFavorite = this.wishlistService.isWishlisted(p.id));
    this.applyFilters();
  }

  loadProducts(): void {
    this.loading = true;

    let params = new HttpParams()
      .set('page', '1')
      .set('limit', '200'); // load all, filter client-side

    if (this.sortBy !== 'Relevance') params = params.set('sort', this.getSortParam());
    if (this.searchQuery) params = params.set('search', this.searchQuery);

    const obs = this.categoryId && this.categoryId !== 'all'
      ? this.catalogProductsService.getProductsByCategory(this.categoryId, params)
      : this.catalogProductsService.getProducts(params);

    obs.subscribe({
      next: (response: ProductResponse) => {
        if (response.success) {
          this.allProducts = this.formatProducts(response.data);
          this.syncWishlistStates();
          this.syncCartQuantities();
          this.applyFilters();
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyFilters(): void {
    let result = [...this.allProducts];

    if (this.activeFilters) {
      // Price filter
      const min = this.activeFilters.priceRange?.min ?? 0;
      const max = this.activeFilters.priceRange?.max ?? 99999;
      if (min > 0 || max < 99999) {
        result = result.filter(p => p.price >= min && p.price <= max);
      }

      // Status filter
      const status: string[] = this.activeFilters.status ?? [];
      if (status.includes('instock')) {
        result = result.filter(p => (p.stock ?? 0) > 0);
      }
      if (status.includes('sale')) {
        result = result.filter(p => p.discount === true);
      }

      // Concentration filter
      const concentration: string[] = this.activeFilters.concentration ?? [];
      if (concentration.length > 0) {
        result = result.filter(p =>
          concentration.some(c => c === p.specifications?.concentration)
        );
      }

      // Fragrance family filter
      const fragranceFamily: string[] = this.activeFilters.fragranceFamily ?? [];
      if (fragranceFamily.length > 0) {
        result = result.filter(p =>
          fragranceFamily.some(f => f === p.specifications?.fragrance_family)
        );
      }

      // Gender filter
      const gender: string[] = this.activeFilters.gender ?? [];
      if (gender.length > 0) {
        result = result.filter(p =>
          gender.some(g => g === p.specifications?.gender)
        );
      }
    }

    // Sort
    result = this.sortProducts(result);

    this.filteredProducts = result;
    this.paginate();
  }

  private sortProducts(products: Product[]): Product[] {
    switch (this.sortBy) {
      case 'Price: Low to High': return [...products].sort((a, b) => a.price - b.price);
      case 'Price: High to Low': return [...products].sort((a, b) => b.price - a.price);
      default: return products;
    }
  }

  private paginate(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedProducts = this.filteredProducts.slice(start, start + this.itemsPerPage);
  }

  private syncCartQuantities(): void {
    const cart = this.cartService.getCartValue();
    this.allProducts.forEach(p => {
      this.cartService.syncItemStock(p.id, p.stock);
      const item = cart.items.find(i => String(i.product_id) === String(p.id));
      p.quantity = item ? item.quantity : 0;
    });
    // force paginated view to reflect updated quantities
    this.paginate();
  }

  private formatProducts(products: any[]): Product[] {
    return products.map(product => {
      const hasDiscount = product.compare_price && parseFloat(product.compare_price) > parseFloat(product.price);
      const discountPct = hasDiscount
        ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
        : 0;

      const mainImage = product.images && product.images.length > 0
        ? this.getImageUrl(product.images[0])
        : 'assets/cavero/img/shop/grocery/01.png';

      return {
        id: product.id,
        name: product.name,
        slug: product.slug || '',
        price: parseFloat(product.price),
        originalPrice: product.compare_price ? parseFloat(product.compare_price) : undefined,
        image: mainImage,
        images: product.images,
        weight: product.weight ? `${product.weight}${product.weight_unit || ''}` : '',
        short_description: product.short_description ? String(product.short_description).trim() : '',
        discount: hasDiscount,
        discountAmount: hasDiscount ? `-${discountPct}%` : undefined,
        stock: product.stock || 0,
        quantity: 0,
        variants: Array.isArray(product.variants) ? product.variants : [],
        variantCount: Array.isArray(product.variants) ? product.variants.filter((v: any) => v.is_active !== false).length : 0,
        specifications: product.specifications || {}
      };
    });
  }

  getProductRouteParam(product: Product): string {
    return getSeoRouteParam(product);
  }

  private getImageUrl(image: any): string {
    if (!image) return 'assets/cavero/img/shop/grocery/01.png';
    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      if (image.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${image}`;
      if (image.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${image}`;
      return image;
    }
    const direct = image.url || image.secure_url || image.path;
    if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) return direct;
    if (image.filename) return `${environment.apiGatewayBaseUrl}/uploads/products/${image.filename}`;
    if (image.url) {
      if (image.url.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${image.url}`;
      return image.url;
    }
    if (image.path?.includes('uploads')) {
      const idx = image.path.lastIndexOf('uploads');
      return `${environment.apiGatewayBaseUrl}/${image.path.slice(idx).replace(/\\/g, '/')}`;
    }
    return 'assets/cavero/img/shop/grocery/01.png';
  }

  incrementQuantity(product: Product, event?: MouseEvent): void {
    if (event) {
      const btn = event.currentTarget as HTMLElement;
      const img = btn.closest('.cavero-product-card')?.querySelector('.cavero-img-lazy') as HTMLElement | null;
      this.cartAnim.flyToCart(product.image, img);
    }
    this.cartService.addToCart(product, 1);
  }

  decrementQuantity(product: Product): void {
    if (product.quantity <= 0) return;
    this.cartService.updateQuantity(String(product.id), product.quantity - 1);
  }

  addToWishlist(product: Product): void {
    this.wishlistService.toggleWishlist(product.id);
  }

  removeFilterLabel(label: string): void {
    if (!this.activeFilters) return;

    const statusMap: Record<string, string> = {
      'In stock': 'instock', 'On sale': 'sale'
    };
    const concentrationOptions = ['Attar / Itr', 'EDP', 'EDT', 'Parfum Extrait'];
    const familyOptions = ['Oriental / Oud', 'Floral', 'Fresh / Citrus', 'Spicy / Amber', 'Gourmand', 'Musk', 'Aquatic'];
    const genderOptions = ['Men', 'Women', 'Unisex'];

    const drop = (l: string) => this.activeFilters.labels.filter((x: string) => x !== l);

    if (statusMap[label]) {
      this.activeFilters = { ...this.activeFilters, status: this.activeFilters.status.filter((s: string) => s !== statusMap[label]), labels: drop(label) };
    } else if (label.startsWith('₹')) {
      this.activeFilters = { ...this.activeFilters, priceRange: { min: 0, max: 99999 }, labels: drop(label) };
    } else if (concentrationOptions.includes(label)) {
      this.activeFilters = { ...this.activeFilters, concentration: (this.activeFilters.concentration || []).filter((c: string) => c !== label), labels: drop(label) };
    } else if (familyOptions.includes(label)) {
      this.activeFilters = { ...this.activeFilters, fragranceFamily: (this.activeFilters.fragranceFamily || []).filter((f: string) => f !== label), labels: drop(label) };
    } else if (genderOptions.includes(label)) {
      this.activeFilters = { ...this.activeFilters, gender: (this.activeFilters.gender || []).filter((g: string) => g !== label), labels: drop(label) };
    } else {
      this.activeFilters = { ...this.activeFilters, labels: drop(label) };
    }

    this.currentPage = 1;
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.activeFilters = { priceRange: { min: 0, max: 99999 }, status: [], labels: [], concentration: [], fragranceFamily: [], gender: [] };
    this.currentPage = 1;
    this.applyFilters();
    this.clearAll.emit();
  }

  private getSortParam(): string {
    switch (this.sortBy) {
      case 'Price: Low to High': return 'price_asc';
      case 'Price: High to Low': return 'price_desc';
      case 'Newest Arrivals': return 'newest';
      case 'Popularity': return 'popular';
      default: return 'relevance';
    }
  }

  selectSort(opt: string): void {
    this.sortBy = opt;
    this.sortOpen = false;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSortChange(sortValue: string): void {
    this.sortBy = sortValue;
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number | string): void {
    if (typeof page === 'number' && page >= 1) {
      this.currentPage = page;
      this.paginate();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): (number | string)[] {
    const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (this.currentPage > 3) pages.push('...');
      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(totalPages - 1, this.currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (this.currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }
}
