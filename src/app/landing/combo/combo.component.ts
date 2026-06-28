import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CaveroNavbarComponent } from '../../../themes/cavero/components/navbar/navbar.component';
import { CaveroFooterComponent } from '../../../themes/cavero/components/footer/footer.component';
import { CaveroService } from '../../../themes/cavero/services/cavero.service';
import { environment } from '../../../environments/environment';
import { CartService } from '../cart/cart.service';
import { FrontendNotificationService } from '../../shared/services/frontend-notification.service';
import { getSeoRouteParam } from '../../shared/utils/seo-url.util';

interface ComboCategory {
  id: string;
  name: string;
}

interface ComboProduct {
  id: number;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  categoryId: string | null;
  categoryName: string;
  image: string;
  weight: string;
  rating: number;
  stock: number;
  shortDescription: string;
}

interface PredefinedCombo {
  id: number;
  name: string;
  image: string;
  price: number;
  validFrom: string | null;
  validTo: string | null;
  updatedAt: string | null;
  products: ComboProduct[];
}

interface FaqItem {
  q: string;
  a: string;
}

@Component({
  selector: 'app-combo',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CaveroNavbarComponent,
    CaveroFooterComponent
  ],
  templateUrl: './combo.component.html',
  styleUrls: ['./combo.component.scss']
})
export class ComboComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly boxSize = 4;
  readonly comboTitle = '4 In 1 Gift box';
  comboTotal = 1200;
  comboBoxImage = '';
  readonly itemsPerPage = 10;
  readonly terms: string[] = [
    'Only 4 items can be added to your box',
    'No offers/coupons can be clubbed with Build Your Own Box'
  ];
  faqs: FaqItem[] = [
    { q: 'How much is the personalized box for?', a: 'You can pick any 4 items for Rs.1200 only.' },
    { q: 'What product types can I add in my box?', a: 'You can choose from skincare, haircare, body care and wellness products.' },
    { q: 'Can I gift this box?', a: 'Yes, this box can be gifted.' },
    { q: 'Can I add single products multiple times in my box?', a: 'You can add the same product in multiple slots as long as stock is available.' }
  ];

  categories: ComboCategory[] = [];
  activeCategoryId = 'all';

  predefinedCombos: PredefinedCombo[] = [];
  loadingPredefinedCombos = false;

  products: ComboProduct[] = [];
  loadingCategories = false;
  loadingProducts = false;
  currentPage = 1;

  activeSlotIndex = 0;
  selectedSlots: (ComboProduct | null)[] = Array.from({ length: this.boxSize }, () => null);

  private productCache = new Map<string, ComboProduct[]>();
  private themeLink?: HTMLLinkElement;
  private iconLink?: HTMLLinkElement;
  private choicesLink?: HTMLLinkElement;
  private scriptsLoaded = false;

  constructor(
    private http: HttpClient,
    private caveroService: CaveroService,
    private cartService: CartService,
    private notification: FrontendNotificationService
  ) {}

  ngOnInit(): void {
    this.loadCaveroAssets();
    this.loadComboBoxSettings();
    this.loadCategories();
    this.loadPredefinedCombos();
    this.selectCategory('all');
  }

  ngAfterViewInit(): void {
    this.initializeWhenReady();
  }

  ngOnDestroy(): void {
    this.removeDynamicAssets();
  }

  get selectedCount(): number {
    return this.selectedSlots.filter(Boolean).length;
  }

  get canCheckout(): boolean {
    return this.selectedCount === this.boxSize;
  }

  get realProductsTotal(): number {
    return this.selectedSlots.reduce((sum, item) => sum + (item?.price ?? 0), 0);
  }

  get savingsAmount(): number {
    const saving = this.realProductsTotal - this.comboTotal;
    return saving > 0 ? saving : 0;
  }

  get paginatedProducts(): ComboProduct[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.products.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.products.length / this.itemsPerPage));
  }

  trackByCategory(_: number, category: ComboCategory): string {
    return category.id;
  }

  trackByProduct(_: number, product: ComboProduct): number {
    return product.id;
  }

  trackBySlot(index: number): number {
    return index;
  }

  trackByPredefinedCombo(_: number, combo: PredefinedCombo): number {
    return combo.id;
  }

  selectCategory(categoryId: string): void {
    this.currentPage = 1;
    if (this.activeCategoryId === categoryId && this.products.length > 0) return;

    this.activeCategoryId = categoryId;
    if (this.productCache.has(categoryId)) {
      this.products = this.productCache.get(categoryId) ?? [];
      return;
    }

    this.loadingProducts = true;
    let params = new HttpParams()
      .set('page', '1')
      .set('limit', '200');

    if (categoryId !== 'all') {
      params = params.set('category_id', categoryId);
    }

    this.http.get<any>(`${environment.authApiBaseUrl}/categoryproducts`, { params }).subscribe({
      next: (res) => {
        const mapped = res?.success ? this.mapProducts(res.data ?? []) : [];
        this.products = mapped;
        this.productCache.set(categoryId, mapped);
        this.loadingProducts = false;
      },
      error: () => {
        this.products = [];
        this.loadingProducts = false;
      }
    });
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        document.querySelector('.combo-products-grid')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 0);
    }
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  applyPredefinedCombo(combo: PredefinedCombo): void {
    const filledSlots: (ComboProduct | null)[] = Array.from({ length: this.boxSize }, (_, index) => {
      const product = combo.products[index];
      return product ? { ...product } : null;
    });

    this.selectedSlots = filledSlots;
    const nextEmpty = this.selectedSlots.findIndex((slot) => !slot);
    this.activeSlotIndex = nextEmpty === -1 ? 0 : nextEmpty;

    this.notification.success(`${combo.name} applied to your box.`);
  }

  async usePredefinedCombo(combo: PredefinedCombo): Promise<void> {
    const latestCombo = await this.fetchLatestPredefinedCombo(combo);
    const sourceCombo = latestCombo || combo;

    const grouped = new Map<number, { product: ComboProduct; quantity: number }>();
    (sourceCombo.products || []).slice(0, this.boxSize).forEach((product) => {
      const existing = grouped.get(product.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        grouped.set(product.id, { product, quantity: 1 });
      }
    });

    const comboItems = Array.from(grouped.values()).map(({ product, quantity }) => ({
      product_id: String(product.id),
      product_name: product.name,
      product_image: product.image,
      quantity,
      price: product.price
    }));

    const fixedPrice = Number(sourceCombo.price);
    const comboPrice = Number.isFinite(fixedPrice) && fixedPrice >= 0 ? fixedPrice : this.comboTotal;

    const added = this.cartService.addComboBoxToCart({
      comboId: sourceCombo.id,
      name: sourceCombo.name,
      price: comboPrice,
      image: sourceCombo.image || sourceCombo.products.find((product) => !!product?.image)?.image || 'assets/cavero/img/shop/grocery/01.png',
      boxSize: Math.max(1, Math.min(this.boxSize, sourceCombo.products.length || this.boxSize)),
      items: comboItems
    });

    if (added) {
      this.notification.celebrate(`${sourceCombo.name} added to cart.`);
    }
  }

  setActiveSlot(index: number): void {
    this.activeSlotIndex = index;
  }

  clearSlot(index: number): void {
    this.selectedSlots[index] = null;
    this.activeSlotIndex = index;
  }

  clearAllSelections(): void {
    this.selectedSlots = Array.from({ length: this.boxSize }, () => null);
    this.activeSlotIndex = 0;
  }

  addToBox(product: ComboProduct): void {
    if (this.isAddDisabled(product)) {
      this.notification.error(this.getDisabledReason(product));
      return;
    }

    const chosenSlot = this.activeSlotIndex;
    this.selectedSlots[this.activeSlotIndex] = product;
    const nextEmpty = this.selectedSlots.findIndex((slot) => !slot);
    if (nextEmpty !== -1) {
      this.activeSlotIndex = nextEmpty;
    }
    this.notification.success(`${product.name} added to Item ${chosenSlot + 1}.`);
  }

  isAddDisabled(product: ComboProduct): boolean {
    if (product.stock <= 0) return true;

    const selectedProductIds = this.getSelectedProductIds();
    if (selectedProductIds.has(product.id)) return true;

    if (!product.categoryId) return false;
    const selectedCategoryIds = this.getSelectedCategoryIds();
    return selectedCategoryIds.has(product.categoryId);
  }

  getDisabledReason(product: ComboProduct): string {
    if (product.stock <= 0) return 'This product is out of stock.';

    const selectedProductIds = this.getSelectedProductIds();
    if (selectedProductIds.has(product.id)) {
      return 'This exact product is already selected in your box.';
    }

    if (product.categoryId && this.getSelectedCategoryIds().has(product.categoryId)) {
      return `You already selected a product from ${product.categoryName}. Pick a different category.`;
    }

    return 'This product cannot be added right now.';
  }

  getAddButtonLabel(product: ComboProduct): string {
    if (product.stock <= 0) return 'Out of Stock';
    if (this.isProductAlreadySelected(product)) return 'Already Added';
    if (this.isProductCategoryLocked(product)) return 'Category Locked';
    return 'Add To Box';
  }

  getDiscountPercent(product: ComboProduct): number | null {
    if (!product.originalPrice || product.originalPrice <= product.price) return null;

    const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    return discountPercent > 0 ? discountPercent : null;
  }

  getActionStateLabel(product: ComboProduct): string {
    if (product.stock <= 0) return 'Sold out';
    if (this.isProductAlreadySelected(product)) return 'Added';
    if (this.isProductCategoryLocked(product)) return 'Locked';
    return '';
  }

  getProductStatusLabel(product: ComboProduct): string {
    if (product.stock <= 0) return 'Out of stock';
    if (this.isProductAlreadySelected(product)) return 'Already in your box';
    if (this.isProductCategoryLocked(product)) return `${product.categoryName} already selected`;
    if (product.stock > 0 && product.stock < 5) return `Only ${product.stock} left`;
    return '';
  }

  getProductStatusClass(product: ComboProduct): string {
    if (product.stock <= 0) return 'stock-status-out';
    if (this.isProductAlreadySelected(product)) return 'stock-status-selected';
    if (this.isProductCategoryLocked(product)) return 'stock-status-locked';
    if (product.stock > 0 && product.stock < 5) return 'stock-status-low';
    return '';
  }

  addBoxToCart(): void {
    if (!this.canCheckout) {
      this.notification.error('Please select all 4 items before adding the box to cart.');
      return;
    }

    const grouped = new Map<number, { product: ComboProduct; quantity: number }>();
    this.selectedSlots.forEach((slot) => {
      if (!slot) return;
      const existing = grouped.get(slot.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        grouped.set(slot.id, { product: slot, quantity: 1 });
      }
    });

    const comboItems = Array.from(grouped.values()).map(({ product, quantity }) => ({
      product_id: String(product.id),
      product_name: product.name,
      product_image: product.image,
      quantity,
      price: product.price
    }));

    const added = this.cartService.addComboBoxToCart({
      name: this.comboTitle,
      price: this.comboTotal,
      image: this.comboBoxImage || this.selectedSlots.find((slot) => !!slot)?.image || 'assets/cavero/img/shop/grocery/01.png',
      boxSize: this.boxSize,
      items: comboItems
    });

    if (added) {
      this.notification.celebrate('Your personalised box has been added to cart.');
    }
  }

  private loadComboBoxSettings(): void {
    this.http.get<any>(`${environment.authApiBaseUrl}/combo-box-settings`).subscribe({
      next: (res) => {
        const price = Number(res?.data?.box_price ?? 1200);
        this.comboTotal = Number.isFinite(price) && price >= 0 ? price : 1200;
        this.comboBoxImage = this.resolveManagedImage(res?.data?.image, res?.data?.updated_at || null);
        this.syncComboFaqPrice();
        this.cartService.syncComboBoxCartItems([
          {
            name: this.comboTitle,
            image: this.comboBoxImage || undefined
          }
        ]);
      },
      error: () => {
        this.comboTotal = 1200;
        this.comboBoxImage = '';
        this.syncComboFaqPrice();
      }
    });
  }

  private loadCategories(): void {
    this.loadingCategories = true;
    this.http.get<any>(`${environment.authApiBaseUrl}/categories/frontend`).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.categories = rows
          .filter((cat: any) => cat && cat.status !== false)
          .map((cat: any) => ({
            id: String(cat.id),
            name: String(cat.name || 'Category')
          }));
        this.loadingCategories = false;
      },
      error: () => {
        this.categories = [];
        this.loadingCategories = false;
      }
    });
  }

  private loadPredefinedCombos(): void {
    this.loadingPredefinedCombos = true;

    this.http.get<any>(`${environment.authApiBaseUrl}/combos/predefined`).subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        this.predefinedCombos = rows
          .map((combo: any) => this.mapPredefinedCombo(combo))
          .filter((combo: PredefinedCombo) => combo.products.length > 0);
        this.cartService.syncComboBoxCartItems(
          this.predefinedCombos.map((combo) => ({
            id: combo.id,
            name: combo.name,
            image: combo.image
          }))
        );
        this.loadingPredefinedCombos = false;
      },
      error: () => {
        this.predefinedCombos = [];
        this.loadingPredefinedCombos = false;
      }
    });
  }

  private mapPredefinedCombo(combo: any): PredefinedCombo {
    const productsRaw = Array.isArray(combo?.products) ? combo.products : [];
    const mappedProducts = productsRaw
      .sort((a: any, b: any) => Number(a.slot || 0) - Number(b.slot || 0))
      .slice(0, this.boxSize)
      .map((product: any) => ({
        id: Number(product.product_id),
        name: String(product.product_name || 'Product'),
        slug: product.product_slug || '',
        price: Number(product.product_price || 0),
        originalPrice: undefined,
        categoryId: product.category_id !== null && product.category_id !== undefined ? String(product.category_id) : null,
        categoryName: String(product.category_name || 'Category'),
        image: this.resolvePredefinedImage(product.product_image),
        weight: 'Pack of 1',
        rating: 5,
        stock: 999,
        shortDescription: ''
      }))
      .filter((product: ComboProduct) => Number.isInteger(product.id) && product.id > 0);

    return {
      id: Number(combo?.id || 0),
      name: String(combo?.name || 'Predefined Combo'),
      image: this.resolvePredefinedImage(combo?.image, combo?.updated_at || combo?.updatedAt || null) || mappedProducts.find((product: ComboProduct) => !!product.image)?.image || 'assets/cavero/img/shop/grocery/01.png',
      price: Number(combo?.discount_price || 0),
      validFrom: combo?.valid_from ? String(combo.valid_from) : null,
      validTo: combo?.valid_to ? String(combo.valid_to) : null,
      updatedAt: combo?.updated_at ? String(combo.updated_at) : (combo?.updatedAt ? String(combo.updatedAt) : null),
      products: mappedProducts
    };
  }

  private resolvePredefinedImage(image: string | null | undefined, version?: string | null): string {
    if (!image) return 'assets/cavero/img/shop/grocery/01.png';
    return this.resolveManagedImage(image, version) || 'assets/cavero/img/shop/grocery/01.png';
  }

  private mapProducts(products: any[]): ComboProduct[] {
    return products.map((product: any) => {
      const price = Number(product.price ?? 0);
      const comparePrice = Number(product.compare_price ?? 0);
      const rating = this.extractRating(product);
      const stock = Number(product.stock ?? product.available_stock ?? product.inventory_quantity ?? 0);
      const categoryIdRaw = product.category_id ?? product.Category?.id ?? product.category?.id ?? null;
      const categoryNameRaw = product.Category?.name ?? product.category?.name ?? '';

      return {
        id: Number(product.id),
        name: String(product.name || 'Product'),
        slug: product.slug || '',
        price: Number.isFinite(price) ? price : 0,
        originalPrice: Number.isFinite(comparePrice) && comparePrice > price ? comparePrice : undefined,
        categoryId: categoryIdRaw !== null && categoryIdRaw !== undefined ? String(categoryIdRaw) : null,
        categoryName: String(categoryNameRaw || 'this category'),
        image: this.getImageUrl(product.images?.[0]),
        weight: product.weight ? `${product.weight}${product.weight_unit || ''}` : '',
        rating,
        stock: Number.isFinite(stock) ? stock : 0,
        shortDescription: product.short_description ? String(product.short_description).trim() : ''
      };
    });
  }

  private extractRating(product: any): number {
    const possible = [
      product.average_rating,
      product.rating,
      product.avg_rating,
      product.review_rating
    ];
    for (const value of possible) {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) return num;
    }
    return 5;
  }

  getProductRouteParam(product: ComboProduct): string {
    return getSeoRouteParam(product);
  }

  private getSelectedProductIds(): Set<number> {
    const ids = new Set<number>();
    this.selectedSlots.forEach((slot) => {
      if (!slot) return;
      ids.add(slot.id);
    });
    return ids;
  }

  private getSelectedCategoryIds(): Set<string> {
    const ids = new Set<string>();
    this.selectedSlots.forEach((slot) => {
      if (!slot?.categoryId) return;
      ids.add(slot.categoryId);
    });
    return ids;
  }

  private isProductAlreadySelected(product: ComboProduct): boolean {
    return this.getSelectedProductIds().has(product.id);
  }

  private isProductCategoryLocked(product: ComboProduct): boolean {
    if (!product.categoryId || this.isProductAlreadySelected(product)) {
      return false;
    }

    return this.getSelectedCategoryIds().has(product.categoryId);
  }

  private syncComboFaqPrice(): void {
    this.faqs = this.faqs.map((faq, index) =>
      index === 0
        ? { ...faq, a: `You can pick any ${this.boxSize} items for Rs.${this.comboTotal} only.` }
        : faq
    );
  }

  private getImageUrl(image: any): string {
    if (!image) return 'assets/cavero/img/shop/grocery/01.png';

    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      if (image.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${image}`;
      if (image.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${image}`;
      return image;
    }

    if (image.filename) return `${environment.apiGatewayBaseUrl}/uploads/products/${image.filename}`;
    if (image.url) {
      if (image.url.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${image.url}`;
      return image.url;
    }

    return 'assets/cavero/img/shop/grocery/01.png';
  }

  private loadCaveroAssets(): void {
    const addLink = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      return link;
    };

    this.themeLink = addLink('assets/cavero/css/theme.min.css');
    this.iconLink = addLink('assets/cavero/icons/cavero-icons.min.css');
    this.choicesLink = addLink('assets/cavero/vendor/choices.js/public/assets/styles/choices.min.css');

    const scripts = [
      'assets/cavero/js/theme.min.js',
      'assets/cavero/vendor/choices.js/public/assets/scripts/choices.min.js',
      'assets/cavero/vendor/list.js/dist/list.min.js'
    ];

    let index = 0;
    const loadNext = () => {
      if (index >= scripts.length) {
        this.scriptsLoaded = true;
        this.initializeCavero();
        return;
      }
      const script = document.createElement('script');
      script.src = scripts[index];
      script.onload = () => {
        index += 1;
        loadNext();
      };
      script.onerror = () => {
        index += 1;
        loadNext();
      };
      document.head.appendChild(script);
    };
    loadNext();
  }

  private initializeWhenReady(): void {
    const startedAt = Date.now();
    const check = () => {
      if (this.scriptsLoaded) {
        this.initializeCavero();
        return;
      }
      if (Date.now() - startedAt < 5000) {
        setTimeout(check, 100);
      } else {
        this.initializeCavero();
      }
    };
    check();
  }

  private initializeCavero(): void {
    setTimeout(() => this.caveroService.initializeCavero(), 300);
  }

  private removeDynamicAssets(): void {
    [this.themeLink, this.iconLink, this.choicesLink].forEach((asset) => {
      if (asset && asset.parentNode) asset.parentNode.removeChild(asset);
    });
  }

  private async fetchLatestPredefinedCombo(combo: PredefinedCombo): Promise<PredefinedCombo | null> {
    if (!Number.isInteger(Number(combo.id)) || Number(combo.id) <= 0) {
      return null;
    }

    try {
      const res = await firstValueFrom(
        this.http.get<any>(`${environment.authApiBaseUrl}/combos/predefined`)
      );
      const rows = Array.isArray(res?.data) ? res.data : [];
      const latestCombo = rows.find((row: any) => Number(row?.id) === Number(combo.id));

      if (!latestCombo) {
        return null;
      }

      const mappedCombo = this.mapPredefinedCombo(latestCombo);
      this.predefinedCombos = this.predefinedCombos.map((existingCombo) =>
        existingCombo.id === mappedCombo.id ? mappedCombo : existingCombo
      );

      this.cartService.syncComboBoxCartItems([
        { id: mappedCombo.id, name: mappedCombo.name, image: mappedCombo.image }
      ]);

      return mappedCombo;
    } catch {
      return null;
    }
  }

  private resolveManagedImage(image: string | null | undefined, version?: string | null): string {
    if (!image) return '';

    let resolvedImage = image;
    if (image.startsWith('/uploads/')) {
      resolvedImage = `${environment.apiGatewayBaseUrl}${image}`;
    } else if (image.startsWith('uploads/')) {
      resolvedImage = `${environment.apiGatewayBaseUrl}/${image}`;
    }

    if (!version) {
      return resolvedImage;
    }

    const separator = resolvedImage.includes('?') ? '&' : '?';
    return `${resolvedImage}${separator}v=${encodeURIComponent(version)}`;
  }
}
