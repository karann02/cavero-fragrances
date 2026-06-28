// producttype.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { ProductType } from './producttype.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProductTypeService {
  private readonly apiUrl = environment.authApiBaseUrl;
  dataChange: BehaviorSubject<ProductType[]> = new BehaviorSubject<ProductType[]>([]);

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch all producttypes */
  getAllProductTypes(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/producttypes`);
  }

  /** GET: Fetch single producttype by ID */
  getProductTypeById(id: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/producttypes/${id}`);
  }

  /** GET: Fetch products for producttype dropdown */
  getProductsForProductType(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/for-producttype`);
  }

  /** POST: Add a new producttype */
  addProductType(producttype: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/producttypes`, producttype);
  }

  /** PUT: Update an existing producttype */
  updateProductType(producttypeData: any): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/producttypes/${producttypeData.id}`, producttypeData);
  }

  /** DELETE: Remove producttypes by IDs */
  deleteProductTypes(ids: string[]): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/producttypes/bulk-delete`, { ids });
  }

  /** Handle Http operation that failed */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.message);
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }
}