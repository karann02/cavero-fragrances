// allsliders.component.ts
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
import { SliderFormComponent } from './dialogs/form-dialog/form-dialog.component';
import { SliderService } from './slider.service';
import { Slider } from './slider.model';
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
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-allsliders',
    templateUrl: './allsliders.component.html',
    styleUrls: ['./allsliders.component.scss'],
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
export class AllSlidersComponent implements OnInit, OnDestroy {
  columnDefinitions = [
  { def: 'select', label: 'Checkbox', type: 'check', visible: true },
  { def: 'description', label: 'Description', type: 'text', visible: false },
  { def: 'image', label: 'Image', type: 'text', visible: true },
  { def: 'button_text', label: 'Button Text', type: 'text', visible: false },
  { def: 'button_url', label: 'Button URL', type: 'text', visible: false },
  { def: 'is_active', label: 'Status', type: 'text', visible: true },
  { def: 'display_on', label: 'Display On', type: 'text', visible: true },
  { def: 'sort_order', label: 'Sort Order', type: 'text', visible: true },
  { def: 'background_color', label: 'Background', type: 'text', visible: false },
  { def: 'text_color', label: 'Text Color', type: 'text', visible: false },
  { def: 'created_at', label: 'Created At', type: 'text', visible: false },
  { def: 'actions', label: 'Actions', type: 'actionBtn', visible: true },
];

  dataSource = new MatTableDataSource<Slider>([]);
  selection = new SelectionModel<Slider>(true, []);
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
    public sliderService: SliderService,
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
  this.sliderService.getAllSliders().subscribe({
    next: (res) => {
      // Filter out items with sort_order = 0
      this.dataSource.data = (res.data || []).filter((slider: Slider) => slider.sort_order !== 0);
      this.isLoading = false;
      this.refreshTable();
      this.dataSource.filterPredicate = (data: Slider, filter: string) =>
        Object.values(data).some((value) =>
          value !== null && value !== undefined &&
          value.toString().toLowerCase().includes(filter)
        );
    },
    error: (err) => console.error(err),
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
    // auto-suggest the next sort order (max existing + 1) so the admin doesn't count manually
    const nextSortOrder = this.dataSource.data.reduce(
      (max, s) => Math.max(max, Number(s.sort_order) || 0), 0
    ) + 1;
    this.openDialog('add', { sort_order: nextSortOrder } as Slider);
  }

  editCall(row: Slider) {
    this.openDialog('edit', row);
  }

  openDialog(action: 'add' | 'edit', data?: Slider) {
    let varDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      varDirection = 'rtl';
    } else {
      varDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(SliderFormComponent, {
      width: '60vw',
      maxWidth: '100vw',
      data: { slider: data, action },
      direction: varDirection,
      autoFocus: false,
      disableClose: true,
      hasBackdrop: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (action === 'add') {
          // Only add if sort_order is not 0
          if (result.sort_order !== 0) {
            this.dataSource.data = [result, ...this.dataSource.data];
          }
          this.refreshTable();
        } else {
          this.loadData();
        }
        this.showNotification(
          action === 'add' ? 'snackbar-success' : 'black',
          `${action === 'add' ? 'Add' : 'Edit'} Record Successfully...!!!`,
          'bottom',
          'center'
        );
      }
    });
  }

  private updateRecord(updatedRecord: Slider) {
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
    'Title': x.title,
    'Subtitle': x.subtitle,
    'Description': x.description,
    'Button Text': x.button_text,
    'Button URL': x.button_url,
    'Status': x.is_active ? 'Active' : 'Inactive',
    'Display On': x.display_on || 'all',
    'Sort Order': x.sort_order,
    'Background Color': x.background_color,
    'Text Color': x.text_color,
    'Created At': x.created_at
  }));

  TableExportUtil.exportToExcel(exportData, 'sliders');
}

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach((row) => this.selection.select(row));
  }

  getImageUrl(image: string): string {
    if (!image) return '';
    if (image.startsWith('http')) return image;
    if (image.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${image}`;
    return image;
  }

  onContextMenu(event: MouseEvent, item: Slider) {
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

  toggleSliderStatus(slider: Slider): void {
    this.togglingId = slider.id;
    const newStatus = !slider.is_active;

    const formData = new FormData();
    formData.append('is_active', newStatus ? '1' : '0');

    this.sliderService.updateSlider(String(slider.id), formData).subscribe({
      next: () => {
        slider.is_active = newStatus;
        this.dataSource._updateChangeSubscription();
        this.showNotification(
          'snackbar-success',
          `Slider status updated to ${newStatus ? 'Active' : 'Inactive'}`,
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

  removeSelectedRows() {
    const selectedIds = this.selection.selected.map((item: any) => item.id);
    const totalSelect = selectedIds.length;

    this.sliderService.deleteSliders(selectedIds).subscribe({
      next: (response) => {
        this.dataSource.data = this.dataSource.data.filter(
          (item) => !selectedIds.includes(item.id)
        );
        this.selection.clear();
        this.showNotification('snackbar-danger', `${totalSelect} Slider(s) Deleted Successfully...!!!`, 'bottom', 'center');
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to delete sliders.';
        this.showNotification('snackbar-danger', msg, 'bottom', 'center');
      }
    });
  }
}
