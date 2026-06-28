import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly api = environment.authApiBaseUrl;
  private readonly catApi = environment.categoryApiBaseUrl;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.api}/dashboard/stats`).pipe(
      catchError(() => of({ success: false, data: {} }))
    );
  }

  /** Fetch real counts directly from working endpoints */
  getLiveCounts(): Observable<{ totalStock: number; lowStock: number; lowStockItems: any[]; categories: number; customers: number }> {
    return forkJoin({
      products:   this.http.get<any>(`${this.api}/products`).pipe(catchError(() => of({ data: [] }))),
      categories: this.http.get<any>(`${this.catApi}`).pipe(catchError(() => of({ data: [] }))),
      customers:  this.http.get<any>(`${this.api}/users`).pipe(catchError(() => of({ data: [] }))),
    }).pipe(
      map(res => {
        const prods: any[] = Array.isArray(res.products.data) ? res.products.data : [];
        const lowStockItems = prods.filter(p => (p.quantity ?? p.stock ?? 0) <= 10);
        const totalStock = prods.reduce((sum, p) => sum + Math.max(0, Number(p.quantity ?? p.stock ?? 0) || 0), 0);
        return {
          totalStock,
          lowStock:      lowStockItems.length,
          lowStockItems,
          categories:    Array.isArray(res.categories.data) ? res.categories.data.length : 0,
          customers:     Array.isArray(res.customers.data)  ? res.customers.data.length  : 0,
        };
      })
    );
  }
}
