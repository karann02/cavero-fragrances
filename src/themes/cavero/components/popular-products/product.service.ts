import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Product } from '../../../../app/siteadmin/product/allproduct/product.model';
import { Category } from '../../../../app/siteadmin/categories/allcategories/category.model';
import { environment } from '../../../../environments/environment';
import { getSeoRouteParam } from '../../../../app/shared/utils/seo-url.util';

// Interface for frontend product (matches your component)
export interface FrontendProduct {
  id: number;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  image: string;
  weight: string;
  short_description?: string;
  discount?: number;
  isFavorite: boolean;
  quantity: number;
  stock?: number;
  variants?: Array<{ id: number; name: string; price: number; compare_price?: number | null; stock: number; is_active?: boolean; sort_order?: number }>;
  category_name?: string;
  category_slug?: string;
}

// Interface for frontend category (matches your component)
export interface FrontendCategory {
  id: number;
  name: string;
  slug?: string;
  image: string;
  count: number;
  link: string;
}

// Interface for special product (matches your special products component)
export interface SpecialProduct {
  id: number;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  image: string;
  weight: string;
  short_description?: string;
  discount?: number;
  isFavorite: boolean;
  quantity: number;
  stock?: number;
  variants?: Array<{ id: number; name: string; price: number; compare_price?: number | null; stock: number; is_active?: boolean; sort_order?: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly apiUrl = environment.authApiBaseUrl;
  private readonly fallbackImage = 'assets/images/cavero-logo.png';
  
  private popularProductsSubject = new BehaviorSubject<FrontendProduct[]>([]);
  private productCategoriesSubject = new BehaviorSubject<FrontendCategory[]>([]);
  private specialProductsSubject = new BehaviorSubject<SpecialProduct[]>([]);

  popularProducts$ = this.popularProductsSubject.asObservable();
  productCategories$ = this.productCategoriesSubject.asObservable();
  specialProducts$ = this.specialProductsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loadPopularProducts();
    this.loadProductCategories();
    this.loadSpecialProducts();
  }

  // Load popular products
  loadPopularProducts(): void {
    this.http.get<{success: boolean, data: FrontendProduct[]}>(`${this.apiUrl}/popular`).subscribe({
      next: (res) => {
        if (res.success) {
          const normalized = res.data.map(product => ({
            ...product,
            weight: (product as any).weight ? `${(product as any).weight}${(product as any).weight_unit || ''}` : '',
            short_description: (product as any).short_description ? String((product as any).short_description).trim() : '',
            stock:
              (product as any).stock ??
              (product as any).available_stock ??
              (product as any).inventory_quantity ??
              (product as any).product_stock ??
              (product as any).quantity ??
              undefined,
            image: this.normalizeImageUrl(product.image)
          }));
          this.popularProductsSubject.next(normalized);
        } else {
          console.error('Failed to load popular products');
        }
      },
      error: (err) => {
        console.error('Error loading popular products:', err);
        this.popularProductsSubject.next([]);
      }
    });
  }

  // Load product categories with counts
  loadProductCategories(): void {
    this.http.get<{success: boolean, data: FrontendCategory[]}>(`${this.apiUrl}/with-counts`).subscribe({
      next: (res) => {
        if (res.success) {
          const normalized = res.data.map(category => ({
            ...category,
            image: this.normalizeImageUrl(category.image),
            link: category.link || `/shop-category/${getSeoRouteParam(category)}`
          }));
          this.productCategoriesSubject.next(normalized);
        } else {
          console.error('Failed to load product categories');
        }
      },
      error: (err) => {
        console.error('Error loading product categories:', err);
        this.productCategoriesSubject.next([]);
      }
    });
  }

  // Load special products — only featured ones
  loadSpecialProducts(): void {
    this.http.get<{success: boolean, data: SpecialProduct[]}>(`${this.apiUrl}/products/featured`).subscribe({
      next: (res) => {
        if (res.success) {
          const normalized = res.data.map(product => ({
            ...product,
            weight: (product as any).weight ? `${(product as any).weight}${(product as any).weight_unit || ''}` : '',
            short_description: (product as any).short_description ? String((product as any).short_description).trim() : '',
            stock:
              (product as any).stock ??
              (product as any).available_stock ??
              (product as any).inventory_quantity ??
              (product as any).product_stock ??
              (product as any).quantity ??
              undefined,
            image: this.normalizeImageUrl(product.image)
          }));
          this.specialProductsSubject.next(normalized);
        } else {
          this.specialProductsSubject.next([]);
        }
      },
      error: (err) => {
        console.error('Error loading featured products:', err);
        this.specialProductsSubject.next([]);
      }
    });
  }

  private normalizeImageUrl(image?: string): string {
    if (!image) return this.fallbackImage;
    if (image.startsWith('http')) return image;
    if (image.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${image}`;
    if (image.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${image}`;
    // assets/uploads/ must be checked before generic assets/
    if (image.startsWith('assets/uploads/')) {
      const filename = image.split('/').pop();
      return `${environment.apiGatewayBaseUrl}/uploads/products/${filename}`;
    }
    if (image.startsWith('assets/')) return image;
    return image || this.fallbackImage;
  }

  // Refresh all data sources
  refreshData(): void {
    this.loadPopularProducts();
    this.loadProductCategories();
    this.loadSpecialProducts();
  }

  // Refresh only special products
  refreshSpecialProducts(): void {
    this.loadSpecialProducts();
  }

  // Toggle favorite status
  toggleFavorite(productId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/products/${productId}/favorite`, {});
  }

  // Add to cart
  addToCart(productId: number, quantity: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cart/add`, {
      product_id: productId,
      quantity: quantity
    });
  }

  // Update cart quantity
  updateCartQuantity(productId: number, quantity: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/cart/update`, {
      product_id: productId,
      quantity: quantity
    });
  }
}
