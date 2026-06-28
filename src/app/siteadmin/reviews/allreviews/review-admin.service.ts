import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReviewAdminService {
  private apiUrl = environment.reviewApiBaseUrl;

  constructor(private http: HttpClient) {}

  getAllReviews(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin`);
  }

  updateReviewStatus(id: number, is_active: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { is_active });
  }
}
