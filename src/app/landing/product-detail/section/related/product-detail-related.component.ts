import { Component, Input, OnInit, OnChanges, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CartService } from '../../../cart/cart.service';
import { CartAnimationService } from '../../../../shared/services/cart-animation.service';
import { WishlistService } from '../../../customer/wishlist/wishlist.service';
import { environment } from '../../../../../environments/environment';
import { getSeoRouteParam } from '../../../../shared/utils/seo-url.util';

interface RelatedProduct {
  id: number;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  image: string;
  weight: string;
  stock: number;
  quantity: number;
  isFavorite: boolean;
  short_description?: string;
  discount?: boolean;
  discountAmount?: string;
}

@Component({
  selector: 'app-product-detail-related',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './product-detail-related.component.html',
  styleUrl: './product-detail-related.component.scss'
})
export class ProductDetailRelatedComponent implements OnInit, OnChanges {
  @Input() productId: string = '';
  @Input() categoryId?: number;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  relatedProducts: RelatedProduct[] = [];
  private subscriptions = new Subscription();

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    private cartAnim: CartAnimationService,
    private wishlistService: WishlistService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.cartService.cart$.subscribe(() => this.syncCartQuantities())
    );
    this.subscriptions.add(
      this.wishlistService.wishlist$.subscribe(() => this.syncWishlistStates())
    );
    this.load();
  }
  ngOnChanges(): void { this.load(); }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  load(): void {
    if (!this.categoryId) return;
    const params = new HttpParams().set('category_id', String(this.categoryId)).set('limit', '20');
    this.http.get<any>(`${environment.authApiBaseUrl}/categoryproducts`, { params }).subscribe({
      next: (res) => {
        if (res.success) {
          this.relatedProducts = res.data
            .filter((p: any) => String(p.id) !== String(this.productId))
            .map((p: any) => this.format(p));
          this.syncCartQuantities();
          this.syncWishlistStates();
        }
      },
      error: (err) => console.error('Error loading related products:', err)
    });
  }

  private format(data: any): RelatedProduct {
    const hasDiscount = data.compare_price && parseFloat(data.compare_price) > parseFloat(data.price);
    const pct = hasDiscount
      ? Math.round(((data.compare_price - data.price) / data.compare_price) * 100) : 0;
    const img = data.images?.length > 0 ? this.imgUrl(data.images[0]) : 'assets/cavero/img/shop/grocery/01.png';
    return {
      id: data.id,
      name: data.name,
      slug: data.slug || '',
      price: parseFloat(data.price),
      originalPrice: data.compare_price ? parseFloat(data.compare_price) : undefined,
      image: img,
      weight: data.weight ? `${data.weight}${data.weight_unit || ''}` : '',
      stock: Number(data.stock ?? data.quantity ?? data.inventory_quantity ?? data.available_stock ?? 0),
      quantity: 0,
      isFavorite: false,
      short_description: data.short_description ? String(data.short_description).trim() : '',
      discount: hasDiscount,
      discountAmount: hasDiscount ? `-${pct}%` : undefined
    };
  }

  private syncCartQuantities(): void {
    const cart = this.cartService.getCartValue();
    this.relatedProducts.forEach(p => {
      this.cartService.syncItemStock(p.id, p.stock);
      const item = cart.items.find((i: any) => String(i.product_id) === String(p.id));
      p.quantity = item ? item.quantity : 0;
    });
  }

  private syncWishlistStates(): void {
    this.relatedProducts.forEach(p => {
      p.isFavorite = this.wishlistService.isWishlisted(p.id);
    });
  }

  toggleFavorite(product: RelatedProduct): void {
    this.wishlistService.toggleWishlist(product.id);
  }

  incrementQuantity(product: RelatedProduct, event?: MouseEvent): void {
    if (event) {
      const btn = event.currentTarget as HTMLElement;
      const img = btn.closest('.product-card')?.querySelector('img') as HTMLElement | null;
      this.cartAnim.flyToCart(product.image, img);
    }
    this.cartService.addToCart(product as any, 1);
  }

  decrementQuantity(product: RelatedProduct): void {
    if (product.quantity <= 0) return;
    this.cartService.updateQuantity(String(product.id), product.quantity - 1);
  }

  private imgUrl(image: any): string {
    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      if (image.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${image}`;
      if (image.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${image}`;
      return image;
    }
    if (image?.filename) return `${environment.apiGatewayBaseUrl}/uploads/products/${image.filename}`;
    if (image?.url) {
      if (image.url.startsWith('http')) return image.url;
      return `${environment.apiGatewayBaseUrl}${image.url.startsWith('/') ? '' : '/'}${image.url}`;
    }
    return 'assets/cavero/img/shop/grocery/01.png';
  }

  scrollLeft(): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: -440, behavior: 'smooth' });
  }

  scrollRight(): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: 440, behavior: 'smooth' });
  }

  getProductRouteParam(product: RelatedProduct): string {
    return getSeoRouteParam(product);
  }
}
