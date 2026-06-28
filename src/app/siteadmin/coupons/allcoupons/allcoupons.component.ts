import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Subject } from 'rxjs';
import { CouponFormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { CouponService } from './coupon.service';
import { rowsAnimation, TableExportUtil } from '@shared';
import { formatDate, CommonModule, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Direction } from '@angular/cdk/bidi';

@Component({
    selector: 'app-allcoupons',
    templateUrl: './allcoupons.component.html',
    styleUrls: ['./allcoupons.component.scss'],
    animations: [rowsAnimation],
    imports: [
        CommonModule,
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
        NgClass,
        MatProgressSpinnerModule,
        MatMenuModule,
        MatPaginatorModule,
    ]
})
export class AllCouponsComponent implements OnInit, OnDestroy {
  columnDefinitions = [
    { def: 'code', label: 'Coupon Code', type: 'text', visible: true },
    { def: 'type', label: 'Type', type: 'text', visible: true },
    { def: 'value', label: 'Discount', type: 'text', visible: true },
    { def: 'min_order_amount', label: 'Minimum Cart Value', type: 'text', visible: true },
    { def: 'usage_limit', label: 'Usage Limit', type: 'text', visible: true },
    { def: 'used_count', label: 'Redeemed', type: 'text', visible: true },
    { def: 'valid_until', label: 'Valid Until', type: 'text', visible: true },
    { def: 'status', label: 'Status', type: 'text', visible: true },
  ];

  dataSource = new MatTableDataSource<any>([]);
  contextMenuPosition = { x: '0px', y: '0px' };
  isLoading = true;
  togglingId: number | string | null = null;
  loadingUsageCouponId: number | null = null;
  couponUsageDetails: Record<number, any[]> = {};
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filter') filter!: ElementRef;
  @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public couponService: CouponService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh() {
    this.loadData();
  }

  getDisplayedColumns(): string[] {
    return this.columnDefinitions
      .filter((cd) => cd.visible)
      .map((cd) => cd.def);
  }

  private mapCouponRow(row: any): any {
    return {
      ...row,
      _raw: { ...row },
      cart_users_count: Number(row.cart_users_count || 0),
      used_count: Number(row.used_count || 0),
      min_order_amount: Number(row.min_order_amount || 0),
      status: row.status ? 'Active' : 'Inactive',
      valid_from: formatDate(row.valid_from, 'yyyy-MM-dd', 'en'),
      valid_until: formatDate(row.valid_until, 'yyyy-MM-dd', 'en'),
      type: row.type === 'percentage' ? 'Percentage' : 'Fixed Amount',
      value: row.type === 'percentage' ? `${row.value}%` : `\u20B9${row.value}`,
      usage_limit: row.usage_limit || 'Unlimited'
    };
  }

  loadData() {
    this.isLoading = true;
    this.couponService.getAllCoupons().subscribe({
      next: (res) => {
        this.dataSource.data = (res.data || []).map((row: any) => this.mapCouponRow(row));
        this.isLoading = false;
        this.refreshTable();
        this.dataSource.filterPredicate = (data: any, filter: string) =>
          Object.values(data).some((value) =>
            value !== null && value !== undefined &&
            value.toString().toLowerCase().includes(filter)
          );
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      },
    });
  }

  private refreshTable() {
    this.paginator.pageIndex = 0;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value
      .trim()
      .toLowerCase();
    this.dataSource.filter = filterValue;
  }

  addNew() {
    this.openDialog();
  }

  openDialog() {
    const varDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    const dialogRef = this.dialog.open(CouponFormDialogComponent, {
      width: '80vw',
      maxWidth: '100vw',
      data: { coupon: undefined, action: 'add' },
      direction: varDirection,
      autoFocus: false,
      disableClose: true,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      this.dataSource.data = [this.mapCouponRow(result), ...this.dataSource.data];
      this.refreshTable();
      this.showNotification(
        'snackbar-success',
        'Add Record Successfully...!!!',
        'bottom',
        'center'
      );
    });
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

  exportExcel() {
    const exportData = this.dataSource.filteredData.map((x) => ({
      'Coupon Code': x.code,
      'Type': x.type,
      'Discount': x.value,
      'Minimum Cart Value': x.min_order_amount,
      'Usage Limit': x.usage_limit,
      'Redeemed Count': x.used_count,
      'Valid Until': x.valid_until,
      'Status': x.status,
    }));

    TableExportUtil.exportToExcel(exportData, 'coupons');
  }

  onContextMenu(event: MouseEvent, item: any) {
    event.preventDefault();
    this.contextMenuPosition = {
      x: `${event.clientX}px`,
      y: `${event.clientY}px`,
    };
    if (this.contextMenu) {
      this.contextMenu.menuData = { item };
      this.contextMenu.menu?.focusFirstItem('mouse');
      this.contextMenu.openMenu();
    }
  }

  loadCouponUsageDetails(row: any) {
    const couponId = Number(row?.id || 0);
    if (!couponId || this.couponUsageDetails[couponId]) {
      return;
    }

    this.loadingUsageCouponId = couponId;
    this.couponService.getCouponUsageDetails(String(couponId)).subscribe({
      next: (res) => {
        this.couponUsageDetails[couponId] = (res.data || []).map((item: any) => ({
          ...item,
          usage_count: Number(item.usage_count || 0)
        }));
        this.loadingUsageCouponId = null;
      },
      error: (err) => {
        console.error('Error loading coupon usage details:', err);
        this.loadingUsageCouponId = null;
        this.couponUsageDetails[couponId] = [];
      }
    });
  }

  getCouponUsageDetails(row: any): any[] {
    return this.couponUsageDetails[Number(row?.id || 0)] || [];
  }

  toggleCouponStatus(coupon: any): void {
    this.togglingId = coupon.id;
    const newStatus = coupon.status === 'Active' ? false : true;

    const updateData = { ...coupon._raw, status: newStatus };
    this.couponService.updateCoupon(updateData).subscribe({
      next: () => {
        coupon.status = newStatus ? 'Active' : 'Inactive';
        this.dataSource._updateChangeSubscription();
        this.showNotification(
          'snackbar-success',
          `Coupon status updated to ${newStatus ? 'Active' : 'Inactive'}`,
          'bottom',
          'center'
        );
        this.togglingId = null;
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to update status';
        this.showNotification('snackbar-danger', msg, 'bottom', 'center');
        this.togglingId = null;
      }
    });
  }
}
