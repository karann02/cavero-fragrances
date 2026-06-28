import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

export interface ProductResponse {
  success: boolean;
  data: any[];
  total?: number;
  message?: string;
}
export interface CategoryDetailResponse {
  success: boolean;
    data: {
    id: number;
    name: string;
    slug?: string;
    description?: string;
    image_url?: string;
    // Add other category properties you expect
  };
  message?: string;
}
@Injectable({
  providedIn: 'root'
})
export class CatalogProductsService {
  private readonly apiUrl = environment.authApiBaseUrl;

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch products with filters and pagination */
  getProducts(params: HttpParams): Observable<ProductResponse> {
    return this.httpClient.get<ProductResponse>(`${this.apiUrl}/categoryproducts`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** GET: Fetch products by category id */
  getProductsByCategory(categoryId: string, params: HttpParams): Observable<ProductResponse> {
    let updatedParams = params.set('category_id', categoryId);
    return this.httpClient.get<ProductResponse>(`${this.apiUrl}/categoryproducts`, { params: updatedParams }).pipe(
      catchError(this.handleError)
    );
  }
 getSelectedCategories(categoryIdOrSlug: string): Observable<CategoryDetailResponse> {
  return this.httpClient.get<CategoryDetailResponse>(`${this.apiUrl}/categories/${categoryIdOrSlug}`).pipe(
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
