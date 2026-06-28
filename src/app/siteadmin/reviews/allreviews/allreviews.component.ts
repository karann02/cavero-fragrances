import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ReviewAdminService } from './review-admin.service';

@Component({
  selector: 'app-all-reviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  template: `
<section class="content">
  <div class="content-block" style="padding-top: 12px;">
    <div class="row" style="margin-top: 14px;">
      <div class="col-12">
        <div class="card">
          <div class="materialTableHeader" style="padding: 14px 16px 12px;">
            <div class="left">
              <ul class="header-buttons-left ms-0">
                <li class="tbl-title">
                  <h1 class="card-page-title" style="margin: 0; font-size: 1.1rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; color: #243247;">Product Reviews</h1>
                </li>
                <li class="tbl-search-box">
                  <label><i class="material-icons search-icon">search</i></label>
                  <input placeholder="Search product, user or review" type="text" (keyup)="applyFilter($event)" class="browser-default search-field">
                </li>
              </ul>
            </div>
            <div class="right">
              <ul class="tbl-export-btn">
                <li class="tbl-header-btn">
                  <div class="m-l-10">
                    <button mat-icon-button (click)="loadData()" class="table-toolbar-btn" matTooltip="Refresh" aria-label="Refresh reviews">
                      <mat-icon>refresh</mat-icon>
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div class="overflow-auto">
            <div class="responsive_table">
              <table mat-table [dataSource]="dataSource" matSort class="mat-cell advance-table">
                <ng-container matColumnDef="id">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>#</mat-header-cell>
                  <mat-cell *matCellDef="let row">{{ row.id }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="product">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Product</mat-header-cell>
                  <mat-cell *matCellDef="let row">{{ row.product?.name || ('Product #' + row.product_id) }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="customer">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Customer</mat-header-cell>
                  <mat-cell *matCellDef="let row">{{ row.user?.name || 'User' }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="rating">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Rating</mat-header-cell>
                  <mat-cell *matCellDef="let row">
                    <span class="rating-badge">{{ row.rating }}/5</span>
                  </mat-cell>
                </ng-container>

                <ng-container matColumnDef="comment">
                  <mat-header-cell *matHeaderCellDef>Review</mat-header-cell>
                  <mat-cell *matCellDef="let row" [matTooltip]="row.comment || '-'">
                    <span class="review-text">{{ row.comment || '-' }}</span>
                  </mat-cell>
                </ng-container>

                <ng-container matColumnDef="createdAt">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Date</mat-header-cell>
                  <mat-cell *matCellDef="let row">{{ row.createdAt | date:'dd MMM yyyy, h:mm a' }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="status">
                  <mat-header-cell *matHeaderCellDef>Visible</mat-header-cell>
                  <mat-cell *matCellDef="let row">
                    <mat-slide-toggle
                      [checked]="row.is_active !== false"
                      (change)="toggleStatus(row, $event.checked)"
                      color="primary">
                    </mat-slide-toggle>
                  </mat-cell>
                </ng-container>

                <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
                <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
              </table>

              <div *ngIf="isLoading" class="text-center py-5">
                <mat-icon style="font-size:2rem;width:2rem;height:2rem;" class="text-muted">hourglass_empty</mat-icon>
                <p class="text-muted mt-2">Loading reviews...</p>
              </div>

              <div *ngIf="!isLoading && dataSource.data.length === 0" class="text-center py-5">
                <mat-icon style="font-size:3rem;width:3rem;height:3rem;" class="text-muted">rate_review</mat-icon>
                <h4 class="text-muted mt-2">No reviews found</h4>
              </div>


            </div>
          </div>
          <mat-paginator [length]="dataSource.filteredData.length" [pageIndex]="0"
                [pageSize]="5" [pageSizeOptions]="[5,10,25,50]">
              </mat-paginator>
        </div>
      </div>
    </div>
  </div>
</section>
  `,
  styles: [`
    :host { display: block; padding-top: 24px; }
    .review-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      max-width: 360px;
      white-space: normal;
      line-height: 1.35;
    }
    .rating-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 52px;
      border-radius: 999px;
      padding: 2px 10px;
      font-weight: 700;
      color: #F4C56B;
      background: rgba(244, 191, 99, 0.16);
    }
  `]
})
export class AllReviewsComponent implements OnInit {
  displayedColumns = ['id', 'product', 'customer', 'rating', 'comment', 'createdAt', 'status'];
  dataSource = new MatTableDataSource<any>([]);
  isLoading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private reviewAdminService: ReviewAdminService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.reviewAdminService.getAllReviews().subscribe({
      next: (res) => {
        this.dataSource.data = res.success ? res.data : [];
        this.isLoading = false;
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      },
      error: () => {
        this.isLoading = false;
        this.snack.open('Failed to load reviews', 'Close', { duration: 3000 });
      }
    });
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  toggleStatus(row: any, isActive: boolean): void {
    this.reviewAdminService.updateReviewStatus(row.id, isActive).subscribe({
      next: (res) => {
        if (res.success) {
          row.is_active = isActive;
          this.snack.open(`Review ${isActive ? 'enabled' : 'disabled'}`, 'Close', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to update review status', 'Close', { duration: 3000 })
    });
  }
}
