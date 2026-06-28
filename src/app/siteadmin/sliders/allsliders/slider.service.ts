// slider.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { Slider } from './slider.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SliderService {
  private readonly apiUrl = environment.authApiBaseUrl;
  dataChange: BehaviorSubject<Slider[]> = new BehaviorSubject<Slider[]>([]);

  constructor(private httpClient: HttpClient) {}

  /** GET: Fetch all sliders */
  getAllSliders(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/sliders`);
  }

  /** GET: Fetch single slider by ID */
  getSliderById(id: string): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/sliders/${id}`);
  }

  /** POST: Add a new slider with image */
  addSlider(sliderData: FormData): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/sliders`, sliderData);
  }

  /** PUT: Update an existing slider with optional image */
  updateSlider(sliderId: string, sliderData: FormData): Observable<any> {
    console.log('SliderService.updateSlider called with ID:', sliderId);
    console.log('FormData contents:');
    // TypeScript-safe way to iterate FormData
    const entries = (sliderData as any).entries();
    for (let [key, value] of entries) {
      console.log(`  ${key}:`, value);
    }
    return this.httpClient.put<any>(`${this.apiUrl}/sliders/${sliderId}`, sliderData)
      .pipe(
        map(response => {
          console.log('SliderService.updateSlider response:', response);
          return response;
        }),
        catchError(error => {
          console.error('SliderService.updateSlider error:', error);
          return throwError(() => error);
        })
      );
  }

  /** DELETE: Remove sliders by IDs */
  deleteSliders(ids: string[]): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/sliders/bulk-delete`, { ids });
  }

  /** Handle Http operation that failed */
  private handleError(error: HttpErrorResponse) {
    console.error('An error occurred:', error.message);
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }
}