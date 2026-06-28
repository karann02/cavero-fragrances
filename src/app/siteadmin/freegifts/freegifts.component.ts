import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/service/auth.service';

interface FreeGift {
  id?: number;
  name: string;
  min_order_value: number | null;
  is_active: boolean;
}

@Component({
  selector: 'app-freegifts',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    BreadcrumbComponent,
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule
  ],
  template: `
<section class="content-header">
  <div class="container-fluid">
    <app-breadcrumb [title]="'Free Gifts'" [items]="['Admin', 'Free Gifts']" [active_item]="'Free Gifts'"></app-breadcrumb>
  </div>
</section>

<section class="content">
  <div class="container-fluid">

    <!-- Add / Edit Form Card -->
    <div class="card" style="border-left: 4px solid #418576; margin-bottom: 24px;">
      <div class="card-header d-flex align-items-center gap-2" style="background:transparent;">
        <mat-icon style="color:#9FE3C5;">card_giftcard</mat-icon>
        <h5 class="mb-0" style="color:#F3EEE1; font-weight:700;">{{ editing ? 'Edit Free Gift' : 'Add New Free Gift' }}</h5>
      </div>
      <div class="card-body">
        <div class="row g-3 align-items-center">
          <div class="col-md-5">
            <mat-form-field appearance="outline" class="w-100" subscriptSizing="dynamic">
              <mat-label>Gift Name</mat-label>
              <input matInput [(ngModel)]="form.name" placeholder="e.g. Attar Sample (3ml)" required>
            </mat-form-field>
          </div>
          <div class="col-md-3">
            <mat-form-field appearance="outline" class="w-100" subscriptSizing="dynamic">
              <mat-label>Min Order Value (₹)</mat-label>
              <input matInput type="number" [(ngModel)]="form.min_order_value" placeholder="e.g. 999" required min="1">
            </mat-form-field>
          </div>
          <div class="col-md-2 d-flex align-items-center gap-2">
            <mat-slide-toggle [(ngModel)]="form.is_active" color="primary">Active</mat-slide-toggle>
          </div>
          <div class="col-md-2 d-flex align-items-center gap-2">
            <button mat-raised-button (click)="save()" [disabled]="isSaving || !form.name || !form.min_order_value"
                    style="background:#418576; color:#fff; font-weight:600;">
              <mat-icon>{{ editing ? 'save' : 'add' }}</mat-icon>
              {{ isSaving ? 'Saving...' : (editing ? 'Update' : 'Add Gift') }}
            </button>
            <button *ngIf="editing" mat-stroked-button (click)="cancelEdit()" matTooltip="Cancel">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Gifts Table -->
    <div class="card">
      <div class="card-header d-flex align-items-center justify-content-between" style="background:transparent;">
        <h5 class="mb-0" style="color:#F3EEE1; font-weight:700;">
          <mat-icon style="color:#9FE3C5; vertical-align:middle;">list</mat-icon>
          All Free Gifts ({{ gifts.length }})
        </h5>
        <span class="badge" style="background:#418576; color:#fff; font-size:12px; padding:6px 12px; border-radius:20px;">
          {{ activeCount }} Active
        </span>
      </div>
      <div class="card-body p-0">
        <div *ngIf="isLoading" class="text-center py-5">
          <div class="spinner-border" style="color:#9FE3C5;"></div>
          <p class="mt-2 text-muted">Loading gifts...</p>
        </div>
        <div *ngIf="!isLoading && gifts.length === 0" class="text-center py-5 text-muted">
          <mat-icon style="font-size:48px; width:48px; height:48px; color:rgba(243,238,225,0.3);">card_giftcard</mat-icon>
          <p class="mt-2">No free gifts configured yet. Add one above.</p>
        </div>
        <table *ngIf="!isLoading && gifts.length > 0" mat-table [dataSource]="gifts" class="w-100">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef style="font-weight:700; color:#F3EEE1;">Gift Name</th>
            <td mat-cell *matCellDef="let gift">
              <span style="font-weight:600;">{{ gift.name }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="min_order_value">
            <th mat-header-cell *matHeaderCellDef style="font-weight:700; color:#F3EEE1;">Min Order Value</th>
            <td mat-cell *matCellDef="let gift">
              <span style="color:#9FE3C5; font-weight:700;">₹{{ gift.min_order_value | number }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="is_active">
            <th mat-header-cell *matHeaderCellDef style="font-weight:700; color:#F3EEE1;">Status</th>
            <td mat-cell *matCellDef="let gift">
              <span class="badge"
                [ngStyle]="{
                  'background': gift.is_active ? 'rgba(123,224,176,0.16)' : 'rgba(243,238,225,0.10)',
                  'color': gift.is_active ? '#7BE0B0' : 'rgba(243,238,225,0.6)'
                }"
                style="padding:4px 12px; border-radius:99px; font-size:12px; font-weight:700;">
                {{ gift.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef style="font-weight:700; color:#F3EEE1; text-align:right;">Actions</th>
            <td mat-cell *matCellDef="let gift" style="text-align:right;">
              <button mat-icon-button (click)="editGift(gift)" matTooltip="Edit" style="color:#9FE3C5;">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="deleteGift(gift)" matTooltip="Delete" style="color:#c0392b;">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns" style="background:transparent;"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;" style="border-bottom:1px solid rgba(159,227,197,0.10);"></tr>
        </table>
      </div>
    </div>

  </div>
</section>
  `,
  styles: [`
    :host { display: block; color: #F3EEE1; }
    .mat-mdc-form-field { width: 100%; }
    /* card header divider on the dark glass card (was a cream fill) */
    .card-header { border-bottom: 1px solid rgba(159,227,197,0.10) !important; }
    /* basic mat-table on this page → Atelier dark */
    :host ::ng-deep table.mat-mdc-table { background: transparent !important; }
    :host ::ng-deep .mat-mdc-header-cell { color: rgba(243,238,225,0.6) !important; border-bottom-color: rgba(159,227,197,0.16) !important; }
    :host ::ng-deep .mat-mdc-cell { color: #F3EEE1 !important; border-bottom-color: rgba(159,227,197,0.09) !important; }
    :host ::ng-deep .mat-mdc-row:hover { background: rgba(159,227,197,0.05) !important; }
    .spinner-border { color: #9FE3C5 !important; }
  `]
})
export class FreeGiftsComponent implements OnInit {
  gifts: FreeGift[] = [];
  columns = ['name', 'min_order_value', 'is_active', 'actions'];
  isLoading = true;
  isSaving = false;
  editing = false;
  editingId: number | null = null;

