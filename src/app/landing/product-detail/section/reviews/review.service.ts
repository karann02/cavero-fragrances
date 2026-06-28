import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ReviewService {
    private apiUrl = environment.reviewApiBaseUrl;

    constructor(private http: HttpClient) { }

    getReviews(productId: string | number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/product/${productId}`);
    }

    addReview(data: { user_id: number, product_id: number, rating: number, comment: string }): Observable<any> {
        return this.http.post<any>(this.apiUrl, data);
    }
}
