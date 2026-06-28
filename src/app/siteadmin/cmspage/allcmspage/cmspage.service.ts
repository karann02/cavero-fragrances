import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CmsService {
  private readonly apiUrl = environment.authApiBaseUrl;

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch all CMS pages */
  getAllCmsPages(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/cms-pages`);
  }

  /** GET: Fetch CMS page by ID */
  getCmsPageById(id: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/cms-pages/${id}`);
  }

  /** POST: Add a new CMS page */
  addCmsPage(cmsPage: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/cms-pages`, cmsPage);
  }

  /** PUT: Update an existing CMS page */
  updateCmsPage(cmsPageData: any): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/cms-pages/${cmsPageData.id}`, cmsPageData);
  }

  /** DELETE: Remove CMS pages by IDs */
  deleteCmsPages(ids: number[]): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/cms-pages/bulk-delete`, { ids });
  }

  /** Handle Http operation that failed */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.message);
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }
}