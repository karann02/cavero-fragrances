// combo.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Combo } from './combo.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ComboService {
  private readonly apiUrl = environment.authApiBaseUrl;
  dataChange: BehaviorSubject<Combo[]> = new BehaviorSubject<Combo[]>([]);

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch all combos */
  getAllCombos(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/combos`);
  }

  /** GET: Fetch single combo by ID */
  getComboById(id: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/combos/${id}`);
  }

  /** GET: Fetch products for combo dropdown */
  getProductsForCombo(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/for-combo`);
  }

  /** GET: Fetch categories for combo form */
  getCategoriesForCombo(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/categories/frontend`);
  }

  /** GET: Fetch active predefined combos for storefront */
  getPredefinedCombos(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/combos/predefined`);
  }

  /** GET: Fetch build-your-own-box settings */
  getComboBoxSettings(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/combo-box-settings`);
  }

  /** POST: Save build-your-own-box settings */
  saveComboBoxSettings(settings: { box_price: number } | FormData): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/combo-box-settings`, settings);
  }

  /** POST: Add a new combo */
  addCombo(combo: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/combos`, combo);
  }

  /** PUT: Update an existing combo */
  updateCombo(comboData: any): Observable<any> {
    const comboId = comboData instanceof FormData
      ? String(comboData.get('id') || '').trim()
      : String(comboData?.id || '').trim();

    if (!comboId) {
      return throwError(() => new Error('Combo ID is required for update'));
    }

    return this.httpClient.put<any>(`${this.apiUrl}/combos/${comboId}`, comboData);
  }

  /** DELETE: Remove combos by IDs */
  deleteCombos(ids: string[]): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/combos/bulk-delete`, { ids });
  }

  /** Handle Http operation that failed */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.message);
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }
}
