import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { rowsAnimation } from '@shared';
import { environment } from 'environments/environment';
import { ReelFormDialogComponent } from './dialogs/reel-form-dialog.component';

const API = `${environment.apiGatewayBaseUrl}/api/reels`;

@Component({
  selector: 'app-admin-influencer-reels',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatIconModule, MatButtonModule, MatSnackBarModule,
    MatTooltipModule, MatDialogModule
  ],
  animations: [rowsAnimation],
  templateUrl: './influencer-reels.component.html',
  styleUrls: ['./influencer-reels.component.scss']
})
export class AdminInfluencerReelsComponent implements OnInit {
  displayedColumns = ['sort_order', 'title', 'discount_text', 'product_image', 'is_active', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  isLoading = true;
  baseUrl = environment.apiGatewayBaseUrl;
  togglingId: number | string | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.http.get<any>(`${API}/admin`).subscribe({
      next: (res) => {
        // Filter out items with sort_order = 0
        this.dataSource.data = (res.data || []).filter((reel: any) => reel.sort_order !== 0);
        this.isLoading = false;
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      },
      error: () => {
        this.isLoading = false;
        this.dataSource.data = [];
      }
    });
  }

  openAdd(): void {
    // auto-suggest the next sort order (max existing + 1)
    const nextSortOrder = this.dataSource.data.reduce(
      (max, r: any) => Math.max(max, Number(r.sort_order) || 0), 0
    ) + 1;
    const ref = this.dialog.open(ReelFormDialogComponent, {
      width: '860px',
      maxWidth: '98vw',
      data: { action: 'add', row: { sort_order: nextSortOrder } }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
        this.snackBar.open('Reel added!', '', { duration: 2500, panelClass: 'snackbar-success' });
      }
    });
  }

  openEdit(row: any): void {
    const ref = this.dialog.open(ReelFormDialogComponent, {
      width: '860px',
      maxWidth: '98vw',
      data: { action: 'edit', row }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
        this.snackBar.open('Reel updated!', '', { duration: 2500, panelClass: 'snackbar-success' });
      }
    });
  }

  delete(row: any): void {
    if (!confirm(`Delete "${row.title}"?`)) return;
    this.http.delete<any>(`${API}/${row.id}`).subscribe({
      next: () => {
        this.loadData();
        this.snackBar.open('Deleted.', '', { duration: 2000 });
      }
    });
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  toggleReelStatus(reel: any): void {
    this.togglingId = reel.id;
    const newStatus = !reel.is_active;

    this.http.put<any>(`${API}/${reel.id}`, { is_active: newStatus }).subscribe({
      next: () => {
        reel.is_active = newStatus;
        this.dataSource._updateChangeSubscription();
        this.snackBar.open(
          `Reel status updated to ${newStatus ? 'Active' : 'Inactive'}`,
          '',
          { duration: 2500, panelClass: 'snackbar-success' }
        );
        this.togglingId = null;
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to update status';
        this.snackBar.open(msg, '', { duration: 2500, panelClass: 'snackbar-danger' });
        this.togglingId = null;
      }
    });
  }

  onProductImageError(row: any): void {
    if (!row) return;
    row.product_image = null;
    this.dataSource._updateChangeSubscription();
  }
}
