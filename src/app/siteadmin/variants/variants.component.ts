import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/service/auth.service';

interface VariantRow {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  product_stock: number;
  name: string;
  sku: string;
  price: number;
  compare_price: number | null;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  _price: number;
  _compare_price: number | null;
  _stock: number;
  _threshold: number;
  _active: boolean;
  _dirty: boolean;
  _saving: boolean;
}

@Component({
  selector: 'app-variants-inventory',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatTooltipModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatPaginatorModule
  ],
  template: `
<div class="inv">

  <!-- ===== STATS ===== -->
  <div class="inv-stats">
    <div class="inv-stat">
      <div class="inv-ic mint"><span class="material-icons-outlined">inventory_2</span></div>
      <div><div class="inv-val">{{ totalCount }}</div><div class="inv-lbl">Total Variants</div></div>
    </div>
    <div class="inv-stat" [class.alert]="lowStockCount > 0">
      <div class="inv-ic warn"><span class="material-icons-outlined">warning_amber</span></div>
      <div><div class="inv-val" [style.color]="lowStockCount ? '#F4C56B' : null">{{ lowStockCount }}</div><div class="inv-lbl">Low Stock</div></div>
    </div>
    <div class="inv-stat" [class.alert]="outOfStockCount > 0">
      <div class="inv-ic danger"><span class="material-icons-outlined">remove_shopping_cart</span></div>
      <div><div class="inv-val" [style.color]="outOfStockCount ? '#F2A39C' : null">{{ outOfStockCount }}</div><div class="inv-lbl">Out of Stock</div></div>
    </div>
    <div class="inv-stat">
      <div class="inv-ic pos"><span class="material-icons-outlined">check_circle</span></div>
      <div><div class="inv-val" style="color:#7BE0B0;">{{ totalCount - lowStockCount - outOfStockCount }}</div><div class="inv-lbl">In Stock</div></div>
    </div>
  </div>

  <!-- ===== TOOLBAR ===== -->
  <div class="cv-panel inv-toolbar">
    <div class="inv-search">
      <span class="material-icons-outlined">search</span>
      <input type="text" placeholder="Search product, variant name, or SKU…"
             [(ngModel)]="search" (ngModelChange)="applyFilter()">
      <button *ngIf="search" class="inv-clear" (click)="search=''; applyFilter()" aria-label="Clear search">
        <span class="material-icons-outlined">close</span>
      </button>
    </div>
    <div class="inv-selectwrap">
      <select class="inv-select" [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
        <option value="all">All Variants ({{ allVariants.length }})</option>
        <option value="low">Low Stock ({{ lowStockCount }})</option>
        <option value="out">Out of Stock ({{ outOfStockCount }})</option>
        <option value="inactive">Inactive Only</option>
      </select>
      <span class="material-icons-outlined inv-select-caret">expand_more</span>
    </div>
    <button class="cv-btn ghost" (click)="load()" [disabled]="isLoading">
      <span class="material-icons-outlined">refresh</span> Refresh
    </button>
    <span class="inv-hint">Stock is edited in the product editor</span>
  </div>

  <!-- ===== TABLE ===== -->
  <div class="cv-panel">
    <div class="cv-panel-head">
      <div><h3>Variants</h3><div class="cv-sub">{{ filtered.length }} shown · read-only overview</div></div>
    </div>

    <div *ngIf="isLoading" class="inv-empty">
      <mat-spinner diameter="36"></mat-spinner><p>Loading inventory…</p>
    </div>

    <div *ngIf="!isLoading && filtered.length === 0" class="inv-empty">
      <span class="material-icons-outlined big">inventory_2</span>
      <p>No variants found. Add products with variants first.</p>
    </div>

    <div *ngIf="!isLoading && filtered.length > 0" class="inv-tablewrap">
      <table class="inv-table">
        <thead>
          <tr>
            <th>Product</th><th>Size / Variant</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let v of paged; trackBy: trackById"
              [class.row-out]="v.stock === 0"
              [class.row-low]="v.stock > 0 && v.stock <= v.low_stock_threshold">
            <td class="inv-prod">{{ v.product_name || '—' }}</td>
            <td><span class="inv-vpill">{{ v.name }}</span></td>
            <td class="inv-sku">{{ v.sku || '—' }}</td>
            <td class="inv-price">₹{{ v.price | number }}</td>
            <td><span class="inv-stockval" [style.color]="stockColor(v)">{{ v.stock | number }}</span><span class="inv-units"> units</span></td>
            <td>
              <span *ngIf="!v.is_active" class="inv-tag inactive">Inactive</span>
              <span *ngIf="v.is_active && v.stock === 0" class="inv-tag out">Out of Stock</span>
              <span *ngIf="v.is_active && v.stock > 0 && v.stock <= v.low_stock_threshold" class="inv-tag low">Low ≤ {{ v.low_stock_threshold }}</span>
              <span *ngIf="v.is_active && v.stock > v.low_stock_threshold" class="inv-tag in">In Stock</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- pager — the SAME mat-paginator used across the whole admin panel -->
    <mat-paginator *ngIf="!isLoading && filtered.length > 0"
                   [length]="filtered.length"
                   [pageIndex]="pageIndex"
                   [pageSize]="pageSize"
                   [pageSizeOptions]="[5, 10, 25, 100]"
                   (page)="onPage($event)">
    </mat-paginator>
  </div>

</div>
  `,
  styles: [`
    :host {
      display: block;
      color: #F3EEE1;
      font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
    }
    .material-icons-outlined {
      font-family: 'Material Icons Outlined' !important;
      font-weight: normal; font-style: normal; line-height: 1;
      display: inline-flex; align-items: center; justify-content: center;
      -webkit-font-smoothing: antialiased; font-feature-settings: 'liga';
    }
    .num, .inv-val, .inv-stockval, .inv-price { font-variant-numeric: tabular-nums; }

    /* shared panel look (mirrors the global .cv-panel) */
    .cv-panel {
      background: linear-gradient(180deg, #0E1C18, #0A1714);
      border: 1px solid rgba(159,227,197,0.09);
      border-radius: 22px;
      box-shadow: 0 1px 2px rgba(0,0,0,.30), 0 8px 24px rgba(0,0,0,.22);
      overflow: hidden;
    }
    .cv-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 22px; border-bottom: 1px solid rgba(159,227,197,0.09); }
    .cv-panel-head h3 { font-family: 'Playfair Display', Georgia, serif; font-size: 17px; font-weight: 700; margin: 0; color: #F3EEE1; }
    .cv-sub { font-size: 12.5px; color: rgba(243,238,225,0.60); margin-top: 2px; }

    .cv-btn {
      display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
      height: 42px; padding: 0 16px; border-radius: 12px; font-weight: 700; font-size: 13.5px;
      border: 1px solid rgba(159,227,197,0.16); color: #F3EEE1; background: transparent;
      transition: border-color .15s, background .15s, transform .15s; white-space: nowrap;
      .material-icons-outlined { font-size: 18px; }
      &:hover:not([disabled]) { border-color: rgba(159,227,197,0.4); background: rgba(159,227,197,0.06); transform: translateY(-1px); }
      &[disabled] { opacity: .5; cursor: default; }
    }

    /* ===== STATS ===== */
    .inv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .inv-stat {
      display: flex; align-items: center; gap: 14px;
      padding: 18px 20px;
      background: linear-gradient(180deg, #0E1C18, #0A1714);
      border: 1px solid rgba(159,227,197,0.09); border-radius: 18px;
      box-shadow: 0 1px 2px rgba(0,0,0,.30), 0 8px 24px rgba(0,0,0,.22);
      transition: transform .3s cubic-bezier(.22,.61,.36,1), border-color .3s;
    }
    .inv-stat:hover { transform: translateY(-3px); border-color: rgba(159,227,197,0.18); }
    .inv-stat.alert { border-color: rgba(244,197,107,0.28); }
    .inv-ic { width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; flex: none;
      .material-icons-outlined { font-size: 23px; } }
    .inv-ic.mint   { background: rgba(159,227,197,0.10); .material-icons-outlined { color: #9FE3C5; } }
    .inv-ic.warn   { background: rgba(244,197,107,0.12); .material-icons-outlined { color: #F4C56B; } }
    .inv-ic.danger { background: rgba(242,163,156,0.12); .material-icons-outlined { color: #F2A39C; } }
    .inv-ic.pos    { background: rgba(123,224,176,0.12); .material-icons-outlined { color: #7BE0B0; } }
    .inv-val { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; line-height: 1; color: #F3EEE1; }
    .inv-lbl { font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(243,238,225,0.55); margin-top: 6px; }

    /* ===== TOOLBAR ===== */
    .inv-toolbar { display: flex; align-items: center; gap: 12px; padding: 14px 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .inv-search {
      position: relative; flex: 1 1 280px; min-width: 220px; display: flex; align-items: center;
      background: #0A1714; border: 1px solid rgba(159,227,197,0.16); border-radius: 12px; height: 42px; padding: 0 10px 0 38px;
      transition: border-color .15s, box-shadow .15s;
      > .material-icons-outlined { position: absolute; left: 12px; font-size: 19px; color: rgba(243,238,225,0.40); }
      input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; color: #F3EEE1; font-size: 14px; }
      input::placeholder { color: rgba(243,238,225,0.40); }
      &:focus-within { border-color: #9FE3C5; box-shadow: 0 0 0 3px rgba(159,227,197,0.14); }
    }
    .inv-clear { background: none; border: none; cursor: pointer; color: rgba(243,238,225,0.5); display: grid; place-items: center; padding: 0 2px;
      .material-icons-outlined { font-size: 17px; } &:hover { color: #F2A39C; } }
    .inv-selectwrap { position: relative; }
    .inv-select {
      appearance: none; -webkit-appearance: none; cursor: pointer;
      height: 42px; padding: 0 38px 0 14px; border-radius: 12px; font-size: 13.5px; font-weight: 600;
      background: #0A1714; border: 1px solid rgba(159,227,197,0.16); color: #F3EEE1; outline: none;
      &:focus { border-color: #9FE3C5; box-shadow: 0 0 0 3px rgba(159,227,197,0.14); }
      option { background: #122520; color: #F3EEE1; }
    }
    .inv-select-caret { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; font-size: 20px; color: rgba(243,238,225,0.5); }
    .inv-hint { margin-left: auto; font-size: 11.5px; color: rgba(243,238,225,0.40); }

    /* ===== TABLE ===== */
    .inv-tablewrap { width: 100%; overflow-x: auto; }
    .inv-table { width: 100%; border-collapse: collapse; min-width: 880px; }
    .inv-table thead th {
      text-align: left; padding: 14px 18px; background: rgba(159,227,197,0.035);
      color: rgba(243,238,225,0.60); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
      border-bottom: 1px solid rgba(159,227,197,0.16);
    }
    .inv-table tbody td { padding: 14px 18px; border-bottom: 1px solid rgba(159,227,197,0.09); font-size: 13.5px; vertical-align: middle; }
    .inv-table tbody tr { transition: background .15s; border-left: 3px solid transparent; }
    .inv-table tbody tr:hover { background: rgba(159,227,197,0.05); }
    .inv-table tbody tr.row-low { border-left-color: #F4C56B; }
    .inv-table tbody tr.row-out { border-left-color: #F2A39C; }

    .inv-prod { font-weight: 700; color: #F3EEE1; }
    .inv-vpill { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700;
      background: rgba(159,227,197,0.12); color: #9FE3C5; }
    .inv-sku { color: rgba(243,238,225,0.45); font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .inv-price { font-weight: 800; color: #F3EEE1; }
    .inv-stockval { font-weight: 800; font-size: 15px; }
    .inv-units { color: rgba(243,238,225,0.40); font-size: 11px; }

    .inv-tag { display: inline-flex; align-items: center; padding: 4px 11px; border-radius: 99px; font-size: 11.5px; font-weight: 800; }
    .inv-tag.in       { background: rgba(123,224,176,0.14); color: #7BE0B0; }
    .inv-tag.low      { background: rgba(244,197,107,0.14); color: #F4C56B; }
    .inv-tag.out      { background: rgba(242,163,156,0.16); color: #F2A39C; }
    .inv-tag.inactive { background: rgba(243,238,225,0.08); color: rgba(243,238,225,0.55); }

    .inv-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 56px 20px; color: rgba(243,238,225,0.45); text-align: center;
      .material-icons-outlined.big { font-size: 48px; opacity: .5; } p { margin: 0; font-size: 14px; } }

    /* pager uses the shared mat-paginator, styled globally in _atelier.scss */

    /* ===== RESPONSIVE ===== */
    @media (max-width: 991px) { .inv-stats { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 575px) {
      .inv-stats { grid-template-columns: 1fr; }
      .inv-hint { display: none; }
      .inv-search { flex-basis: 100%; }
    }
  `]
})
export class VariantsInventoryComponent implements OnInit {
  allVariants: VariantRow[] = [];
  filtered: VariantRow[] = [];

