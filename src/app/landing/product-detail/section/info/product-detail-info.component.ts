import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Product } from '../../product-detail.service';
import { WishlistService } from '../../../customer/wishlist/wishlist.service';
import { CartAnimationService } from '../../../../shared/services/cart-animation.service';
import { FrontendNotificationService } from '../../../../shared/services/frontend-notification.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-product-detail-info',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail-info.component.html',
  styleUrls: ['./product-detail-info.component.scss']
})
export class ProductDetailInfoComponent implements OnInit, OnChanges {
  @Input() product: Product | null = null;
  @Output() addToCartEvent = new EventEmitter<{ product: Product, quantity: number, selected_size?: string, variant_id?: number }>();

  isWishlisted = false;
  quantity = 1;
  selectedSizeIndex: number | null = null;
  freeGifts: any[] = [];

  /** Cached variant list — bound by the template *ngFor so the buttons aren't
   *  rebuilt on every change-detection cycle (which made them un-clickable). */
  variants: any[] = [];

  trackVariant = (index: number, v: any) => (v?.id ?? v?.name ?? index);

  /** Collapsible story sections — all CLOSED by default (reset on every load/refresh). */
  openSections: { story: boolean; notes: boolean; howto: boolean; specs: boolean } = {
    story: false,
    notes: false,
    howto: false,
    specs: false
  };

  toggleSection(key: 'story' | 'notes' | 'howto' | 'specs'): void {
    this.openSections[key] = !this.openSections[key];
  }
  private readonly frontendLowStockThreshold = 5;

  constructor(
    private wishlistService: WishlistService,
    private notification: FrontendNotificationService,
    private cartAnim: CartAnimationService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.wishlistService.wishlist$.subscribe(() => this.syncWishlistState());
    this.http.get<any>(`${environment.freeGiftsApiBaseUrl}/active`).subscribe({
      next: res => { if (res.success) this.freeGifts = res.data || []; },
      error: () => {}
    });
  }

  ngOnChanges(): void {
    this.syncWishlistState();
    this.quantity = 1;
    // cache the variant list once per product change (stable reference for the template)
    this.variants = this.getVariants();
    // pre-select a default variant (first in-stock one) so a size is always chosen
    this.selectDefaultVariant();
    // collapse all story sections whenever the product changes
    this.openSections = { story: false, notes: false, howto: false, specs: false };
  }

  /** Select the first available (in-stock) variant by default; fall back to the first one. */
  private selectDefaultVariant(): void {
    if (this.variants.length === 0) {
      this.selectedSizeIndex = null;
      return;
    }
    const firstAvailable = this.variants.findIndex((_, i) => !this.isVariantSoldOut(i));
    this.selectedSizeIndex = firstAvailable >= 0 ? firstAvailable : 0;
  }

  private syncWishlistState(): void {
    if (this.product) {
      this.isWishlisted = this.wishlistService.isWishlisted(this.product.id);
    }
  }

  getVariants(): { id?: number; name: string; label?: string; price: number; compare_price: number | null; stock: number; low_stock_threshold?: number; is_active?: boolean; sort_order?: number }[] {
    // Primary: read from product.variants[] (new relational table approach)
    const variants = (this.product as any)?.variants;
    if (Array.isArray(variants) && variants.length > 0) {
      return variants
        .filter((v: any) => v.is_active !== false)
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((v: any) => ({ ...v, label: v.name })); // label alias for template backward compat
    }
    // Backward compat: read from specifications.sizes JSONB (old approach)
    const sizes = (this.product as any)?.specifications?.sizes;
    if (Array.isArray(sizes)) {
      return sizes.map((s: any, i: number) => ({
        id: undefined,
        name: s.label || s.name || '',
        label: s.label || s.name || '',
        price: Number(s.price) || 0,
        compare_price: Number(s.compare_price) || 0,
        stock: Number(s.stock) ?? 0,
        is_active: true,
        sort_order: i
      }));
    }
    return [];
  }

  getSizeVariants() { return this.variants; }

  selectSize(index: number): void {
    this.selectedSizeIndex = this.selectedSizeIndex === index ? null : index;
    this.quantity = 1;
  }

  getSelectedVariant() {
    const variants = this.variants;
    if (this.selectedSizeIndex !== null && variants[this.selectedSizeIndex]) {
      return variants[this.selectedSizeIndex];
    }
    return null;
  }

  getDisplayPrice(): number {
    return this.getSelectedVariant()?.price ?? this.product?.price ?? 0;
  }

  getDisplayComparePrice(): number | null {
    const variant = this.getSelectedVariant();
    if (variant) {
      const cp = Number(variant.compare_price ?? 0);
      return cp > 0 ? cp : null;
    }
    return this.product?.compare_price || null;
  }

