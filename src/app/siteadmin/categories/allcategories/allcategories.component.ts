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
import { fromEvent, Subject } from 'rxjs';
import { CategoryFormComponent } from './dialogs/form-dialog/form-dialog.component';
import { CategoryExcelImportDialogComponent } from './dialogs/excel-import-dialog/category-excel-import-dialog.component';
import { CategoryService } from './category.service';
import { Category } from './category.model';
import { rowsAnimation, TableExportUtil } from '@shared';
import { formatDate, DatePipe, CommonModule, NgClass } from '@angular/common';
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
import { environment } from 'environments/environment';

@Component({
    selector: 'app-allcategories',
    templateUrl: './allcategories.component.html',
    styleUrls: ['./allcategories.component.scss'],
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
export class AllCategoriesComponent implements OnInit, OnDestroy {
  columnDefinitions = [
  { def: 'select', label: 'Checkbox', type: 'check', visible: true },
  { def: 'name', label: 'Category Name', type: 'text', visible: true },
  { def: 'slug', label: 'Slug', type: 'text', visible: false },
  { def: 'description', label: 'Description', type: 'text', visible: true },
  { def: 'status', label: 'Status', type: 'text', visible: true },
  { def: 'is_featured', label: 'Featured', type: 'text', visible: true },
  { def: 'sort_order', label: 'Sort Order', type: 'text', visible: false },
  { def: 'image_url', label: 'Image', type: 'text', visible: false },
  { def: 'meta_title', label: 'Meta Title', type: 'text', visible: false },
  { def: 'meta_description', label: 'Meta Description', type: 'text', visible: false },
  { def: 'created_at', label: 'Created At', type: 'text', visible: false },
  { def: 'actions', label: 'Actions', type: 'actionBtn', visible: true },
];

  dataSource = new MatTableDataSource<Category>([]);
  selection = new SelectionModel<Category>(true, []);
  contextMenuPosition = { x: '0px', y: '0px' };
  isLoading = true;
  togglingId: number | string | null = null;
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filter') filter!: ElementRef;
  @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public categoryService: CategoryService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
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

  loadData() {
  this.categoryService.getAllCategories().subscribe({
    next: (res) => {
      // Filter out items with sort_order = 0
      this.dataSource.data = res.data.filter((category: Category) => category.sort_order !== 0);
      this.isLoading = false;
      this.refreshTable();
      this.dataSource.filterPredicate = (data: Category, filter: string) =>
        Object.values(data).some((value) =>
          value !== null && value !== undefined &&
          value.toString().toLowerCase().includes(filter)
        );
    },
    error: (err) => console.error(err),
  });
}
 getParentCategoryName(parentId: string): string {
    if (!parentId) return '';
    const parent = this.dataSource.data.find(cat => cat.id === parentId);
    return parent ? parent.name : 'Unknown';
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
    // auto-suggest the next sort order (max existing + 1) so the admin doesn't
    // type it manually and never sees a leading-zero default like "0"
    const nextSortOrder = this.dataSource.data.reduce(
      (max, c) => Math.max(max, Number(c.sort_order) || 0), 0
    ) + 1;
    this.openDialog('add', { sort_order: nextSortOrder } as Category);
  }

  editCall(row: Category) {
    this.openDialog('edit', row);
  }

  openDialog(action: 'add' | 'edit', data?: Category) {
    let varDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      varDirection = 'rtl';
    } else {
      varDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(CategoryFormComponent, {
      width: '60vw',
      maxWidth: '100vw',
      data: { category: data, action },
      direction: varDirection,
      autoFocus: false,
      disableClose: true, // This prevents closing on backdrop click
    hasBackdrop: true, // Keep backdrop but disable closing
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (action === 'add') {
          // Only add if sort_order is not 0
          if (result.sort_order !== 0) {
            this.dataSource.data = [result, ...this.dataSource.data];
          }
        } else {
          // Update existing item
          if (result.sort_order !== 0) {
            this.updateRecord(result);
          } else {
            // If updating to 0, remove from display
            this.dataSource.data = this.dataSource.data.filter((cat) => cat.id !== result.id);
          }
        }
        this.refreshTable();
        this.showNotification(
          action === 'add' ? 'snackbar-success' : 'black',
          `${action === 'add' ? 'Add' : 'Edit'} Record Successfully...!!!`,
          'bottom',
          'center'
        );
      }
    });
  }

  private updateRecord(updatedRecord: Category) {
  const index = this.dataSource.data.findIndex(
    (record) => record.id === updatedRecord.id
  );
  if (index !== -1) {
    this.dataSource.data[index] = updatedRecord; // Use the record as-is
    this.dataSource._updateChangeSubscription();
  }
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
    'Category Name': x.name,
    'Slug': x.slug,
    'Description': x.description,
    'Status': x.status ? 'Active' : 'Inactive',
    'Featured': x.is_featured ? 'Yes' : 'No',
    'Sort Order': x.sort_order,
    'Created At': x.created_at
  }));

  TableExportUtil.exportToExcel(exportData, 'categories');
}

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  onContextMenu(event: MouseEvent, item: Category) {
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

    this.categoryService.deleteCategories(selectedIds).subscribe({
      next: (response) => {
        this.dataSource.data = this.dataSource.data.filter(
          (item) => !selectedIds.includes(item.id)
        );
        this.selection.clear();
        this.showNotification(
          'snackbar-danger',
          `${totalSelect} Category(s) Deleted Successfully...!!!`,
          'bottom',
          'center'
        );
      },
      error: (err) => {
        console.error('Error deleting categories:', err);
        this.showNotification(
          'snackbar-danger',
          `Failed to delete categories.`,
          'bottom',
          'center'
        );
      }
    });
  }

  openExcelImport(): void {
    const dialogRef = this.dialog.open(CategoryExcelImportDialogComponent, {
      width: '80vw',
      maxWidth: '900px',
      maxHeight: '90vh',
      autoFocus: false,
      disableClose: false,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.loadData();
        this.showNotification('snackbar-success', `Successfully imported ${result.imported || 0} category(s)!`, 'bottom', 'center');
      }
    });
  }

  toggleCategoryStatus(category: Category): void {
    this.togglingId = category.id;
    const newStatus = !category.status;

    const updateData = { ...category, status: newStatus };
    this.categoryService.updateCategory(updateData).subscribe({
      next: () => {
        category.status = newStatus;
        this.dataSource._updateChangeSubscription();
        this.showNotification(
          'snackbar-success',
          `Category status updated to ${newStatus ? 'Active' : 'Inactive'}`,
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

  // ---- list thumbnail ----
  private categoryImageErrors = new Set<number | string>();

  getCategoryThumbnailUrl(row: any): string | null {
    return this.resolveCategoryImageUrl(row?.image_url);
  }
  onCategoryImageError(row: any): void {
    if (row?.id != null) this.categoryImageErrors.add(row.id);
  }
  hasCategoryImageError(row: any): boolean {
    return row?.id != null && this.categoryImageErrors.has(row.id);
  }

  private resolveCategoryImageUrl(imageUrl?: string | null): string | null {
    if (!imageUrl) return null;
    const raw = String(imageUrl).trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
      return raw;
    }
    const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${normalized}`;
    const uploadsIndex = normalized.indexOf('uploads/');
    if (uploadsIndex !== -1) return `${environment.apiGatewayBaseUrl}/${normalized.slice(uploadsIndex)}`;
    if (!normalized.includes('/')) return `${environment.apiGatewayBaseUrl}/uploads/categories/${normalized}`;
    return `${environment.apiGatewayBaseUrl}/${normalized}`;
  }
}
