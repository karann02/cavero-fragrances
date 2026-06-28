// allcombos.component.ts
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
import { Subject } from 'rxjs';
import { ComboFormComponent } from './dialogs/form-dialog/form-dialog.component';
import { ComboService } from './combo.service';
import { Combo } from './combo.model';
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
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { Direction } from '@angular/cdk/bidi';
import { AuthService } from '@core/service/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-allcombos',
    templateUrl: './allcombos.component.html',
    styleUrls: ['./allcombos.component.scss'],
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
export class AllCombosComponent implements OnInit, OnDestroy {
  comboBoxSettings = {
    box_price: 1200,
    image: '',
    updated_at: null as string | null
  };
  isSavingComboBoxPrice = false;
  selectedComboBoxImageFile: File | null = null;
  comboBoxImagePreview = '';
  removeComboBoxImageOnSave = false;

  columnDefinitions = [
    { def: 'select', label: 'Checkbox', type: 'check', visible: true },
    { def: 'image', label: 'Image', type: 'text', visible: true },
    { def: 'name', label: 'Combo Name', type: 'text', visible: true },
    { def: 'products', label: 'Products', type: 'text', visible: true },
    { def: 'validity', label: 'Validity', type: 'text', visible: true },
    { def: 'discount_price', label: 'Combo Price', type: 'text', visible: true },
    { def: 'combo_size', label: 'Combo Size', type: 'text', visible: false },
    { def: 'active', label: 'Status', type: 'text', visible: true },
    { def: 'created_at', label: 'Created At', type: 'text', visible: false },
    { def: 'actions', label: 'Actions', type: 'actionBtn', visible: true },
  ];

  dataSource = new MatTableDataSource<Combo>([]);
  selection = new SelectionModel<Combo>(true, []);
  contextMenuPosition = { x: '0px', y: '0px' };
  isLoading = true;
  togglingId: number | string | null = null;
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filter') filter!: ElementRef;
  @ViewChild('comboBoxImageInput') comboBoxImageInput?: ElementRef<HTMLInputElement>;
  @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public comboService: ComboService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadComboBoxSettings();
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh() {
    this.loadComboBoxSettings();
    this.loadData();
  }

  getDisplayedColumns(): string[] {
    return this.columnDefinitions
      .filter((column) => column.visible)
      .map((column) => column.def);
  }

  loadData() {
    this.comboService.getAllCombos().subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.isLoading = false;
        this.refreshTable();
        this.dataSource.filterPredicate = (data: Combo, filter: string) =>
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

  loadComboBoxSettings() {
    this.comboService.getComboBoxSettings().subscribe({
      next: (res) => {
        this.comboBoxSettings.box_price = Number(res?.data?.box_price ?? 1200) || 1200;
        this.comboBoxSettings.image = String(res?.data?.image || '').trim();
        this.comboBoxSettings.updated_at = res?.data?.updated_at ? String(res.data.updated_at) : null;
        this.comboBoxImagePreview = this.getComboBoxSettingsImageUrl(
          this.comboBoxSettings.image,
          this.comboBoxSettings.updated_at
        );
        this.selectedComboBoxImageFile = null;
        this.removeComboBoxImageOnSave = false;
      },
      error: () => {
        this.comboBoxSettings.box_price = 1200;
        this.comboBoxSettings.image = '';
        this.comboBoxSettings.updated_at = null;
        this.comboBoxImagePreview = '';
        this.selectedComboBoxImageFile = null;
        this.removeComboBoxImageOnSave = false;
      }
    });
  }

  saveComboBoxSettings() {
    const boxPrice = Number(this.comboBoxSettings.box_price);
    if (!Number.isFinite(boxPrice) || boxPrice < 0) {
      this.showNotification(
        'snackbar-danger',
        'Please enter a valid build your own box price.',
        'bottom',
        'center'
      );
      return;
    }

    this.isSavingComboBoxPrice = true;
    const formData = new FormData();
    formData.append('box_price', String(boxPrice));
    if (this.selectedComboBoxImageFile) {
      formData.append('image', this.selectedComboBoxImageFile);
    }
    if (this.removeComboBoxImageOnSave) {
      formData.append('remove_image', 'true');
      formData.append('image', '');
    }

    this.comboService.saveComboBoxSettings(formData).subscribe({
      next: (res) => {
        this.comboBoxSettings.box_price = Number(res?.data?.box_price ?? boxPrice) || boxPrice;
        this.comboBoxSettings.image = String(res?.data?.image || '').trim();
        this.comboBoxSettings.updated_at = res?.data?.updated_at ? String(res.data.updated_at) : null;
        this.comboBoxImagePreview = this.getComboBoxSettingsImageUrl(
          this.comboBoxSettings.image,
          this.comboBoxSettings.updated_at
        );
        this.selectedComboBoxImageFile = null;
        this.removeComboBoxImageOnSave = false;
        if (this.comboBoxImageInput?.nativeElement) {
          this.comboBoxImageInput.nativeElement.value = '';
        }
        this.isSavingComboBoxPrice = false;
        this.showNotification(
          'snackbar-success',
          'Build your own box settings updated successfully.',
          'bottom',
          'center'
        );
      },
      error: () => {
        this.isSavingComboBoxPrice = false;
        this.showNotification(
          'snackbar-danger',
          'Failed to update build your own box settings.',
          'bottom',
          'center'
        );
      }
    });
  }

  triggerComboBoxImagePicker(): void {
    this.comboBoxImageInput?.nativeElement.click();
  }

  onComboBoxImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    if (!file) {
      return;
    }

    if (!String(file.type || '').startsWith('image/')) {
      this.showNotification('snackbar-danger', 'Please select a valid image file.', 'bottom', 'center');
      input.value = '';
      return;
    }

    this.selectedComboBoxImageFile = file;
    this.removeComboBoxImageOnSave = false;
    this.comboBoxImagePreview = URL.createObjectURL(file);
  }

