import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { rowsAnimation } from '@shared';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-all-customers',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatSortModule, MatPaginatorModule,
    MatIconModule, MatButtonModule, MatTooltipModule, MatCardModule, MatChipsModule,
    MatSlideToggleModule, MatDialogModule, MatSnackBarModule
  ],
  animations: [rowsAnimation],
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
                  <h1 class="card-page-title" style="margin: 0; font-size: 1.1rem; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; color: #243247;">Customers</h1>
                </li>
                <li class="tbl-search-box">
                  <label><i class="material-icons search-icon">search</i></label>
                  <input placeholder="Search" type="text" (keyup)="applyFilter($event)" class="browser-default search-field">
                </li>
              </ul>
            </div>
            <div class="right">
              <ul class="tbl-export-btn">
                <li class="tbl-header-btn">
                  <div class="m-l-10">
                    <button mat-icon-button (click)="loadData()" class="table-toolbar-btn" matTooltip="Refresh" aria-label="Refresh customers">
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

                <ng-container matColumnDef="name">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Name</mat-header-cell>
                  <mat-cell *matCellDef="let row">
                    <div class="d-flex align-items-center gap-2">
                      <div class="avatar-circle" [style.opacity]="row.is_active === false ? '0.5' : '1'">{{ getInitial(row.name) }}</div>
                      <span class="fw-medium" [style.color]="row.is_active === false ? '#aaa' : ''">{{ row.name }}</span>
                    </div>
                  </mat-cell>
                </ng-container>

                <ng-container matColumnDef="email">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Email</mat-header-cell>
                  <mat-cell *matCellDef="let row" [matTooltip]="row.email">
                    <span class="email-text">{{ row.email }}</span>
                  </mat-cell>
                </ng-container>

                <ng-container matColumnDef="role">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Role</mat-header-cell>
                  <mat-cell *matCellDef="let row">
                    <span class="badge cv-role-pill"
                          [class.bg-warning]="(row.role || '').toLowerCase() === 'superuser'"
                          [class.bg-primary]="(row.role || '').toLowerCase() === 'admin'"
                          [class.bg-success]="(row.role || '').toLowerCase() === 'user'">
                      {{ row.role }}
                    </span>
                  </mat-cell>
                </ng-container>

                <ng-container matColumnDef="createdAt">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Joined</mat-header-cell>
                  <mat-cell *matCellDef="let row">{{ row.createdAt | date:'dd MMM yyyy' }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="updatedAt">
                  <mat-header-cell *matHeaderCellDef mat-sort-header>Last Active</mat-header-cell>
                  <mat-cell *matCellDef="let row">{{ row.updatedAt | date:'dd MMM yyyy, h:mm a' }}</mat-cell>
                </ng-container>

                <ng-container matColumnDef="status">
                  <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
                  <mat-cell *matCellDef="let row">
                    <mat-slide-toggle [checked]="row.is_active !== false" (change)="toggleStatus(row, $event.checked)" color="primary"></mat-slide-toggle>
                  </mat-cell>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
                  <mat-cell *matCellDef="let row">
                    <button mat-icon-button color="warn" matTooltip="Delete" (click)="deleteUser(row)"><mat-icon>delete</mat-icon></button>
                  </mat-cell>
                </ng-container>

                <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
                <mat-row [@rowsAnimation]="" *matRowDef="let row; columns: displayedColumns;"></mat-row>
              </table>

              <div *ngIf="isLoading" class="text-center py-5">
                <mat-icon style="font-size:2rem;width:2rem;height:2rem;" class="text-muted">hourglass_empty</mat-icon>
                <p class="text-muted mt-2">Loading customers...</p>
              </div>

              <div *ngIf="!isLoading && dataSource.data.length === 0" class="text-center py-5">
                <mat-icon style="font-size:3rem;width:3rem;height:3rem;" class="text-muted">people_outline</mat-icon>
                <h4 class="text-muted mt-2">No customers found</h4>
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

<!-- Edit User Dialog -->
<ng-template #editDialog>
  <h2 mat-dialog-title>Edit User</h2>
  <mat-dialog-content style="min-width:320px;padding:16px 24px">
    <div class="mb-3">
      <label class="form-label fw-semibold">Name</label>
      <input class="form-control" [(ngModel)]="editForm.name">
    </div>
    <div class="mb-3">
      <label class="form-label fw-semibold">Email</label>
      <input class="form-control" [(ngModel)]="editForm.email">
    </div>
    <div class="mb-3">
      <label class="form-label fw-semibold">Role</label>
      <select class="form-select" [(ngModel)]="editForm.role">
        <option value="user">user</option>
        <option value="admin">admin</option>
        <option value="Superuser">Superuser</option>
      </select>
    </div>
  </mat-dialog-content>
  <mat-dialog-actions align="end">
    <button mat-button mat-dialog-close>Cancel</button>
    <button mat-raised-button color="primary" (click)="saveEdit()">Save</button>
  </mat-dialog-actions>
</ng-template>
  `,
  styles: [`
    :host { display: block; padding-top: 24px; }
    .avatar-circle {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #6FC3A6, #9FE3C5); color: #06231B;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
    /* column widths so name doesn't wrap and email isn't cut */
    :host ::ng-deep .mat-column-name { flex: 0 0 200px; min-width: 200px; }
    :host ::ng-deep .mat-column-email { flex: 0 0 270px; min-width: 270px; }
    :host ::ng-deep .mat-column-email .email-text {
      display: block; max-width: 100%;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    :host ::ng-deep .mat-column-name .fw-medium { white-space: nowrap; }
    /* role column wide enough for the pill, and the pill sizes to its content
       (no clipping of long roles like SUPERUSER) */
    :host ::ng-deep .mat-column-role { flex: 0 0 130px; min-width: 130px; }
    :host ::ng-deep .mat-column-role .cv-role-pill {
      max-width: none !important;
      width: auto !important;
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
      padding: 5px 14px !important;
      letter-spacing: .03em;
    }
  `],
  viewProviders: []
})
export class AllCustomersComponent implements OnInit {
  displayedColumns = ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>([]);
  isLoading = true;
  editForm: any = {};
  editingRow: any = null;
  private dialogRef: any = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('editDialog') editDialogTpl: any;

  constructor(private http: HttpClient, private dialog: MatDialog, private snack: MatSnackBar) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.isLoading = true;
    this.http.get<any>(`${environment.authApiBaseUrl}/users`).subscribe({
      next: (res) => {
        this.dataSource.data = res.success ? res.data : [];
        this.isLoading = false;
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      },
      error: () => { this.isLoading = false; }
    });
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  openEdit(row: any): void {
    this.editingRow = row;
    this.editForm = { name: row.name, email: row.email, role: row.role };
    this.dialogRef = this.dialog.open(this.editDialogTpl, { panelClass: 'cv-form-dialog' });
  }

  saveEdit(): void {
    this.http.put<any>(`${environment.authApiBaseUrl}/users/${this.editingRow.id}`, this.editForm).subscribe({
      next: (res) => {
        if (res.success) {
          Object.assign(this.editingRow, this.editForm);
          this.dataSource.data = [...this.dataSource.data];
          this.snack.open('User updated successfully', 'Close', { duration: 3000 });
        }
        this.dialogRef?.close();
      },
      error: () => this.snack.open('Failed to update user', 'Close', { duration: 3000 })
    });
  }

  deleteUser(row: any): void {
    if (!confirm(`Delete user "${row.name}"? This cannot be undone.`)) return;
    this.http.delete<any>(`${environment.authApiBaseUrl}/users/${row.id}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.dataSource.data = this.dataSource.data.filter((u: any) => u.id !== row.id);
          this.snack.open('User deleted', 'Close', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to delete user', 'Close', { duration: 3000 })
    });
  }

  toggleStatus(row: any, is_active: boolean): void {
    this.http.patch<any>(`${environment.authApiBaseUrl}/users/${row.id}/status`, { is_active }).subscribe({
      next: (res) => {
        if (res.success) {
          row.is_active = is_active;
          this.snack.open(`User ${is_active ? 'activated' : 'deactivated'}`, 'Close', { duration: 3000 });
        }
      },
      error: () => this.snack.open('Failed to update status', 'Close', { duration: 3000 })
    });
  }
}
