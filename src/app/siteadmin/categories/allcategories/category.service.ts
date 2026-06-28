import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Category } from './category.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly apiUrl = `${environment.apiGatewayBaseUrl}/api/categories`;
  dataChange: BehaviorSubject<Category[]> = new BehaviorSubject<Category[]>([]);

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch all categories */
  getAllCategories(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}`);
  }

  /** GET: Fetch parent categories only (categories without parent) */
  getParentCategories(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/parents`);
  }

  /** GET: Fetch categories for dropdown (with hierarchy info) */
  getCategoriesForDropdown(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/dropdown`);
  }

  /** GET: Fetch single category by ID */
  getCategoryById(id: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/${id}`);
  }

  /** POST: Add a new category */
  addCategory(category: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, category);
  }

  /** PUT: Update an existing category */
  updateCategory(categoryData: any): Observable<any> {
    if (categoryData instanceof FormData) {
      const id = categoryData.get('id');
      return this.httpClient.put<any>(`${this.apiUrl}/${id}`, categoryData);
    }
    return this.httpClient.put<any>(`${this.apiUrl}/${categoryData.id}`, categoryData);
  }

  /** DELETE: Remove categories by IDs */
  deleteCategories(ids: string[]): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/bulk-delete`, { ids });
  }

  /** POST: Import categories from CSV */
  importCategoriesFromCSV(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post<any>(`${this.apiUrl}/import-csv`, formData);
  }

  /** Handle Http operation that failed */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.message);
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }
}