  removeComboBoxImage(): void {
    this.selectedComboBoxImageFile = null;
    this.removeComboBoxImageOnSave = true;
    this.comboBoxSettings.image = '';
    this.comboBoxSettings.updated_at = null;
    this.comboBoxImagePreview = '';
    if (this.comboBoxImageInput?.nativeElement) {
      this.comboBoxImageInput.nativeElement.value = '';
    }
  }

  getComboBoxSettingsImageUrl(rawImage: string | null | undefined, version?: string | null): string {
    const image = String(rawImage || '').trim();
    if (!image) return '';

    let resolvedImage = image;
    if (image.startsWith('/uploads/')) {
      resolvedImage = `${environment.apiGatewayBaseUrl}${image}`;
    } else if (image.startsWith('uploads/')) {
      resolvedImage = `${environment.apiGatewayBaseUrl}/${image}`;
    }

    if (!version) {
      return resolvedImage;
    }

    const separator = resolvedImage.includes('?') ? '&' : '?';
    return `${resolvedImage}${separator}v=${encodeURIComponent(version)}`;
  }

  getProductNames(combo: Combo): string {
    if (!combo.products || combo.products.length === 0) {
      return 'No products';
    }

    return combo.products
      .map((product: any, index: number) => `#${index + 1} ${product.product_name || product.name || 'Product'}`)
      .join(', ');
  }

  getComboImageUrl(combo: Combo): string {
    const rawImage = String(combo?.image || '').trim();
    if (!rawImage) return 'assets/cavero/img/shop/grocery/01.png';
    if (rawImage.startsWith('http')) return rawImage;
    if (rawImage.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${rawImage}`;
    if (rawImage.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${rawImage}`;
    return rawImage;
  }

  getValidityLabel(combo: Combo): string {
    const validFrom = combo.valid_from ? formatDate(combo.valid_from, 'dd MMM yyyy', 'en') : 'N/A';
    const validTo = combo.valid_to ? formatDate(combo.valid_to, 'dd MMM yyyy', 'en') : 'N/A';
    return `${validFrom} to ${validTo}`;
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
    this.openDialog('add');
  }

  editCall(row: Combo) {
    this.openDialog('edit', row);
  }

  openDialog(action: 'add' | 'edit', data?: Combo) {
    let varDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      varDirection = 'rtl';
    } else {
      varDirection = 'ltr';
    }

    const dialogRef = this.dialog.open(ComboFormComponent, {
      width: '80vw',
      maxWidth: '100vw',
      data: { combo: data, action },
      direction: varDirection,
      autoFocus: false,
      disableClose: true,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (action === 'add') {
          this.dataSource.data = [result, ...this.dataSource.data];
        } else {
          this.updateRecord(result);
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

  private updateRecord(updatedRecord: Combo) {
    const index = this.dataSource.data.findIndex(
      (record) => record.id === updatedRecord.id
    );
    if (index !== -1) {
      this.dataSource.data[index] = updatedRecord;
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
    const exportData = this.dataSource.filteredData.map((combo) => ({
      'Combo Name': combo.name,
      'Products': this.getProductNames(combo),
      'Validity': this.getValidityLabel(combo),
      'Combo Price': `Rs ${combo.discount_price}`,
      'Combo Size': `${combo.combo_size}`,
      'Status': combo.active ? 'Active' : 'Inactive',
      'Created At': combo.created_at
    }));

    TableExportUtil.exportToExcel(exportData, 'combos');
  }

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  onContextMenu(event: MouseEvent, item: Combo) {
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

    this.comboService.deleteCombos(selectedIds).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(
          (item) => !selectedIds.includes(item.id)
        );
        this.selection.clear();
        this.showNotification(
          'snackbar-danger',
          `${totalSelect} Combo(s) Deleted Successfully...!!!`,
          'bottom',
          'center'
        );
      },
      error: (err) => {
        console.error('Error deleting combos:', err);
        this.showNotification(
          'snackbar-danger',
          'Failed to delete combos.',
          'bottom',
          'center'
        );
      }
    });
  }

  toggleComboStatus(combo: Combo): void {
    this.togglingId = combo.id;
    const newStatus = !combo.active;

    const updateData = { ...combo, active: newStatus };
    this.comboService.updateCombo(updateData).subscribe({
      next: () => {
        combo.active = newStatus;
        this.dataSource._updateChangeSubscription();
        this.showNotification(
          'snackbar-success',
          `Combo status updated to ${newStatus ? 'Active' : 'Inactive'}`,
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