  private getAvailableStock(): number | null {
    const variant = this.getSelectedVariant();
    if (variant) {
      const s = Number(variant.stock);
      return Number.isFinite(s) && s >= 0 ? s : null;
    }
    const raw =
      (this.product as any)?.stock ??
      (this.product as any)?.quantity ??
      (this.product as any)?.inventory_quantity ??
      (this.product as any)?.available_stock;
    const stock = Number(raw);
    if (!Number.isFinite(stock) || stock < 0) return null;
    return stock;
  }

  /** True when the chosen quantity has reached the available stock — the + button is maxed out. */
  isMaxQuantityReached(): boolean {
    const stock = this.getAvailableStock();
    return stock !== null && this.quantity >= stock;
  }

  incrementQuantity(): void {
    const stock = this.getAvailableStock();
    if (stock !== null) {
      if (stock === 0) {
        this.notification.error(`${this.product?.name || 'This item'} is currently out of stock.`);
        return;
      }
      if (this.quantity >= stock) {
        this.notification.error(`We don't have more than ${stock} in stock right now. Please try again later.`);
        return;
      }
    }
    this.quantity++;
    // just hit the ceiling — tell the customer why the + is now disabled
    if (stock !== null && this.quantity >= stock) {
      this.notification.error(`That's all we have in stock right now (${stock}). Please try again later for more.`);
    }
  }
  decrementQuantity(): void { if (this.quantity > 1) this.quantity--; }

  isVariantSoldOut(index: number): boolean {
    const variants = this.getSizeVariants();
    if (!variants[index]) return false;
    return Number(variants[index].stock) === 0;
  }

  addToCart(): void {
    if (!this.product) return;

    const variants = this.getSizeVariants();
    if (variants.length > 0 && this.selectedSizeIndex === null) {
      this.notification.error('Please select a size before adding to cart.');
      return;
    }

    const stock = this.getAvailableStock();
    if (stock !== null) {
      if (stock === 0) {
        this.notification.error(`${this.product.name} is currently out of stock.`);
        return;
      }
      if (this.quantity > stock) {
        this.notification.error(`Only ${stock} left in stock for ${this.product.name}.`);
        this.quantity = stock;
        return;
      }
    }

    const selectedVariant = this.getSelectedVariant();
    const selected_size = selectedVariant ? (selectedVariant.name || selectedVariant.label) : undefined;
    const variant_id = selectedVariant?.id ?? undefined;

    // fly the gallery image into the navbar cart
    const galleryImg = document.querySelector('.product-gallery-main img') as HTMLImageElement | null;
    if (galleryImg) {
      this.cartAnim.flyToCart(galleryImg.currentSrc || galleryImg.src || '', galleryImg);
    }

    this.addToCartEvent.emit({ product: this.product, quantity: this.quantity, selected_size, variant_id });
  }

  addToWishlist(): void {
    if (this.product) {
      this.wishlistService.toggleWishlist(this.product.id);
    }
  }

  hasDiscount(): boolean {
    const cp = this.getDisplayComparePrice();
    return !!(cp && cp > this.getDisplayPrice());
  }

  getDiscountPercentage(): number {
    const cp = this.getDisplayComparePrice();
    const p = this.getDisplayPrice();
    if (!cp || cp <= p) return 0;
    return Math.round(((cp - p) / cp) * 100);
  }

  getLowStockCount(): number | null {
    return this.getAvailableStock();
  }

  isOutOfStock(): boolean {
    const stock = this.getAvailableStock();
    return stock !== null && stock === 0;
  }

  shouldShowOutOfStockNotice(): boolean {
    const stock = this.getAvailableStock();
    return stock !== null && stock === 0;
  }

  shouldShowLowStockNotice(): boolean {
    const stock = this.getAvailableStock();
    return stock !== null && stock > 0 && stock <= this.frontendLowStockThreshold;
  }

  getWeightUnit(): string {
    const unit = (this.product as any)?.weight_unit || 'ml';
    return unit.toLowerCase() === 'liter' ? 'L' : 'ML';
  }

  getWeightDisplay(): string {
    const raw = (this.product as any)?.weight;
    if (!raw && raw !== 0) return '';
    const num = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(num) || num <= 0) return '';
    const unit = (this.product as any)?.weight_unit || 'ml';
    const unitLabel = unit.toLowerCase() === 'liter' ? 'L' : 'ML';
    return `${num % 1 === 0 ? num : num} ${unitLabel}`;
  }

  getLines(text: string | null | undefined): string[] {
    if (!text) return [];
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }

  hasSpecs(): boolean {
    const s = this.product?.specifications;
    return !!(s?.concentration || s?.fragrance_family || s?.gender || (this.product as any)?.weight);
  }

  getWhatsAppLink(): string {
    const name = this.product?.name || 'this fragrance';
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const msg = encodeURIComponent(`Hi! I'd like to know more about ${name}. ${url}`);
    return `https://wa.me/919274521140?text=${msg}`;
  }
}