  form: FreeGift = { name: '', min_order_value: null, is_active: true };

  private readonly API = `${environment.apiGatewayBaseUrl}/api/free-gifts`;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get activeCount(): number {
    return this.gifts.filter(g => g.is_active).length;
  }

  private headers(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  load(): void {
    this.isLoading = true;
    this.http.get<any>(this.API, { headers: this.headers() }).subscribe({
      next: (res) => { this.gifts = res.data || []; this.isLoading = false; },
      error: () => { this.isLoading = false; this.snackBar.open('Failed to load free gifts.', '', { duration: 3000 }); }
    });
  }

  save(): void {
    if (!this.form.name || !this.form.min_order_value) return;
    this.isSaving = true;
    const payload = { name: this.form.name.trim(), min_order_value: Number(this.form.min_order_value), is_active: this.form.is_active };

    const req = this.editing && this.editingId
      ? this.http.put<any>(`${this.API}/${this.editingId}`, payload, { headers: this.headers() })
      : this.http.post<any>(this.API, payload, { headers: this.headers() });

    req.subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open(this.editing ? 'Gift updated!' : 'Gift added!', '', { duration: 2500, panelClass: ['snackbar-success'] });
        this.cancelEdit();
        this.load();
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err?.error?.message || 'Failed to save.', '', { duration: 3000 });
      }
    });
  }

  editGift(gift: FreeGift): void {
    this.editing = true;
    this.editingId = gift.id ?? null;
    this.form = { name: gift.name, min_order_value: gift.min_order_value, is_active: gift.is_active };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editing = false;
    this.editingId = null;
    this.form = { name: '', min_order_value: 0, is_active: true };
  }

  deleteGift(gift: FreeGift): void {
    if (!confirm(`Delete "${gift.name}"? This cannot be undone.`)) return;
    this.http.delete<any>(`${this.API}/${gift.id}`, { headers: this.headers() }).subscribe({
      next: () => {
        this.snackBar.open('Gift deleted.', '', { duration: 2500 });
        this.load();
      },
      error: () => this.snackBar.open('Failed to delete.', '', { duration: 3000 })
    });
  }
}
