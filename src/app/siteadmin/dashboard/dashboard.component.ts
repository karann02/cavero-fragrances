import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { rowsAnimation } from '@shared';
import { DashboardService } from './dashboard.service';
import { environment } from '../../../environments/environment';
import { CountUpDirective } from '../../shared/directives/count-up.directive';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [rowsAnimation],
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSelectModule,
    ReactiveFormsModule,
    FormsModule,
    MatCheckboxModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatPaginatorModule,
    CountUpDirective,
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  dashboardData: any = {};
  isLoading = true;
  today = new Date();
  private destroy$ = new Subject<void>();

  customerColumns = ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'];
  customersDataSource = new MatTableDataSource<any>([]);
  isCustomersLoading = false;

  @ViewChild('customerPaginator') customerPaginator!: MatPaginator;

  lowStockProducts: any[] = [];
  showLowStockModal = false;

  get recentOrders(): any[] {
    return Array.isArray(this.dashboardData?.recentOrders)
      ? this.dashboardData.recentOrders.slice(0, 3)
      : [];
  }

  stats = [
    { title: 'Total Sales', value: 0, prefix: '\u20B9', icon: 'attach_money', color: 'primary', route: '/siteadmin/orders', queryParams: { view: 'sales' } },
    { title: 'Today Sales', value: 0, prefix: '\u20B9', icon: 'today', color: 'accent', route: '/siteadmin/orders', queryParams: { range: 'today', view: 'sales' } },
    { title: 'Monthly Sales', value: 0, prefix: '\u20B9', icon: 'calendar_today', color: 'warn', route: '/siteadmin/orders', queryParams: { range: 'month', view: 'sales' } },
    { title: 'Total Orders', value: 0, prefix: '', icon: 'shopping_cart', color: 'primary', route: '/siteadmin/orders' },
    { title: 'Today Orders', value: 0, prefix: '', icon: 'receipt', color: 'accent', route: '/siteadmin/orders', queryParams: { range: 'today' } },
    { title: 'Total Customers', value: 0, prefix: '', icon: 'people', color: 'warn', route: '/siteadmin/customers' },
    { title: 'Total Stock', value: 0, prefix: '', icon: 'inventory_2', color: 'primary', route: '/siteadmin/products' },
    { title: 'Low Stock', value: 0, prefix: '', icon: 'warning', color: 'warn', route: '/siteadmin/products', queryParams: { stock: 'low' } }
  ];

  constructor(
    public httpClient: HttpClient,
    private dashboardService: DashboardService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadData();
    this.loadCustomers();
    interval(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Navigate to product management (top-right "New Product" button). */
  goNewProduct() {
    this.router.navigate(['/siteadmin/products']);
  }

  refresh() {
    this.loadData();
    this.loadCustomers();
  }

  openStatTable(stat: any): void {
    if (!stat?.route) return;
    this.router.navigate([stat.route], {
      queryParams: stat.queryParams || {}
    });
  }

  loadData() {
    this.isLoading = true;
    this.dashboardService.getDashboardStats().subscribe({
      next: (res) => {
        if (res.success) {
          this.dashboardData = res.data;
          this.updateStats();
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.dashboardService.getLiveCounts().subscribe({
      next: (counts) => {
        this.stats[5].value = counts.customers;
        this.stats[6].value = counts.totalStock;
        this.stats[7].value = counts.lowStock;
        this.lowStockProducts = counts.lowStockItems;
      }
    });
  }

  loadCustomers() {
    this.isCustomersLoading = true;
    this.httpClient.get<any>(`${environment.authApiBaseUrl}/users`).subscribe({
      next: (res) => {
        const data = res.success ? (res.data || []) : (Array.isArray(res.data) ? res.data : []);
        this.customersDataSource.data = data;
        this.stats[5].value = data.length;
        this.isCustomersLoading = false;
        setTimeout(() => {
          this.customersDataSource.paginator = this.customerPaginator;
        });
      },
      error: () => {
        this.isCustomersLoading = false;
      }
    });
  }

  updateStats() {
    const d = this.dashboardData;
    const s = d.stats || d;
    this.stats[0].value = s.totalSales ?? s.total_sales ?? 0;
    this.stats[1].value = s.todaySales ?? s.today_sales ?? 0;
    this.stats[2].value = s.monthlySales ?? s.monthly_sales ?? 0;
    this.stats[3].value = s.totalOrders ?? s.total_orders ?? 0;
    this.stats[4].value = s.todayOrders ?? s.today_orders ?? 0;
    this.stats[5].value = s.totalCustomers ?? s.total_customers ?? 0;
    this.stats[6].value = s.totalStock ?? s.total_stock ?? s.totalProducts ?? s.total_products ?? 0;
    this.stats[7].value = s.lowStockProducts ?? s.low_stock ?? 0;
  }

  getMaxSales(): number {
    if (!this.dashboardData.salesChart) return 100;
    return Math.max(...this.dashboardData.salesChart.map((day: any) => day.sales)) || 1;
  }

  /** Two-letter initials for an order's customer avatar. */
  initials(name?: string): string {
    if (!name) return '–';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '–';
  }

  /** Catmull-Rom → cubic-bezier smoothing for a soft wavy line. */
  private smoothPath(pts: { x: number; y: number }[]): string {
    if (!pts.length) return '';
    if (pts.length < 3) return pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  /**
   * Builds the Sales Overview area chart (smooth line + area + grid + axes +
   * peak marker) purely from the existing `dashboardData.salesChart` — UI only.
   */
  get salesChartView() {
    const data: any[] = Array.isArray(this.dashboardData?.salesChart)
      ? this.dashboardData.salesChart
      : [];
    const W = 640, H = 240, padX = 18, padT = 26, padB = 26;
    if (!data.length) {
      return { empty: true, line: '', area: '', points: [] as any[], grid: [] as any[], W, H };
    }
    const max = Math.max(...data.map((d) => Number(d.sales) || 0), 1);
    const n = data.length;
    const stepX = n > 1 ? (W - padX * 2) / (n - 1) : 0;
    const plotH = H - padT - padB;
    const pts = data.map((d, i) => {
      const x = padX + stepX * i;
      const val = Number(d.sales) || 0;
      const y = padT + plotH - (val / max) * plotH;
      return { x, y, sales: val, date: d.date };
    });
    const line = this.smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(H - padB).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(H - padB).toFixed(1)} Z`;
    // 4 horizontal gridlines + value labels
    const grid = [0, 1, 2, 3, 4].map((i) => {
      const frac = i / 4;
      return { y: padT + plotH * frac, value: Math.round(max * (1 - frac)) };
    });
    // peak marker (highest sales day) — like the reference tooltip bubble
    const peak = pts.reduce((a, b) => (b.sales > a.sales ? b : a), pts[0]);
    return { empty: false, line, area, points: pts, grid, peak, W, H };
  }

  /** Total of the last-7-days sales window (existing data only). */
  get salesWindowTotal(): number {
    const data: any[] = Array.isArray(this.dashboardData?.salesChart)
      ? this.dashboardData.salesChart
      : [];
    return data.reduce((s, d) => s + (Number(d.sales) || 0), 0);
  }

  /** Real 7-day trend % (last day vs first day) from the sales series. */
  get salesTrendPct(): number | null {
    const data: any[] = Array.isArray(this.dashboardData?.salesChart)
      ? this.dashboardData.salesChart
      : [];
    if (data.length < 2) return null;
    const first = Number(data[0].sales) || 0;
    const last = Number(data[data.length - 1].sales) || 0;
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 1000) / 10;
  }

  /** Tiny decorative sparkline path (reuses the real sales shape, scaled). */
  get miniSparkPath(): string {
    const data: any[] = Array.isArray(this.dashboardData?.salesChart)
      ? this.dashboardData.salesChart
      : [];
    const W = 90, H = 30, pad = 2;
    if (data.length < 2) return '';
    const max = Math.max(...data.map((d) => Number(d.sales) || 0), 1);
    const stepX = (W - pad * 2) / (data.length - 1);
    const pts = data.map((d, i) => ({
      x: pad + stepX * i,
      y: pad + (H - pad * 2) - ((Number(d.sales) || 0) / max) * (H - pad * 2),
    }));
    return this.smoothPath(pts);
  }

  /**
   * Donut: real "Orders by Status" breakdown from dashboardData.recentOrders.
   * Returns SVG-ready segments (stroke-dasharray technique) + total.
   */
  get ordersDonut() {
    const orders: any[] = Array.isArray(this.dashboardData?.recentOrders)
      ? this.dashboardData.recentOrders
      : [];
    const palette: Record<string, string> = {
      delivered: '#418576',
      received: '#418576',
      completed: '#418576',
      processing: '#8DCFB4',
      pending: '#E6A23C',
      shipped: '#5B9BD5',
      cancelled: '#E05B5B',
      returned: '#C13030',
    };
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const k = (o.order_status || 'other').toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }
    const total = orders.length;
    const C = 2 * Math.PI * 42; // r = 42
    let offset = 0;
    const segments = Object.keys(counts).map((k) => {
      const count = counts[k];
      const frac = total ? count / total : 0;
      const seg = {
        status: k,
        count,
        percent: Math.round(frac * 100),
        color: palette[k] || '#B7C4C0',
        dash: `${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}`,
        offset: `${(-offset * C).toFixed(2)}`,
      };
      offset += frac;
      return seg;
    });
    return { segments, total, empty: total === 0 };
  }

  showNotification(
    colorName: string,
    text: string,
    placementFrom: MatSnackBarVerticalPosition,
    placementAlign: MatSnackBarHorizontalPosition
  ) {
    this.snackBar.open(text, '', {
      duration: 2000,
      verticalPosition: placementFrom,
      horizontalPosition: placementAlign,
      panelClass: colorName,
    });
  }
}
