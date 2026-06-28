import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CatalogProductsService } from '../product/catalog-products.service';

@Component({
  selector: 'app-catalog-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="container pt-lg-2 my-3 my-lg-4" aria-label="breadcrumb">
      <ol class="breadcrumb">
        <li class="breadcrumb-item"><a routerLink="/">Home</a></li>
        <li *ngIf="categoryId" class="breadcrumb-item"><a routerLink="/shop">Catalog</a></li>
        <li *ngIf="categoryName" class="breadcrumb-item active" aria-current="page">
          {{categoryName}}
        </li>
        <li *ngIf="!categoryId" class="breadcrumb-item active" aria-current="page">
          Catalog with sidebar filters
        </li>
      </ol>
    </nav>
  `
})
export class CatalogBreadcrumbComponent implements OnInit {
  @Input() categoryId: string | null = null;
  categoryName: string = '';

  constructor(private catalogProductsService: CatalogProductsService) {}

  ngOnInit(): void {
    if (this.categoryId) {
      this.catalogProductsService.getSelectedCategories(this.categoryId)
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Try different possible structures
              if (response.data && response.data.name) {
                // If data has a name property directly
                this.categoryName = response.data.name;
              } else if (response.data && response.data.name) {
                // If data has a nested category object
                this.categoryName = response.data.name;
              } else if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].category) {
                // If data is an array with category information
                this.categoryName = response.data[0].category.name;
              } else {
                // Fallback
                this.categoryName = 'Category Products';
              }
            } else {
              this.categoryName = 'Category Products';
            }
          },
          error: (error) => {
            console.error('Error fetching category:', error);
            this.categoryName = 'Category Products';
          }
        });
    }
  }
}
