import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService, SpecialProduct } from '../popular-products/product.service';
import { CartService } from '../../../../app/landing/cart/cart.service';
import { CartAnimationService } from '../../../../app/shared/services/cart-animation.service';
import { WishlistService } from '../../../../app/landing/customer/wishlist/wishlist.service';
import { Subscription } from 'rxjs';
import { getSeoRouteParam } from '../../../../app/shared/utils/seo-url.util';
import { TiltDirective } from '../../../../app/core/directives/tilt.directive';

@Component({
  selector: 'app-cavero-special-products',
  standalone: true,
  imports: [CommonModule, RouterModule, TiltDirective],
  templateUrl: './special-products.component.html',
  styleUrls: ['./special-products.component.scss']
})
export class CaveroSpecialProductsComponent implements OnInit, OnDestroy {
  specialProducts: SpecialProduct[] = [];
  currentIndex = 0;

  private subscriptions = new Subscription();

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private cartAnim: CartAnimationService,
    private wishlistService: WishlistService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.productService.specialProducts$.subscribe(products => {
        this.specialProducts = products;
        this.clampSliderPosition();
        this.syncCartQuantities();
        this.syncWishlistStates();
      })
    );
    this.subscriptions.add(
      this.cartService.cart$.subscribe(() => this.syncCartQuantities())
    );
    this.subscriptions.add(
      this.wishlistService.wishlist$.subscribe(() => this.syncWishlistStates())
    );
    this.productService.refreshSpecialProducts();
  }

  private syncCartQuantities(): void {
    const cart = this.cartService.getCartValue();
    this.specialProducts.forEach(p => {
      this.cartService.syncItemStock(p.id, p.stock);
      const item = cart.items.find(i => String(i.product_id) === String(p.id));
      p.quantity = item ? item.quantity : 0;
    });
  }

  private syncWishlistStates(): void {
    this.specialProducts.forEach(p => {
      p.isFavorite = this.wishlistService.isWishlisted(p.id);
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  toggleFavorite(product: SpecialProduct) {
    this.wishlistService.toggleWishlist(product.id);
  }

  /** Homepage: a single click adds one to the cart, auto-selecting the default variant. */
  addToCart(product: SpecialProduct, event: MouseEvent) {
    const btn = event.currentTarget as HTMLElement;
    const img = btn.closest('.cavero-signature-card')?.querySelector('.cavero-signature-img') as HTMLElement | null;
    this.cartAnim.flyToCart(product.image, img);
    const v = this.getDefaultVariant(product);
    if (v) {
      this.cartService.addToCart(product, 1, true, v.name, v.id);
    } else {
      this.cartService.addToCart(product, 1);
    }
  }

  /** First in-stock variant (fallback to first); null if the product has no variants. */
  private getDefaultVariant(product: SpecialProduct) {
    const variants = (product.variants || []).filter(v => v.is_active !== false);
    if (!variants.length) return null;
    return variants.find(v => Number(v.stock) > 0) || variants[0];
  }

  @HostListener('window:resize')
  onResize(): void {
    this.clampSliderPosition();
  }

  get visibleSpecialProducts(): SpecialProduct[] {
    return this.specialProducts.slice(this.currentIndex, this.currentIndex + this.visibleSlides);
  }

  get visibleSlides(): number {
    if (typeof window === 'undefined') return 5;
    if (window.innerWidth < 576) return 2;
    if (window.innerWidth < 768) return 3;
    if (window.innerWidth < 1200) return 4;
    return 5;
  }

  get canSlidePrev(): boolean {
    return this.currentIndex > 0;
  }

  get canSlideNext(): boolean {
    return this.currentIndex + this.visibleSlides < this.specialProducts.length;
  }

  get isMobileViewport(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  }

  prevSlide(): void {
    if (!this.canSlidePrev) return;
    this.currentIndex = Math.max(0, this.currentIndex - 1);
  }

  nextSlide(): void {
    if (!this.canSlideNext) return;
    this.currentIndex = Math.min(this.maxStartIndex, this.currentIndex + 1);
  }

  private get maxStartIndex(): number {
    return Math.max(0, this.specialProducts.length - this.visibleSlides);
  }

  private clampSliderPosition(): void {
    this.currentIndex = Math.min(this.currentIndex, this.maxStartIndex);
  }

  getProductRouteParam(product: SpecialProduct): string {
    return getSeoRouteParam(product);
  }
}
