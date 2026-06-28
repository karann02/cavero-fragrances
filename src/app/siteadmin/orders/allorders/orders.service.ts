import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Order } from './order.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly apiUrl = environment.authApiBaseUrl;
  dataChange: BehaviorSubject<Order[]> = new BehaviorSubject<Order[]>([]);

  constructor(private httpClient: HttpClient) {}

getOrders(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/orders`);
  }

  

  updateOrderStatus(orderId: string, status: string): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/orders/${orderId}/status`, { order_status: status });
  }

  /** Handle Http operation that failed */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.message);
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }
}