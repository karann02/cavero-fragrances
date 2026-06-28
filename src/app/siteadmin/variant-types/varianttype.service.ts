import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '@core/service/auth.service';

@Injectable({
  providedIn: 'root',
})
export class VariantTypeService {
  private readonly apiUrl = `${environment.apiGatewayBaseUrl}/api/variant-types`;

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /** GET / — public, all active variant types ordered by sort_order */
  getAll(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}`);
  }

  /** GET /all — admin, all including inactive */
  getAllAdmin(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/all`, {
      headers: this.getAuthHeaders()
    });
  }

  /** POST / — admin create */
  add(data: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  /** PUT /:id — admin update */
  update(data: any): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/${data.id}`, data, {
      headers: this.getAuthHeaders()
    });
  }

  /** POST /bulk-delete — admin bulk delete */
  delete(ids: number[]): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/bulk-delete`, { ids }, {
      headers: this.getAuthHeaders()
    });
  }
}
