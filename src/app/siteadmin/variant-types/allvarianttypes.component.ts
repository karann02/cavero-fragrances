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
import { VariantTypeFormComponent } from './dialogs/form-dialog/form-dialog.component';
import { VariantTypeService } from './varianttype.service';
import { VariantType } from './varianttype.model';
import { rowsAnimation, TableExportUtil } from '@shared';
import { CommonModule, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
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

@Component({
  selector: 'app-allvarianttypes',
  templateUrl: './allvarianttypes.component.html',
  styleUrls: ['./allvarianttypes.component.scss'],
  animations: [rowsAnimation],
  imports: [
    BreadcrumbComponent,
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
export class AllVariantTypesComponent implements OnInit, OnDestroy {
  columnDefinitions = [
    { def: 'select', label: 'Checkbox', type: 'check', visible: true },
    { def: 'name', label: 'Size Name', type: 'text', visible: true },
    { def: 'is_active', label: 'Status', type: 'text', visible: true },
    { def: 'sort_order', label: 'Sort Order', type: 'text', visible: true },
    { def: 'actions', label: 'Actions', type: 'actionBtn', visible: true },
  ];
  columnFilterValue: string[] = [];

  dataSource = new MatTableDataSource<VariantType>([]);
  selection = new SelectionModel<VariantType>(true, []);
  contextMenuPosition = { x: '0px', y: '0px' };
  isLoading = true;
  private destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filter') filter!: ElementRef;
  @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public variantTypeService: VariantTypeService,
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
    this.variantTypeService.getAllAdmin().subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.isLoading = false;
        this.refreshTable();
        this.dataSource.filterPredicate = (data: VariantType, filter: string) =>
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
    // auto-suggest the next sort order (max existing + 1) so the admin doesn't
    // type it manually and never sees a leading-zero default like "0"
    const nextSortOrder = this.dataSource.data.reduce(
      (max, t) => Math.max(max, Number(t.sort_order) || 0), 0
    ) + 1;
    this.openDialog('add', { sort_order: nextSortOrder } as VariantType);
  }

  editCall(row: VariantType) {
    this.openDialog('edit', row);
  }

  openDialog(action: 'add' | 'edit', data?: VariantType) {
    let varDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      varDirection = 'rtl';
    } else {
      varDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(VariantTypeFormComponent, {
      width: '60vw',
      maxWidth: '100vw',
      data: { varianttype: data, action },
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

  private updateRecord(updatedRecord: VariantType) {
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
    const exportData = this.dataSource.filteredData.map((x) => ({
      'Size Name': x.name,
      'Status': x.is_active ? 'Active' : 'Inactive',
      'Sort Order': x.sort_order,
      'Created At': x.createdAt
    }));
    TableExportUtil.exportToExcel(exportData, 'VariantTypes');
  }

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  onContextMenu(event: MouseEvent, item: VariantType) {
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

    this.variantTypeService.delete(selectedIds).subscribe({
      next: () => {
        this.dataSource.data = this.dataSource.data.filter(
          (item) => !selectedIds.includes(item.id)
        );
        this.selection.clear();
        this.showNotification(
          'snackbar-danger',
          `${totalSelect} Size(s) Deleted Successfully...!!!`,
          'bottom',
          'center'
        );
      },
      error: (err) => {
        console.error('Error deleting variant types:', err);
        this.showNotification(
          'snackbar-danger',
          `Failed to delete sizes.`,
          'bottom',
          'center'
        );
      }
    });
  }
}
