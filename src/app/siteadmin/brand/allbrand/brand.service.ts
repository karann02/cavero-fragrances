import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Brand } from './brand.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private readonly apiUrl = environment.brandApiBaseUrl;
  dataChange: BehaviorSubject<Brand[]> = new BehaviorSubject<Brand[]>([]);

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch all brands */
  getAllBrands(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}`).pipe(
      catchError(this.handleError)
    );
  }

  /** GET: Fetch brand by ID */
  getBrandById(id: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: Add a new brand */
  addBrand(brand: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, brand).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: Add brand with logo upload */
  addBrandWithLogo(formData: FormData): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, formData).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: Update an existing brand */
  updateBrand(brandData: any): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${brandData.id}`, brandData).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: Update brand with logo upload */
  updateBrandWithLogo(formData: FormData): Observable<any> {
    const id = formData.get('id');
    return this.httpClient.put<any>(`${this.apiUrl}/${id}`, formData).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: Remove brand */
  deleteBrand(id: string): Observable<any> {
    return this.httpClient.delete<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: Bulk delete brands */
  deleteBrands(ids: string[]): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/bulk-delete`, { ids }).pipe(
      catchError(this.handleError)
    );
  }

  /** GET: Fetch featured brands */
  getFeaturedBrands(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/featured`).pipe(
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