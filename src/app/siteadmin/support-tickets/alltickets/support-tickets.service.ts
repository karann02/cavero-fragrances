import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupportTicketsService {
  private readonly apiUrl = environment.supportTicketsApiBaseUrl;

  constructor(private http: HttpClient) {}

  getTickets(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}`);
  }

  updateStatus(id: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status });
  }
}
