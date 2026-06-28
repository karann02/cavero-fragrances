import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interface for frontend product (matches your component)
export interface FrontendProduct {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  weight: string;
  discount?: number;
  isFavorite: boolean;
  quantity: number;
  category_name?: string;
}

// Interface for frontend category (matches your component)
export interface FrontendCategory {
  id: number;
  name: string;
  image: string;
  count: number;
  link: string;
}

// Interface for special product (matches your special products component)
export interface SpecialProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  weight: string;
  isFavorite: boolean;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly apiUrl = environment.authApiBaseUrl;
  
  private specialProductsSubject = new BehaviorSubject<SpecialProduct[]>([]);

  specialProducts$ = this.specialProductsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.loadSpecialProducts();
  }

  // Load special products
  loadSpecialProducts(): void {
    this.http.get<{success: boolean, data: SpecialProduct[]}>(`${this.apiUrl}/special`).subscribe({
      next: (res) => {
        if (res.success) {
          this.specialProductsSubject.next(res.data);
        } else {
          console.error('Failed to load special products');
        }
      },
      error: (err) => {
        console.error('Error loading special products:', err);
        this.specialProductsSubject.next([]);
      }
    });
  }

  // Refresh all data sources
  refreshData(): void {
    this.loadSpecialProducts();
  }

  // Refresh only special products
  refreshSpecialProducts(): void {
    this.loadSpecialProducts();
  }

}