  search = '';
  statusFilter = 'all';
  isLoading = true;

  // pagination
  pageSize = 5;
  pageIndex = 0;

  private readonly API = `${environment.apiGatewayBaseUrl}/api/variants`;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void { this.load(); }

  get totalCount(): number { return this.allVariants.length; }
  get lowStockCount(): number { return this.allVariants.filter(v => v.stock > 0 && v.stock <= v.low_stock_threshold).length; }
  get outOfStockCount(): number { return this.allVariants.filter(v => v.stock === 0).length; }
  get dirtyCount(): number { return this.allVariants.filter(v => v._dirty).length; }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  load(): void {
    this.isLoading = true;
    this.http.get<any>(`${this.API}/all`, { headers: this.headers() }).subscribe({
      next: (res) => {
        this.allVariants = (res.data || []).map((v: any): VariantRow => ({
          ...v,
          product_stock: Number(v.product_stock) || 0,
          _price: Number(v.price),
          _compare_price: v.compare_price != null ? Number(v.compare_price) : null,
          _stock: Number(v.stock),
          _threshold: Number(v.low_stock_threshold),
          _active: v.is_active,
          _dirty: false,
          _saving: false
        }));
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Failed to load variants.', '', { duration: 3000 });
      }
    });
  }

  applyFilter(): void {
    let list = [...this.allVariants];
    const q = this.search.toLowerCase().trim();
    if (q) {
      list = list.filter(v =>
        v.product_name.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        (v.sku || '').toLowerCase().includes(q)
      );
    }
    if (this.statusFilter === 'low')      list = list.filter(v => v.stock > 0 && v.stock <= v.low_stock_threshold);
    else if (this.statusFilter === 'out') list = list.filter(v => v.stock === 0);
    else if (this.statusFilter === 'inactive') list = list.filter(v => !v.is_active);
    this.filtered = list;
    this.pageIndex = 0; // reset to first page whenever the result set changes
  }

  // ---- pagination (driven by the shared mat-paginator) ----
  get paged(): VariantRow[] {
    const start = this.pageIndex * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }
  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
  }

  stockColor(v: VariantRow): string {
    if (v.stock === 0) return '#F2A39C';
    if (v.stock <= v.low_stock_threshold) return '#F4C56B';
    return '#7BE0B0';
  }

  trackById(_: number, v: VariantRow): number { return v.id; }
}
