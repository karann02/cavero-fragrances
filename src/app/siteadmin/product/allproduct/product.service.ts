import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Product } from './product.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiUrl = environment.authApiBaseUrl;

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch all products */
  getAllProducts(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/products`);
  }

  /** GET: Fetch product by ID */
  getProductById(id: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/products/${id}`);
  }

  /** POST: Add a new product */
  // addProduct(product: any): Observable<any> {
  //   return this.httpClient.post<any>(`${this.apiUrl}/products`, product);
  // }




  // In your product.service.ts
addProductWithImages(formData: FormData): Observable<any> {
  return this.httpClient.post<any>(`${this.apiUrl}/products`, formData);
}

updateProductWithImages(formData: FormData): Observable<any> {
  const id = formData.get('id');
  return this.httpClient.put<any>(`${this.apiUrl}/products/${id}`, formData);
}

  /** PATCH: Quick inline update for lightweight fields */
  quickUpdateProduct(productId: string | number, payload: Record<string, any>): Observable<any> {
    return this.httpClient.patch<any>(`${this.apiUrl}/products/${productId}`, payload);
  }

  /** PUT: Update an existing product */
  // updateProduct(productData: any): Observable<any> {
  //   return this.httpClient.put<any>(`${this.apiUrl}/products/${productData.id}`, productData);
  // }

  /** DELETE: Remove products by IDs */
  deleteProducts(ids: string[]): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/products/delete`, { ids });
  }
 getFeaturedProducts(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/products/featured`);
  }

  /** 🆕 GET: Fetch products by category */
  getProductsByCategory(categoryId: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/products/category/${categoryId}`);
  }

  /** 🆕 GET: Search products */
  searchProducts(query: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/products/search?q=${query}`);
  }

  /** 🆕 PATCH: Update product stock */
  updateProductStock(productId: string, quantity: number, action: string = 'set'): Observable<any> {
    return this.httpClient.patch<any>(`${this.apiUrl}/products/${productId}/stock`, {
      quantity,
      action
    });
  }

  /** 🆕 GET: Get low stock products */
  getLowStockProducts(threshold: number = 10): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/products/low-stock?threshold=${threshold}`);
  }
  /** Handle Http operation that failed */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.message);
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }
}
