import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

export interface CategoryResponse {
  success: boolean;
  data: any[];
  message?: string;
}

export interface Brand {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogFiltersService {
  private readonly categoriesApiUrl = `${environment.authApiBaseUrl}/categories/frontend`;
  private readonly brandsApiUrl = `${environment.brandApiBaseUrl}`;

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch all categories for frontend */
  getCategories(): Observable<CategoryResponse> {
    return this.httpClient.get<CategoryResponse>(this.categoriesApiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /** GET: Fetch all brands */
  getBrands(): Observable<any> {
    return this.httpClient.get<any>(this.brandsApiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /** GET: Fetch featured brands */
  getFeaturedBrands(): Observable<any> {
    return this.httpClient.get<any>(`${this.brandsApiUrl}/featured`).pipe(
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