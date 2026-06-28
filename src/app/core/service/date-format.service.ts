import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { environment } from '../../../environments/environment';

type DateFormatKey = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'MMMM D, YYYY' | 'DD-MMM-YYYY';

@Injectable({
  providedIn: 'root'
})
export class DateFormatService {
  private readonly apiUrl = environment.commonApiBaseUrl;
  private currentFormat = new BehaviorSubject<DateFormatKey>('YYYY-MM-DD');
  currentFormat$ = this.currentFormat.asObservable();

  private formatMap: Record<DateFormatKey, string> = {
    'YYYY-MM-DD': 'yyyy-MM-dd',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MMMM D, YYYY': 'MMMM d, yyyy',
    'DD-MMM-YYYY': 'dd-MMM-yyyy'
  };

  constructor(private http: HttpClient, private datePipe: DatePipe) {
    this.loadDateFormat();
  }

  private loadDateFormat() {
    this.http.get<{dateFormat: DateFormatKey}>(`${this.apiUrl}/date-format`).subscribe({
      next: (response) => this.currentFormat.next(response.dateFormat),
      error: () => this.currentFormat.next('YYYY-MM-DD')
    });
  }

  getAvailableFormats(): Observable<{value: DateFormatKey, label: string}[]> {
    return this.http.get<{value: DateFormatKey, label: string}[]>(`${this.apiUrl}/date-formats`);
  }

  updateDateFormat(format: DateFormatKey): Observable<any> {
    return this.http.put(`${this.apiUrl}/date-format`, { dateFormat: format });
  }

  formatDate(date: Date | string): string {
    const angularFormat = this.formatMap[this.currentFormat.value] || 'yyyy-MM-dd';
    return this.datePipe.transform(date, angularFormat) || '';
  }
}