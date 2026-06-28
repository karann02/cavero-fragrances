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
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, interval } from 'rxjs';
import { catchError } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductFormComponent } from './dialogs/form-dialog/form-dialog.component';
import { ExcelImportDialogComponent } from './dialogs/excel-import-dialog/excel-import-dialog.component';
import { ProductService } from './product.service';
import { Product } from './product.model';
import { rowsAnimation, TableExportUtil } from '@shared';
import { CommonModule, NgClass } from '@angular/common';
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
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { Direction } from '@angular/cdk/bidi';
import { AuthService } from '@core/service/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-allproducts',
  templateUrl: './allproducts.component.html',
  styleUrls: ['./allproducts.component.scss'],
  animations: [rowsAnimation],
  imports: [
    FeatherIconsComponent,
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
export class AllProductsComponent implements OnInit, OnDestroy {
  readonly apiBase = environment.apiGatewayBaseUrl;
  private imageErrors = new Set<string>();
  columnDefinitions = [
    { def: 'select', label: 'Checkbox', type: 'check', visible: true },
    { def: 'name', label: 'Product Name', type: 'text', visible: true },
    { def: 'sku', label: 'SKU', type: 'text', visible: true },
    { def: 'category_name', label: 'Category', type: 'text', visible: true },
    { def: 'price', label: 'Price', type: 'text', visible: true },
    { def: 'quantity', label: 'Stock', type: 'text', visible: true },
    { def: 'actions', label: 'Actions', type: 'actionBtn', visible: true },
  ];

  dataSource = new MatTableDataSource<Product>([]);
  selection = new SelectionModel<Product>(true, []);
  contextMenuPosition = { x: '0px', y: '0px' };
  isLoading = true;
  columnFilterValue = '';
  editingCell: { rowId: any; field: 'price' | 'quantity' } | null = null;
  inlineValue = '';
  inlineSaving = false;
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filter') filter!: ElementRef;
  @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public productService: ProductService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadData();
    interval(15000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.editingCell && !this.inlineSaving) {
          this.loadData();
        }
      });
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

  loadData() {
    this.productService.getAllProducts().subscribe({
      next: (res) => {
        const normalizedRows = (res?.data || []).map((row: any) =>
          this.normalizeProductRow(row)
        );
        this.dataSource.data = this.dedupeProducts(normalizedRows);
        this.isLoading = false;
        this.refreshTable();
        this.dataSource.filterPredicate = (data: Product, filter: string) =>
          Object.values(data).some(
            (value) =>
              value !== null &&
              value !== undefined &&
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
    if (this.paginator) {
      this.paginator.pageIndex = 0;
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
    this.dataSource._updateChangeSubscription();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value
      .trim()
      .toLowerCase();
    this.dataSource.filter = filterValue;
  }

  addNew() {
    this.openDialog('add');
  }

  editCall(row: Product) {
    this.openDialog('edit', row);
  }

  openDialog(action: 'add' | 'edit', data?: Product) {
    const varDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(ProductFormComponent, {
      width: '80vw',
      maxWidth: '100vw',
      maxHeight: '92vh',
      panelClass: 'cavero-product-dialog',
      data: { product: data, action },
      direction: varDirection,
      autoFocus: false,
      disableClose: true,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      if (action === 'add') {
        this.loadData();
      } else {
        this.updateRecord(this.normalizeProductRow(result));
        this.refreshTable();
      }

      this.showNotification(
        action === 'add' ? 'snackbar-success' : 'black',
        `${action === 'add' ? 'Add' : 'Edit'} Record Successfully...!!!`,
        'bottom',
        'center'
      );
    });
  }

  private updateRecord(updatedRecord: Product) {
    const index = this.dataSource.data.findIndex(
      (record) => record.id === updatedRecord.id
    );

    if (index !== -1) {
      const nextData = [...this.dataSource.data];
      nextData[index] = updatedRecord;
      this.dataSource.data = this.dedupeProducts(nextData);
      return;
    }

    this.dataSource.data = this.dedupeProducts([updatedRecord, ...this.dataSource.data]);
  }

  private normalizeProductRow(row: any): Product {
    const normalizedQuantity = Number(row?.quantity ?? row?.stock ?? 0);
    return {
      ...row,
      quantity: Number.isFinite(normalizedQuantity) ? normalizedQuantity : 0,
      stock: Number.isFinite(normalizedQuantity) ? normalizedQuantity : 0,
      status: row?.status ? 'Active' : 'Inactive',
      statusBoolean: row?.status,
    } as Product;
  }

  private dedupeProducts(rows: Product[]): Product[] {
    const deduped = new Map<string, Product>();

    for (const row of rows) {
      const key = row?.id
        ? `id:${row.id}`
        : `sku:${row?.sku || ''}|name:${row?.name || ''}|category:${(row as any)?.category_id || ''}`;

      if (!deduped.has(key)) {
        deduped.set(key, row);
      }
    }

    return Array.from(deduped.values());
  }

  getProductThumbnailUrl(row: Product): string | null {
    const firstImage = Array.isArray((row as any)?.images) ? (row as any).images[0] : null;
    if (!firstImage) {
      return null;
    }

    return this.resolveProductImageUrl(firstImage);
  }

  onProductImageError(row: Product): void {
    const key = this.getProductImageKey(row);
    if (key) {
      this.imageErrors.add(key);
    }
  }

  hasProductImageError(row: Product): boolean {
    const key = this.getProductImageKey(row);
    return key ? this.imageErrors.has(key) : false;
  }

  private getProductImageKey(row: Product): string | null {
    const firstImage = Array.isArray((row as any)?.images) ? (row as any).images[0] : null;
    if (!firstImage) {
      return null;
    }

    if (typeof firstImage === 'string') {
      return firstImage;
    }

    return (
      firstImage.filename ||
      firstImage.image_url ||
      firstImage.url ||
      firstImage.path ||
      null
    );
  }

  private resolveProductImageUrl(image: any): string | null {
    if (!image) {
      return null;
    }

    if (typeof image === 'string') {
      return this.normalizeProductImageValue(image);
    }

    if (image.filename) {
      return `${this.apiBase}/uploads/products/${image.filename}`;
    }

    if (image.image_url) {
      return this.normalizeProductImageValue(image.image_url);
    }

    if (image.url) {
      return this.normalizeProductImageValue(image.url);
    }

    if (image.path) {
      return this.normalizeProductImageValue(image.path);
    }

    return null;
  }

  private normalizeProductImageValue(value: string): string {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return '';
    }

    if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('data:')) {
      return normalized;
    }

    if (normalized.startsWith('/uploads/')) {
      return `${this.apiBase}${normalized}`;
    }

    if (normalized.startsWith('uploads/')) {
      return `${this.apiBase}/${normalized}`;
    }

    if (normalized.includes('/uploads/')) {
      const uploadsIndex = normalized.indexOf('/uploads/');
      return `${this.apiBase}${normalized.slice(uploadsIndex)}`;
    }

    if (normalized.includes('uploads\\')) {
      const uploadsIndex = normalized.indexOf('uploads\\');
      const uploadPath = normalized.slice(uploadsIndex).replace(/\\/g, '/');
      return `${this.apiBase}/${uploadPath}`;
    }

    return `${this.apiBase}/uploads/products/${normalized.split('/').pop()}`;
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
      'Product Name': x.name,
      SKU: x.sku,
      Category: (x as any).category_name || '',
      Price: x.price,
      Stock: x.quantity,
      Status: String((x as any).status ?? ''),
    }));

    TableExportUtil.exportToExcel(exportData, 'products');
  }

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  onContextMenu(event: MouseEvent, item: Product) {
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

  removeSelectedRows() {
    const selectedIds = this.selection.selected.map((item: any) => item.id);
    const totalSelect = selectedIds.length;

    this.productService.deleteProducts(selectedIds).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(
          (item) => !selectedIds.includes(item.id)
        );
        this.selection.clear();
        this.showNotification(
          'snackbar-danger',
          `${totalSelect} Product(s) Deleted Successfully...!!!`,
          'bottom',
          'center'
        );
      },
      error: (err) => {
        console.error('Error deleting products:', err);
        this.showNotification(
          'snackbar-danger',
          'Failed to delete products.',
          'bottom',
          'center'
        );
      }
    });
  }

  openExcelImport(): void {
    const varDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(ExcelImportDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      direction: varDirection,
      autoFocus: false,
      disableClose: false,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.success) {
        this.loadData();
        this.showNotification(
          'snackbar-success',
          `Successfully imported ${result.imported || 0} product(s)!`,
          'bottom',
          'center'
        );
      }
    });
  }

  startInlineEdit(row: Product, field: 'price' | 'quantity'): void {
    this.editingCell = { rowId: row.id, field };
    const currentValue =
      field === 'price'
        ? Number((row as any).price || 0)
        : Number((row as any).quantity || 0);
    this.inlineValue = Number.isFinite(currentValue) ? String(currentValue) : '0';
  }

  isEditing(row: Product, field: 'price' | 'quantity'): boolean {
    return this.editingCell?.rowId === row.id && this.editingCell?.field === field;
  }

  cancelInlineEdit(): void {
    this.editingCell = null;
    this.inlineValue = '';
    this.inlineSaving = false;
  }

  saveInlineEdit(row: Product): void {
    if (!this.editingCell || this.inlineSaving) {
      return;
    }

    const field = this.editingCell.field;
    const parsed = Number(this.inlineValue);

    if (!Number.isFinite(parsed) || parsed < 0) {
      this.showNotification('snackbar-danger', `Invalid ${field} value.`, 'bottom', 'center');
      return;
    }

    const rounded = field === 'price' ? Number(parsed.toFixed(2)) : Math.floor(parsed);
    this.inlineSaving = true;

    const request$ =
      field === 'quantity'
        ? this.productService.updateProductStock(String(row.id), rounded, 'set')
        : this.productService.quickUpdateProduct(row.id, { price: rounded }).pipe(
            catchError(() => {
              const formData = this.buildInlinePriceUpdateFormData(row, rounded);
              return this.productService.updateProductWithImages(formData);
            })
          );

    request$.subscribe({
      next: () => {
        if (field === 'price') {
          (row as any).price = rounded;
        } else {
          (row as any).quantity = rounded;
        }
        this.dataSource._updateChangeSubscription();
        this.showNotification(
          'snackbar-success',
          `${field === 'price' ? 'Price' : 'Stock'} updated.`,
          'bottom',
          'center'
        );
        this.cancelInlineEdit();
      },
      error: () => {
        this.inlineSaving = false;
        this.showNotification('snackbar-danger', `Failed to update ${field}.`, 'bottom', 'center');
      }
    });
  }

  private buildInlinePriceUpdateFormData(row: Product, price: number): FormData {
    const formData = new FormData();
    formData.append('id', String(row.id));
    formData.append('name', String((row as any).name || ''));
    formData.append('sku', String((row as any).sku || ''));
    formData.append('slug', String((row as any).slug || ''));
    formData.append('description', String((row as any).description || ''));
    formData.append('short_description', String((row as any).short_description || ''));
    formData.append('price', String(price));
    formData.append('compare_price', String((row as any).compare_price ?? 0));
    formData.append('cost_price', String((row as any).cost_price ?? 0));
    formData.append('quantity', String((row as any).quantity ?? 0));

    const categoryId = (row as any).category_id;
    const brandId = (row as any).brand_id;

    if (categoryId !== undefined && categoryId !== null && String(categoryId).trim() !== '') {
      formData.append('category_id', String(categoryId));
    }

    if (brandId !== undefined && brandId !== null && String(brandId).trim() !== '') {
      formData.append('brand_id', String(brandId));
    }

    formData.append('tags', JSON.stringify((row as any).tags || []));
    formData.append('weight', String((row as any).weight ?? 0));
    formData.append('ingredients', String((row as any).ingredients || ''));
    formData.append('delivery_info', String((row as any).delivery_info || ''));
    formData.append('is_featured', String(Boolean((row as any).is_featured)));
    formData.append('is_published', String(Boolean((row as any).is_published ?? true)));
    formData.append('status', String((row as any).statusBoolean ?? (row as any).status ?? true));
    formData.append('track_quantity', String(Boolean((row as any).track_quantity ?? true)));
    formData.append('specifications', JSON.stringify((row as any).specifications || {}));
    formData.append('dimensions', JSON.stringify((row as any).dimensions || {}));
    formData.append('existing_images', JSON.stringify((row as any).images || []));
    return formData;
  }
}
