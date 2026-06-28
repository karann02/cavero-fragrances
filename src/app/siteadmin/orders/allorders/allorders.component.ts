import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, forkJoin, firstValueFrom } from 'rxjs';
import { rowsAnimation, TableExportUtil } from '@shared';
import { CommonModule, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
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
import { OrderService } from './orders.service';
import { InvoiceService } from '../../../shared/services/invoice.service';

@Component({
    selector: 'app-admin-orders',
    templateUrl: './allorders.component.html',
    styleUrls: ['./allorders.component.scss'],
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
export class AllOrdersComponent implements OnInit, OnDestroy {
  columnDefinitions = [
    { def: 'select', label: 'Checkbox', type: 'check', visible: true },
    { def: 'order_number', label: 'Order ID', type: 'text', visible: true },
    { def: 'razorpay_order_id', label: 'Razorpay Order ID', type: 'text', visible: true },
    { def: 'customer', label: 'Customer', type: 'text', visible: true },
    { def: 'products', label: 'Products', type: 'text', visible: true },
    { def: 'coupon', label: 'Coupon', type: 'text', visible: true },
    { def: 'payment_status', label: 'Payment', type: 'text', visible: true },
    { def: 'created_at', label: 'Date', type: 'text', visible: true },
    { def: 'actions', label: 'Actions', type: 'actionBtn', visible: true },
  ];

  dataSource = new MatTableDataSource<any>([]);
  selection = new SelectionModel<any>(true, []);
  isLoading = true;
  updatingStatusId: string | number | null = null;
  selectedOrderDetails: any | null = null;
  activeStatusFilter = '';
  filterText = '';

  readonly statusOptions = [
    { value: 'pending',    label: 'Pending approval' },
    { value: 'confirmed',  label: 'Payment approved' },
    { value: 'processing', label: 'Out of warehouse' },
    { value: 'shipped',    label: 'Out for delivery' },
    { value: 'delivered',  label: 'Delivered' },
    { value: 'cancelled',  label: 'Cancelled' },
  ];

  readonly statusFilters = [
    { value: '',            label: 'All Orders',  cls: 'sf-all' },
    { value: 'pending',     label: 'Pending',     cls: 'sf-pending' },
    { value: 'confirmed',   label: 'Confirmed',   cls: 'sf-confirmed' },
    { value: 'processing',  label: 'Processing',  cls: 'sf-processing' },
    { value: 'shipped',     label: 'Shipped',     cls: 'sf-shipped' },
    { value: 'delivered',   label: 'Delivered',   cls: 'sf-delivered' },
    { value: 'cancelled',   label: 'Cancelled',   cls: 'sf-cancelled' },
  ];

  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filter') filter!: ElementRef;
  @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;

  constructor(
    public httpClient: HttpClient,
    private orderService: OrderService,
    private snackBar: MatSnackBar,
    private invoiceService: InvoiceService,
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

  openOrderDetails(row: any): void {
    this.selectedOrderDetails = row;
  }

  closeOrderDetails(): void {
    this.selectedOrderDetails = null;
  }

  getDisplayedColumns(): string[] {
    return this.columnDefinitions
      .filter((cd) => cd.visible)
      .map((cd) => cd.def);
  }

  loadData() {
    this.isLoading = true;
    this.orderService.getOrders().subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        
        // Debug logging for razorpay_order_id
        console.log('📦 [Orders Loaded] Total orders:', rows.length);
        rows.forEach((row: any) => {
          console.log(`   Order ${row.order_number}: razorpay_order_id = ${row.razorpay_order_id || 'N/A'}, payment_method = ${row.payment_method}`);
        });
        
        this.dataSource.data = rows.map((row: any) => ({
          ...row,
          // Normalize timestamp field for table column compatibility.
          created_at: row?.created_at || row?.createdAt || null,
          User: row?.User || null,
          orderItems: this.normalizeOrderItems(row),
          customer_name: this.getCustomerName(row),
          customer_phone: this.getCustomerPhone(row),
          customer_email: this.getCustomerEmail(row),
          customer_address_label: this.getCustomerAddressLabel(row),
          customer_address: this.getCustomerAddress(row),
          coupon_code: this.getCouponCode(row),
          coupon_usage_count: this.getCouponUsageCount(row),
          razorpay_order_id: row?.razorpay_order_id || null  // Explicitly include
        }));
        this.dataSource.filterPredicate = (data: any, filter: string) => {
          let parsed: { text: string; status: string };
          try { parsed = JSON.parse(filter); } catch { parsed = { text: filter, status: '' }; }

          const searchTarget = [
            data?.order_number,
            data?.razorpay_order_id,
            data?.customer_name,
            data?.customer_phone,
            data?.customer_email,
            data?.customer_address_label,
            data?.customer_address,
            data?.coupon_code,
            data?.coupon_usage_count,
            data?.final_amount,
            data?.payment_status,
            data?.order_status,
            ...(data?.orderItems || []).map((item: any) => `${item.product_name} ${item.quantity}`)
          ]
            .filter((value) => value !== null && value !== undefined)
            .join(' ')
            .toLowerCase();

          const textMatch = !parsed.text || searchTarget.includes(parsed.text);
          const statusMatch = !parsed.status || data?.order_status === parsed.status;
          return textMatch && statusMatch;
        };
        this.isLoading = false;
        this.refreshTable();
      },
      error: (err) => {
        console.error(err);
        this.showNotification('snackbar-danger', 'Failed to load orders', 'bottom', 'center');
        this.dataSource.data = [];
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
    this.filterText = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.triggerFilter();
  }

  filterByStatus(status: string) {
    this.activeStatusFilter = status;
    // switching status views resets the selection so "select all" only ever
    // grabs the rows of the status you're currently viewing
    this.selection.clear();
    this.triggerFilter();
  }

  triggerFilter() {
    this.dataSource.filter = JSON.stringify({ text: this.filterText, status: this.activeStatusFilter });
  }

  openWhatsApp(row: any): void {
    const rawPhone = String(row?.User?.phone || row?.shipping_address?.phone || '').trim().replace(/\D/g, '');
    if (!rawPhone) { alert('No phone number found for this customer.'); return; }
    const waPhone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const name = this.getCustomerName(row);
    const orderNum = row.order_number || 'N/A';
    const status = this.getStatusLabel(row.order_status);
    const amount = row.final_amount;
    const msg = `Hi ${name}! 🌟 Your *Cavero Fragrances* order *${orderNum}* has been updated.\n\n📦 Status: *${status}*\n💰 Amount: ₹${amount}\n\nThank you for shopping with us! For any queries, reply to this message.`;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async printPackingSlip(row: any): Promise<void> {
    // Resolve the admin-configured logo (falls back to the bundled wordmark).
    const apiBase = environment.apiGatewayBaseUrl;
    let logoUrl = `${window.location.origin}/assets/images/cavero-logo.png`;
    try {
      const res: any = await firstValueFrom(this.httpClient.get(`${apiBase}/api/logo-settings`));
      const u = res?.data?.logo_url || res?.logo_url;
      if (u) logoUrl = /^https?:/i.test(u) ? u : `${apiBase}${u.startsWith('/') ? '' : '/'}${u}`;
    } catch { /* keep fallback */ }

    const esc = (v: any) => String(v ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
    const inr = (n: any) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const products = this.getOrderProducts(row);
    let totalQty = 0;
    const itemsHtml = products.map((item: any, i: number) => {
      const qty = Math.max(1, Number(item?.quantity || 1));
      totalQty += qty;
      const price = Number(item?.price || 0);
      const amount = Number(item?.total_price || price * qty);
      const size = item?.selected_size ? `<span class="sz">${esc(item.selected_size)}</span>` : '';
      const name = esc(item?.product_name || `Product #${item?.product_id || ''}`);
      return `<tr>
        <td class="c-idx">${i + 1}</td>
        <td class="c-name"><span class="pname">${name}</span>${size}</td>
        <td class="c-qty">${qty}</td>
        <td class="c-price">${inr(price)}</td>
        <td class="c-amt">${inr(amount)}</td>
      </tr>`;
    }).join('');

    const subtotal = Number(row?.total_amount || 0);
    const discount = Number(row?.discount_amount || 0);
    const shipping = Number(row?.shipping_amount || 0);
    const grand = Number(row?.final_amount || (subtotal - discount + shipping));
    const paid = String(row?.payment_status || '').toLowerCase() === 'paid';
    const orderNo = esc(row?.order_number || row?.id);
    const orderDate = new Date(row?.created_at || Date.now()).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Packing Slip · ${orderNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2b2b;background:#eef0ed;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .toolbar{max-width:820px;margin:22px auto 0;text-align:right}
  .toolbar button{font:inherit;font-weight:700;font-size:13px;cursor:pointer;border:none;border-radius:10px;padding:10px 22px;color:#06231b;background:linear-gradient(135deg,#6FC3A6,#9FE3C5);box-shadow:0 8px 18px rgba(40,120,100,.25)}
  .sheet{max-width:820px;margin:14px auto 30px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 14px 50px rgba(0,0,0,.10)}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:30px 36px;background:linear-gradient(135deg,#0f241e 0%,#1A322D 60%,#234b40 100%);color:#fff}
  .brand{display:flex;align-items:center;gap:14px}
  .logo-chip{background:#FFF7E4;border-radius:13px;padding:9px 16px;display:inline-flex;align-items:center;box-shadow:0 6px 16px rgba(0,0,0,.18)}
  .logo-chip img{height:46px;width:auto;max-width:170px;object-fit:contain;display:block}
  .bwrap .bname{font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;letter-spacing:.5px;line-height:1}
  .bwrap .btag{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#9FE3C5;margin-top:5px}
  .doc{text-align:right}
  .doc h1{font-size:25px;letter-spacing:5px;font-weight:800}
  .doc .sub{margin-top:8px;font-size:12px;color:#cfe8dd;line-height:1.7}
  .doc .sub b{color:#fff}
  .meta{display:flex;flex-wrap:wrap;background:#FFF9EE;border-bottom:1px solid #f0e6cf}
  .meta .m{flex:1;min-width:150px;padding:12px 20px;border-right:1px solid #f0e6cf}
  .meta .m:last-child{border-right:none}
  .meta label{display:block;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:#a8975f;margin-bottom:3px}
  .meta span{font-weight:700;font-size:13px;color:#1A322D}
  .addr{display:flex}
  .addr .a{flex:1;padding:22px 30px}
  .addr .a + .a{border-left:1px solid #eef0ed}
  .addr h3{font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#418576;margin-bottom:9px}
  .addr .nm{font-weight:700;font-size:15px;color:#1A322D;margin-bottom:4px}
  .addr p{font-size:13px;line-height:1.55;color:#4a4a4a}
  table{width:100%;border-collapse:collapse}
  thead th{background:#1A322D;color:#fff;padding:12px 16px;font-size:10.5px;letter-spacing:.7px;text-transform:uppercase;text-align:left}
  thead th.c{text-align:center}thead th.r{text-align:right}
  tbody td{padding:13px 16px;border-bottom:1px solid #eef0ed;font-size:13px;vertical-align:top}
  tbody tr:nth-child(even){background:#fafbfa}
  .c-idx{color:#aaa;width:38px}.c-qty{text-align:center;font-weight:700}.c-price,.c-amt{text-align:right;font-variant-numeric:tabular-nums}
  .c-amt{font-weight:700;color:#1A322D}
  .pname{font-weight:600;color:#1A322D}
  .sz{display:inline-block;margin-left:8px;font-size:10.5px;font-weight:700;color:#2c7a63;background:#e8f3ee;border-radius:20px;padding:2px 9px;vertical-align:middle}
  .lower{display:flex;justify-content:space-between;gap:30px;flex-wrap:wrap;padding:22px 30px}
  .notes{flex:1;min-width:230px}
  .notes h4{font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#418576;margin-bottom:8px}
  .notes p{font-size:12px;color:#666;line-height:1.6}
  .pay-badge{display:inline-block;margin-top:10px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;padding:4px 12px;border-radius:20px}
  .pay-badge.paid{background:#e3f6ec;color:#1f9d57}.pay-badge.unpaid{background:#fdecea;color:#d64541}
  .totals{width:290px}
  .totals .ln{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;color:#555}
  .totals .ln.disc span:last-child{color:#1f9d57;font-weight:700}
  .totals .grand{border-top:2px solid #1A322D;margin-top:8px;padding-top:12px;font-size:18px;font-weight:800;color:#1A322D}
  .strip{padding:18px 30px;text-align:center;border-top:1px dashed #d9d9d9}
  .barcode{height:46px;width:240px;margin:0 auto 6px;background:repeating-linear-gradient(90deg,#1A322D 0 2px,#fff 2px 4px,#1A322D 4px 5px,#fff 5px 9px,#1A322D 9px 11px,#fff 11px 13px)}
  .barcode-num{letter-spacing:4px;font-size:12px;font-weight:700;color:#1A322D}
  .footer{background:#0f241e;color:#a9c9bd;font-size:11px;text-align:center;padding:20px 30px;line-height:1.7}
  .footer .thanks{font-family:Georgia,serif;font-style:italic;font-size:15px;color:#fff;margin-bottom:6px}
  .footer a{color:#9FE3C5;text-decoration:none}
  @media print{body{background:#fff}.toolbar{display:none}.sheet{box-shadow:none;margin:0;border-radius:0;max-width:100%}}
</style></head><body>
  <div class="toolbar"><button onclick="window.print()">🖨️ Print / Save PDF</button></div>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        <span class="logo-chip"><img src="${logoUrl}" alt="Cavero Fragrances" onerror="this.style.display='none'"></span>
        <span class="bwrap"><span class="bname">Cavero Fragrances</span><span class="btag">Crafted Arabian Luxury</span></span>
      </div>
      <div class="doc">
        <h1>PACKING&nbsp;SLIP</h1>
        <div class="sub">Order <b>${orderNo}</b><br>${orderDate}</div>
      </div>
    </div>

    <div class="meta">
      <div class="m"><label>Order No.</label><span>${orderNo}</span></div>
      <div class="m"><label>Order Date</label><span>${orderDate}</span></div>
      <div class="m"><label>Items</label><span>${products.length} item(s) · ${totalQty} unit(s)</span></div>
      <div class="m"><label>Payment</label><span>${esc(this.getPaymentMethodLabel(row))}</span></div>
    </div>

    <div class="addr">
      <div class="a">
        <h3>Ship From</h3>
        <div class="nm">Cavero Fragrances</div>
        <p>Surat, Gujarat, India<br>caverofragrance@gmail.com<br>caverofragrance.com</p>
      </div>
      <div class="a">
        <h3>Ship To</h3>
        <div class="nm">${esc(this.getCustomerName(row))}</div>
        <p>${esc(this.getCustomerAddress(row))}<br>📞 ${esc(this.getCustomerPhone(row))}</p>
      </div>
    </div>

    <table>
      <thead><tr>
        <th>#</th><th>Product</th><th class="c">Qty</th><th class="r">Unit Price</th><th class="r">Amount</th>
      </tr></thead>
      <tbody>${itemsHtml || '<tr><td colspan="5" style="text-align:center;color:#999;padding:24px">No items</td></tr>'}</tbody>
    </table>

    <div class="lower">
      <div class="notes">
        <h4>Notes</h4>
        <p>Please verify the contents against this slip on delivery. For any discrepancy, contact us within 48 hours quoting your order number.</p>
        <span class="pay-badge ${paid ? 'paid' : 'unpaid'}">${paid ? '● Paid' : '● Payment pending'}</span>
      </div>
      <div class="totals">
        <div class="ln"><span>Subtotal</span><span>${inr(subtotal)}</span></div>
        ${discount > 0 ? `<div class="ln disc"><span>Discount${row?.coupon_code ? ' (' + esc(row.coupon_code) + ')' : ''}</span><span>− ${inr(discount)}</span></div>` : ''}
        <div class="ln"><span>Shipping</span><span>${shipping > 0 ? inr(shipping) : 'FREE'}</span></div>
        <div class="ln grand"><span>Grand Total</span><span>${inr(grand)}</span></div>
      </div>
    </div>

    <div class="strip">
      <div class="barcode"></div>
      <div class="barcode-num">${orderNo}</div>
    </div>

    <div class="footer">
      <div class="thanks">Thank you for choosing Cavero Fragrances</div>
      Questions? <a href="mailto:caverofragrance@gmail.com">caverofragrance@gmail.com</a> · <a href="https://caverofragrance.com">caverofragrance.com</a><br>
      This is a computer-generated packing slip and does not require a signature.
    </div>
  </div>
  <script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},400);});</script>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  updateStatusInline(row: any, nextStatus: string) {
    if (!row?.id || !nextStatus || row.order_status === nextStatus) return;

    const previousStatus = row.order_status;
    row.order_status = nextStatus;
    this.updatingStatusId = row.id;

    this.orderService.updateOrderStatus(String(row.id), nextStatus).subscribe({
      next: () => {
        this.showNotification('snackbar-success', 'Order status updated successfully!', 'bottom', 'center');
        this.updatingStatusId = null;
      },
      error: () => {
        row.order_status = previousStatus;
        this.showNotification('snackbar-danger', 'Failed to update order status', 'bottom', 'center');
        this.updatingStatusId = null;
      }
    });
  }

  getStatusLabel(value: string): string {
    return this.statusOptions.find((s) => s.value === value)?.label || value;
  }

  // ── Bulk status changes ───────────────────────────────────────────────────
  // Guided one-way flow: each status allows exactly one forward transition.
  private readonly nextStatusMap: Record<string, string> = {
    pending: 'confirmed',
    confirmed: 'processing',
    processing: 'shipped',
    shipped: 'delivered',
    delivered: 'cancelled',
  };
  bulkUpdating = false;

  get selectedCount(): number {
    return this.selection.selected.length;
  }

  /** When every selected order shares the same status, return its single allowed
   *  next status (pending→confirmed, …, delivered→cancelled). Null otherwise
   *  (mixed selection, or a terminal status like cancelled). */
  get bulkNextStatus(): { value: string; label: string } | null {
    const sel = this.selection.selected;
    if (!sel.length) return null;
    const first = sel[0]?.order_status;
    if (!sel.every((o: any) => o?.order_status === first)) return null;
    const nextVal = this.nextStatusMap[first];
    if (!nextVal) return null;
    return { value: nextVal, label: this.getStatusLabel(nextVal) };
  }

  /** True when a mixed-status set is selected (can't offer a single next step). */
  get bulkSelectionMixed(): boolean {
    const sel = this.selection.selected;
    if (sel.length < 2) return false;
    const first = sel[0]?.order_status;
    return !sel.every((o: any) => o?.order_status === first);
  }

  clearSelection(): void {
    this.selection.clear();
  }

  /** Apply a status to every selected order that isn't already on it. */
  bulkUpdateStatus(status: string): void {
    const targets = this.selection.selected.filter((o: any) => o?.id && o.order_status !== status);
    if (!targets.length) {
      this.showNotification('black', 'Selected orders are already on that status.', 'bottom', 'center');
      return;
    }

    this.bulkUpdating = true;
    const calls = targets.map((o: any) => this.orderService.updateOrderStatus(String(o.id), status));
    forkJoin(calls).subscribe({
      next: () => {
        targets.forEach((o: any) => (o.order_status = status));
        this.bulkUpdating = false;
        this.selection.clear();
        this.dataSource._updateChangeSubscription();
        this.showNotification('snackbar-success', `${targets.length} order(s) updated to ${this.getStatusLabel(status)}.`, 'bottom', 'center');
      },
      error: () => {
        this.bulkUpdating = false;
        this.showNotification('snackbar-danger', 'Some orders could not be updated. Please retry.', 'bottom', 'center');
      }
    });
  }

  getPaymentMethodLabel(row: any): string {
    const rawValue = String(row?.payment_method || '').trim().toLowerCase();
    if (!rawValue) return 'Not available';
    if (rawValue === 'cod') return 'Cash on Delivery';
    if (rawValue === 'online') return 'Online';
    return rawValue
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  getRazorpayPaymentId(row: any): string {
    return String(row?.razorpay_payment_id || '').trim() || 'N/A';
  }

  getAmountValue(value: any): number {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
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
      'Order ID': x.order_number,
      'Razorpay Order ID': x.razorpay_order_id || 'N/A',
      'Customer': this.getCustomerName(x),
      'Products': this.getProductsExportLabel(x),
      'Coupon': this.getCouponExportLabel(x),
      'Amount': x.final_amount,
      'Payment Status': x.payment_status,
      'Order Status': x.order_status,
      'Date': x.created_at
    }));

    TableExportUtil.exportToExcel(exportData, 'orders');
  }

  async downloadInvoice(row: any): Promise<void> {
    try {
      await this.invoiceService.downloadOrderInvoice(row);
    } catch (error) {
      console.error('Invoice download failed', error);
      this.showNotification('snackbar-danger', 'Unable to download invoice', 'bottom', 'center');
    }
  }

  isAllSelected() {
    // "All" means every row in the CURRENT (filtered) view — e.g. only the
    // Pending orders when the Pending filter is active.
    const rows = this.dataSource.filteredData;
    return rows.length > 0 && rows.every((row) => this.selection.isSelected(row));
  }

  masterToggle() {
    const rows = this.dataSource.filteredData;
    if (this.isAllSelected()) {
      rows.forEach((row) => this.selection.deselect(row));
    } else {
      rows.forEach((row) => this.selection.select(row));
    }
  }

  getCustomerName(row: any): string {
    const fullName = [row?.shipping_address?.firstName, row?.shipping_address?.lastName]
      .map((value: any) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');

    return row?.User?.name || fullName || row?.shipping_address?.email || 'Guest user';
  }

  getCustomerPhone(row: any): string {
    const userPhone = String(row?.User?.phone || '').trim();
    if (userPhone) return userPhone;

    const shippingPhone = String(row?.shipping_address?.phone || '').trim();
    return shippingPhone || 'Not available';
  }

  getCustomerEmail(row: any): string {
    const userEmail = String(row?.User?.email || '').trim();
    if (userEmail) return userEmail;

    const shippingEmail = String(row?.shipping_address?.email || '').trim();
    return shippingEmail || 'Not available';
  }

  getCustomerAddressLabel(row: any): string {
    const label = String(row?.shipping_address?.label || '').trim();
    return label || 'Selected address';
  }

  getCustomerAddress(row: any): string {
    const shippingAddress = row?.shipping_address || {};
    const line1 = String(
      shippingAddress?.address
      || shippingAddress?.street
      || shippingAddress?.line1
      || ''
    ).trim();

    const parts = [
      line1,
      shippingAddress?.city,
      shippingAddress?.state,
      shippingAddress?.zip_code ?? shippingAddress?.zipCode,
      shippingAddress?.country
    ]
      .map((value: any) => String(value || '').trim())
      .filter(Boolean);

    return parts.join(', ') || 'Not available';
  }

  getCouponCode(row: any): string {
    return String(row?.coupon_code || '').trim().toUpperCase();
  }

  getCouponUsageCount(row: any): number {
    const usageCount = Number(row?.coupon_usage_count || 0);
    return Number.isFinite(usageCount) && usageCount > 0 ? usageCount : 0;
  }

  hasCoupon(row: any): boolean {
    return !!this.getCouponCode(row);
  }

  getCouponUsageLabel(row: any): string {
    const usageCount = this.getCouponUsageCount(row);
    return `${usageCount} ${usageCount === 1 ? 'time' : 'times'}`;
  }

  getCouponExportLabel(row: any): string {
    const couponCode = this.getCouponCode(row);
    if (!couponCode) {
      return 'No coupon';
    }

    return `${couponCode} (${this.getCouponUsageLabel(row)})`;
  }

  getVisibleOrderItems(row: any): any[] {
    const items = Array.isArray(row?.orderItems) ? row.orderItems : [];
    return items.slice(0, 3);
  }

  getOrderItemsCount(row: any): number {
    return Array.isArray(row?.orderItems) ? row.orderItems.length : 0;
  }

  getStatusCount(status: string): number {
    return this.dataSource.data.filter((r: any) => r.order_status === status).length;
  }

  getProductsSummaryLabel(row: any): string {
    const items = Array.isArray(row?.orderItems) ? row.orderItems : [];
    if (!items.length) return 'No products';
    if (items.length === 1) return items[0].product_name || '1 product';
    return `${items.length} products`;
  }

  getRemainingOrderItemsCount(row: any): number {
    const items = Array.isArray(row?.orderItems) ? row.orderItems : [];
    return Math.max(0, items.length - 3);
  }

  getOrderProducts(row: any): any[] {
    return Array.isArray(row?.orderItems) ? row.orderItems : [];
  }

  private getProductsExportLabel(row: any): string {
    const items = Array.isArray(row?.orderItems) && row.orderItems.length
      ? row.orderItems
      : this.normalizeOrderItems(row);

    if (!items.length) return 'No products';

    return items
      .map((item: any) => {
        const productName = String(item?.product_name || `Product #${item?.product_id || ''}`)
          .replace(/\s+/g, ' ')
          .trim();
        const quantity = Math.max(1, Number(item?.quantity || 1));
        return `${productName} x${quantity}`;
      })
      .join(', ');
  }

  private normalizeOrderItems(row: any): Array<{
    id: string;
    product_id: number | string;
    product_name: string;
    quantity: number;
    price: number;
    total_price: number;
  }> {
    const rawItems = Array.isArray(row?.order_items)
      ? row.order_items
      : Array.isArray(row?.OrderItems)
        ? row.OrderItems
        : [];

    return rawItems.map((item: any, index: number) => ({
      id: String(item?.id || `${row?.id || 'order'}-${index}`),
      product_id: item?.product_id,
      product_name: item?.product?.name || item?.Product?.name || `Product #${item?.product_id}`,
      quantity: Math.max(1, Number(item?.quantity || 1)),
      price: Number(item?.price || 0),
      total_price: Number(item?.total_price || 0)
    }));
  }
}
