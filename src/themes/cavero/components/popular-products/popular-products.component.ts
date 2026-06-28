import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductService, FrontendProduct, FrontendCategory } from './product.service';
import { CartService } from '../../../../app/landing/cart/cart.service';
import { CartAnimationService } from '../../../../app/shared/services/cart-animation.service';
import { WishlistService } from '../../../../app/landing/customer/wishlist/wishlist.service';
import { Subscription } from 'rxjs';
import { getSeoRouteParam } from '../../../../app/shared/utils/seo-url.util';
import { TiltDirective } from '../../../../app/core/directives/tilt.directive';
import { AnimateOnScrollDirective } from '../../../../app/core/directives/animate-on-scroll.directive';

@Component({
  selector: 'app-cavero-popular-products',
  standalone: true,
  imports: [CommonModule, RouterModule, TiltDirective, AnimateOnScrollDirective],
  templateUrl: './popular-products.component.html',
  styleUrls: ['./popular-products.component.scss']
})
export class CaveroPopularProductsComponent implements OnInit, OnDestroy {
  productCategories: FrontendCategory[] = [];
  popularProducts: FrontendProduct[] = [];

  private subscriptions = new Subscription();

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private cartAnim: CartAnimationService,
    private wishlistService: WishlistService
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.productService.productCategories$.subscribe(categories => {
        this.productCategories = categories;
      })
    );
    this.subscriptions.add(
      this.productService.popularProducts$.subscribe(products => {
        this.popularProducts = products;
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
    this.productService.refreshData();
  }

  private syncCartQuantities(): void {
    const cart = this.cartService.getCartValue();
    this.popularProducts.forEach(p => {
      this.cartService.syncItemStock(p.id, p.stock);
      const item = cart.items.find(i => String(i.product_id) === String(p.id));
      p.quantity = item ? item.quantity : 0;
    });
  }

  private syncWishlistStates(): void {
    this.popularProducts.forEach(p => {
      p.isFavorite = this.wishlistService.isWishlisted(p.id);
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  toggleFavorite(product: FrontendProduct) {
    this.wishlistService.toggleWishlist(product.id);
  }

  /** Homepage: a single click adds one to the cart, auto-selecting the default variant. */
  addToCart(product: FrontendProduct, event: MouseEvent) {
    const btn = event.currentTarget as HTMLElement;
    const img = btn.closest('.cavero-product-card')?.querySelector('.cavero-product-img') as HTMLElement | null;
    this.cartAnim.flyToCart(product.image, img);
    const v = this.getDefaultVariant(product);
    if (v) {
      this.cartService.addToCart(product, 1, true, v.name, v.id);
    } else {
      this.cartService.addToCart(product, 1);
    }
  }

  /** First in-stock variant (fallback to first); null if the product has no variants. */
  private getDefaultVariant(product: FrontendProduct) {
    const variants = (product.variants || []).filter(v => v.is_active !== false);
    if (!variants.length) return null;
    return variants.find(v => Number(v.stock) > 0) || variants[0];
  }

  refreshData() {
    this.productService.refreshData();
  }

  get visiblePopularProducts(): FrontendProduct[] {
    return this.popularProducts.slice(0, 8);
  }

  getProductRouteParam(product: FrontendProduct): string {
    return getSeoRouteParam(product);
  }
}
