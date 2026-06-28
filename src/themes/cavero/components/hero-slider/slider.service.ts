import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Slider {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  image: string;
  button_text: string | null;
  button_url: string | null;
  background_color: string | null;
  text_color: string | null;
  sort_order: number;
  is_active: boolean;
  display_on?: 'all' | 'desktop' | 'mobile';
  screen_type?: 'desktop' | 'mobile'; // legacy fallback
}

export interface SliderResponse {
  success: boolean;
  message: string;
  data: Slider[];
}

@Injectable({
  providedIn: 'root'
})
export class SliderService {
  private apiUrl = `${environment.authApiBaseUrl}/sliders`;

  constructor(private http: HttpClient) {}

  getActiveSliders(): Observable<SliderResponse> {
    return this.http.get<SliderResponse>(`${this.apiUrl}/active`);
  }
}
