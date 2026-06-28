import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ReturnService {
    private apiUrl = environment.returnApiBaseUrl;

    constructor(private http: HttpClient) { }

    requestReturn(data: { order_id: number, reason: string }): Observable<any> {
        return this.http.post<any>(this.apiUrl, data);
    }

    getMyReturns(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/user`);
    }
}
