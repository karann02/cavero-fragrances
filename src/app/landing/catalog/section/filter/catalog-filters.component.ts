import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { CatalogFiltersService, CategoryResponse, Brand } from './catalog-filters.service';
import { environment } from '../../../../../environments/environment';
import { getSeoRouteParam } from '../../../../shared/utils/seo-url.util';

interface Category {
  id: number;
  name: string;
  slug?: string;
  image_url?: string;
  children?: Category[];
}

export interface ActiveFilters {
  priceRange: { min: number; max: number };
  status: string[];
  labels: string[];
  concentration: string[];
  fragranceFamily: string[];
  gender: string[];
}

@Component({
  selector: 'app-catalog-filters',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './catalog-filters.component.html',
  styleUrls: ['./catalog-filters.component.scss']
})
export class CatalogFiltersComponent implements OnInit {

  @Input() categoryId: string | null = null;
  @Output() filtersChanged = new EventEmitter<ActiveFilters>();

  categories: Category[] = [];
  brands: Brand[] = [];
  loading = false;
  categoryProducts: Record<number, { id: number; name: string; slug?: string }[]> = {};
  loadingCategory: Record<number, boolean> = {};

  selectedPriceMin: number | null = null;
  selectedPriceMax: number | null = null;
  selectedStatus: string[] = [];
  selectedConcentration: string[] = [];
  selectedFamily: string[] = [];
  selectedGender: string[] = [];

  expandedCategoryId: number | null = null;
  isPriceOpen = true;
  isStatusOpen = true;
  isConcentrationOpen = true;
  isFamilyOpen = true;
  isGenderOpen = true;

  readonly concentrationOptions = [
    'Attar / Itr',
    'EDP',
    'EDT',
    'Parfum Extrait'
  ];

  readonly familyOptions = [
    'Oriental / Oud',
    'Floral',
    'Fresh / Citrus',
    'Spicy / Amber',
    'Gourmand',
    'Musk',
    'Aquatic'
  ];

  readonly genderOptions = ['Men', 'Women', 'Unisex'];

  resetAll(): void {
    this.selectedPriceMin = null;
    this.selectedPriceMax = null;
    this.selectedStatus = [];
    this.selectedConcentration = [];
    this.selectedFamily = [];
    this.selectedGender = [];
    this.emit();
  }

  constructor(
    private catalogFiltersService: CatalogFiltersService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  createSafeId(name: string): string {
    return name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
  }

  loadCategories(): void {
    this.loading = true;
    this.catalogFiltersService.getCategories().subscribe({
      next: (res: CategoryResponse) => {
        if (res.success) this.categories = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggleCategory(category: Category): void {
    this.expandedCategoryId = this.expandedCategoryId === category.id ? null : category.id;
    if (this.categoryProducts[category.id] !== undefined) return;
    this.loadingCategory[category.id] = true;
    const params = new HttpParams().set('category_id', String(category.id)).set('limit', '20');
    this.http.get<any>(`${environment.authApiBaseUrl}/categoryproducts`, { params }).subscribe({
      next: (res) => {
        this.categoryProducts[category.id] = res.success
          ? res.data.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug }))
          : [];
        this.loadingCategory[category.id] = false;
      },
      error: () => {
        this.categoryProducts[category.id] = [];
        this.loadingCategory[category.id] = false;
      }
    });
  }

  isCategoryOpen(categoryId: number): boolean {
    return this.expandedCategoryId === categoryId;
  }

  onPriceChange(): void {
    this.emit();
  }

  onStatusChange(status: string, event: any): void {
    if (event.target.checked) {
      this.selectedStatus = [...this.selectedStatus, status];
    } else {
      this.selectedStatus = this.selectedStatus.filter(s => s !== status);
    }
    this.emit();
  }

  removeStatus(status: string): void {
    this.selectedStatus = this.selectedStatus.filter(s => s !== status);
    this.emit();
  }

  clearFilters(): void {
    this.selectedPriceMin = null;
    this.selectedPriceMax = null;
    this.selectedStatus = [];
    this.selectedConcentration = [];
    this.selectedFamily = [];
    this.selectedGender = [];
    this.emit();
  }

  togglePriceSection(): void { this.isPriceOpen = !this.isPriceOpen; }
  toggleStatusSection(): void { this.isStatusOpen = !this.isStatusOpen; }
  toggleConcentrationSection(): void { this.isConcentrationOpen = !this.isConcentrationOpen; }
  toggleFamilySection(): void { this.isFamilyOpen = !this.isFamilyOpen; }
  toggleGenderSection(): void { this.isGenderOpen = !this.isGenderOpen; }

  onConcentrationChange(value: string, event: any): void {
    this.selectedConcentration = event.target.checked
      ? [...this.selectedConcentration, value]
      : this.selectedConcentration.filter(c => c !== value);
    this.emit();
  }

  onFamilyChange(value: string, event: any): void {
    this.selectedFamily = event.target.checked
      ? [...this.selectedFamily, value]
      : this.selectedFamily.filter(f => f !== value);
    this.emit();
  }

  onGenderChange(value: string, event: any): void {
    this.selectedGender = event.target.checked
      ? [...this.selectedGender, value]
      : this.selectedGender.filter(g => g !== value);
    this.emit();
  }

  get hasActiveFilters(): boolean {
    return this.selectedStatus.length > 0
      || this.selectedPriceMin !== null
      || this.selectedPriceMax !== null
      || this.selectedConcentration.length > 0
      || this.selectedFamily.length > 0
      || this.selectedGender.length > 0;
  }

  private emit(): void {
    const labels: string[] = [];

    this.selectedStatus.forEach(s => {
      if (s === 'instock') labels.push('In stock');
      if (s === 'sale') labels.push('% Sale');
      if (s === 'delivery') labels.push('Free delivery');
    });

    if (this.selectedPriceMin !== null || this.selectedPriceMax !== null) {
      const min = this.selectedPriceMin ?? 0;
      const max = this.selectedPriceMax ?? 99999;
      labels.push(`₹${min} – ₹${max}`);
    }

    this.selectedConcentration.forEach(c => labels.push(c));
    this.selectedFamily.forEach(f => labels.push(f));
    this.selectedGender.forEach(g => labels.push(g));

    this.filtersChanged.emit({
      priceRange: {
        min: this.selectedPriceMin ?? 0,
        max: this.selectedPriceMax ?? 99999
      },
      status: this.selectedStatus,
      labels,
      concentration: [...this.selectedConcentration],
      fragranceFamily: [...this.selectedFamily],
      gender: [...this.selectedGender]
    });
  }

  getCategoryImageUrl(imageUrl?: string, index: number = 0): string {
    if (imageUrl) {
      if (imageUrl.startsWith('http')) return imageUrl;
      if (imageUrl.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${imageUrl}`;
      if (imageUrl.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${imageUrl}`;
      if (!imageUrl.includes('/')) return `${environment.apiGatewayBaseUrl}/uploads/categories/${imageUrl}`;
      return imageUrl;
    }
    return 'assets/cavero/img/shop/grocery/categories/0' + ((index % 7) + 1) + '.png';
  }

  getProductRouteParam(product: any): string {
    return getSeoRouteParam(product);
  }

  getCategoryRouteParam(category: Category): string {
    return getSeoRouteParam(category);
  }
}
