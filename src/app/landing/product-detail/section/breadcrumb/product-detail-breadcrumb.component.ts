import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { getSeoRouteParam } from '../../../../shared/utils/seo-url.util';

@Component({
  selector: 'app-product-detail-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  styles: [`
    :host {
      --crumb-link: #418576;
      --crumb-active: #1A322D;
      --crumb-separator: rgba(65, 133, 118, 0.5);
    }

    .breadcrumb-item,
    .breadcrumb-item a {
      color: var(--crumb-link) !important;
    }

    .breadcrumb-item a {
      text-decoration: none;
    }

    .breadcrumb-item a:hover {
      color: var(--crumb-active) !important;
    }

    .breadcrumb-item.active {
      color: var(--crumb-active) !important;
      font-weight: 600;
    }

    .breadcrumb-item + .breadcrumb-item::before {
      color: var(--crumb-separator) !important;
    }
  `],
  template: `
    <nav class="container position-relative z-2 pt-1 pt-lg-2 mt-1 mt-lg-4" aria-label="breadcrumb">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item"><a routerLink="/">Home</a></li>
        <li *ngIf="category && categoryId" class="breadcrumb-item">
          <a [routerLink]="['/shop-category', categoryRouteParam]">{{category}}</a>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          {{productName || 'Product page'}}
        </li>
      </ol>
    </nav>
  `
})
export class ProductDetailBreadcrumbComponent {
  @Input() productName: string = '';
  @Input() category: string = '';
  @Input() categoryId: number | null = null;
  @Input() categorySlug: string = '';

  get categoryRouteParam(): string {
    return getSeoRouteParam({ id: this.categoryId, name: this.category, slug: this.categorySlug });
  }
}
