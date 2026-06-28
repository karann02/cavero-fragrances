import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ProductDetailResponse {
  success: boolean;
  data: any;
  message?: string;
}

export interface Product {
  id: number;
  name: string;
  slug?: string;
  price: number;
  compare_price?: number;
  originalPrice?: number; // Add this
  description: string;
  short_description?: string;
  ingredients: string;
  calories: string;
  delivery_info: string;
  weight: string;
  category: string;
  category_id?: number;
  category_slug?: string;
  images: any[];
  image?: string; // Add this for single image
  features: string[];
  stock: number;
  sku?: string;
  brand?: string;
  discount?: boolean; // Add this
  discountAmount?: string; // Add this
  seo_title?: string;
  seo_description?: string;
  specifications?: { concentration?: string; fragrance_family?: string; gender?: string; sizes?: any[]; [key: string]: any };
  weight_unit?: string;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  tags?: string[];
  variants?: Array<{
    id: number;
    name: string;
    sku?: string;
    price: number;
    compare_price?: number | null;
    stock: number;
    low_stock_threshold: number;
    is_active: boolean;
    sort_order: number;
  }>;
}
export interface RelatedProductsResponse {
  success: boolean;
  data: any[];
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductDetailService {
  private readonly apiUrl = environment.authApiBaseUrl;

  constructor(private httpClient: HttpClient) { }

  /** GET: Fetch product by ID */
  getProductById(productIdOrSlug: string): Observable<ProductDetailResponse> {
    return this.httpClient.get<ProductDetailResponse>(`${this.apiUrl}/products/${productIdOrSlug}`).pipe(
      catchError(this.handleError)
    );
  }

  /** GET: Fetch related products */
  getRelatedProducts(productId: string, categoryId?: number): Observable<RelatedProductsResponse> {
    let url = `${this.apiUrl}/products/related/${productId}`;
    if (categoryId) {
      url += `?category_id=${categoryId}`;
    }
    return this.httpClient.get<RelatedProductsResponse>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** Handle Http operation that failed */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.message);
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }
}
