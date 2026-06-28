import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Add this for ngModel
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { BrandService } from './brand.service';
import { BrandFormComponent } from './dialogs/form-dialog/form-dialog.component';
import { Brand } from './brand.model';

// Angular Material imports
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Add this
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core'; // Add this for matRipple

// Router and other modules
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { TableExportUtil } from '@shared';

// Custom components - IMPORTANT: Add FeatherIconsComponent
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component'; // Adjust path as needed

// Animations (if you're using them)
import { trigger, style, transition, animate } from '@angular/animations';

interface ColumnDefinition {
  def: string;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-all-brands',
  templateUrl: './allbrands.component.html',
  styleUrls: ['./allbrands.component.scss'],
  standalone: true,
  imports: [
    // Core Angular modules
    CommonModule,
    FormsModule, // REQUIRED for ngModel
    
    // Angular Material modules
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule, // For mat-select
    MatProgressSpinnerModule, // For mat-progress-spinner
    MatMenuModule,
    MatCardModule,
    MatRippleModule, // For matRipple directive
    
    // Router
    RouterModule,
    
    // Custom components
    BreadcrumbComponent,
    FeatherIconsComponent // ADD THIS - crucial for app-feather-icons
  ],
  // If you're using animations, add this:
  animations: [
    trigger('rowsAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AllBrandsComponent implements OnInit {

    private imageErrors = new Set<string>();

  displayedColumns: string[] = [
    'select',
    'logo',
    'name',
    'slug',
    'is_featured',
    'is_active',
    'sort_order',
    'actions'
  ];
  
  dataSource = new MatTableDataSource<Brand>();
  selection = new SelectionModel<Brand>(true, []);
  brands: Brand[] = [];
  isLoading = false;
  searchValue = '';

  // Column definitions for show/hide
  columnDefinitions: ColumnDefinition[] = [
    { def: 'select', label: 'Select', visible: true },
    { def: 'logo', label: 'Logo', visible: true },
    { def: 'name', label: 'Brand Name', visible: true },
    { def: 'slug', label: 'Slug', visible: true },
    { def: 'is_featured', label: 'Featured', visible: true },
    { def: 'is_active', label: 'Status', visible: true },
    { def: 'sort_order', label: 'Order', visible: true },
    { def: 'actions', label: 'Actions', visible: true }
  ];

  // Context menu
  contextMenuPosition = { x: '0px', y: '0px' };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private brandService: BrandService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadBrands();
  }
 getSafeLogoUrl(logo: string | null | undefined): string {
  console.log('Getting safe logo URL for:', logo);
    if (!logo || logo.trim() === '') {
      return this.getDefaultLogoUrl();
    }

    // If it's already a full URL or data URL, return as is
    if (logo.startsWith('http') || logo.startsWith('data:')) {
      return logo;
    }

    // If it's an assets path
    if (logo.startsWith('assets/')) {
      return logo;
    }

    // Handle different possible logo path formats
    return this.constructLogoUrl(logo);
  }

  // Construct proper logo URL
  private constructLogoUrl(logo: string): string {
    // Remove any leading slashes or problematic characters
    const cleanLogo = logo.replace(/^[\/\\]+/, '');
    
    // Try different base URLs
    const baseUrls = [
      window.location.origin + '/assets',
      window.location.origin
    ];

    // Try each base URL until we find one that works
    for (const baseUrl of baseUrls) {
      if (baseUrl) {
        const url = `../assets/uploads/brands/${cleanLogo}`;
        // You can add validation here to check if the URL is accessible
        return url;
      }
    }

    // Fallback to relative path
    return `uploads/brands/${cleanLogo}`;
  }

  // Default logo URL
  private getDefaultLogoUrl(): string {
    return 'assets/images/default-brand.png';
  }

  // Image error handler
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    const src = imgElement.src;
    
    // Add to error set
    this.imageErrors.add(src);
    
    // Set default image
    imgElement.src = this.getDefaultLogoUrl();
    
    // Hide the image and show placeholder
    imgElement.style.display = 'none';
    
    console.warn('Failed to load image:', src);
  }

  // Check if image has error
  isImageError(row: any): boolean {
    const logoUrl = this.getSafeLogoUrl(row.logo);
    return this.imageErrors.has(logoUrl);
  }

  // Alternative method for simple URL construction
  getLogoUrlSimple(logo: string): string {
    if (!logo) return 'assets/images/default-brand.png';
    console.log("logo",logo);
    // Check if it's already a valid URL
    if (logo.startsWith('http') || logo.startsWith('data:') || logo.startsWith('assets/')) {
      return logo;
    }
    
    // Simple relative path
    return `uploads/brands/${logo}`;
  }
  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadBrands(): void {
    this.isLoading = true;
    this.brandService.getAllBrands().subscribe({
      next: (res) => {
        // Filter out items with sort_order = 0
        this.brands = (res.data || []).filter((brand: Brand) => brand.sort_order !== 0);
        this.dataSource.data = this.brands;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading brands:', error);
        this.isLoading = false;
      }
    });
  }

  // Get displayed columns based on visibility
  getDisplayedColumns(): string[] {
    return this.columnDefinitions
      .filter(cd => cd.visible)
      .map(cd => cd.def);
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearSearch(): void {
    this.searchValue = '';
    this.dataSource.filter = '';
  }

  // Selection methods
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource.data);
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.dataSource.data);
  }

  // Add new brand
  addNewBrand(): void {
    const dialogRef = this.dialog.open(BrandFormComponent, {
      data: {
        action: 'add',
        brand: new Brand()
      },
      width: '800px',
       disableClose: true, // This prevents closing on backdrop click
    hasBackdrop: true, // Keep backdrop but disable closing
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBrands();
      }
    });
  }

  // Edit brand
  editBrand(brand: Brand): void {
    const dialogRef = this.dialog.open(BrandFormComponent, {
      data: {
        action: 'edit',
        brand: brand
      },
      width: '800px',
      autoFocus: false,
      disableClose: true, // This prevents closing on backdrop click
    hasBackdrop: true, // Keep backdrop but disable closing
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBrands();
      }
    });
  }

  // Delete brand
  deleteBrand(brand: Brand): void {
    if (confirm(`Are you sure you want to delete "${brand.name}"?`)) {
      this.brandService.deleteBrand(brand.id.toString()).subscribe({
        next: (res) => {
          this.loadBrands();
          this.selection.clear();
        },
        error: (error) => {
          console.error('Error deleting brand:', error);
          alert('Failed to delete brand');
        }
      });
    }
  }

  // Bulk delete
  deleteSelectedBrands(): void {
    const selectedIds = this.selection.selected.map(brand => brand.id.toString());
    
    if (selectedIds.length === 0) {
      alert('Please select at least one brand to delete');
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected brand(s)?`)) {
      this.brandService.deleteBrands(selectedIds).subscribe({
        next: (res) => {
          this.loadBrands();
          this.selection.clear();
        },
        error: (error) => {
          console.error('Error deleting brands:', error);
          alert('Failed to delete selected brands');
        }
      });
    }
  }

  // Toggle brand status
  toggleBrandStatus(brand: Brand): void {
    const updatedBrand = {
      ...brand,
      is_active: !brand.is_active
    };

    this.brandService.updateBrand(updatedBrand).subscribe({
      next: (res) => {
        this.loadBrands();
      },
      error: (error) => {
        console.error('Error updating brand status:', error);
        alert('Failed to update brand status');
      }
    });
  }

  // Toggle featured status
  toggleFeaturedStatus(brand: Brand): void {
    const updatedBrand = {
      ...brand,
      is_featured: !brand.is_featured
    };

    this.brandService.updateBrand(updatedBrand).subscribe({
      next: (res) => {
        this.loadBrands();
      },
      error: (error) => {
        console.error('Error updating featured status:', error);
        alert('Failed to update featured status');
      }
    });
  }

  // Get logo URL
  getLogoUrl(logo: string): string {
    console.log('Original logo value:', logo);
    if (!logo) return '';
    
    // Check if logo already has full URL
    if (logo.startsWith('http')) return logo;
    
    // Check if logo starts with assets path
    if (logo.startsWith('assets/')) return logo;
    
    // Use relative path
    return `assets/uploads/brands/${logo}`;
  }

 
  // Context menu
  onContextMenu(event: MouseEvent, brand: Brand): void {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
  }

  // Export to Excel (placeholder)
  exportExcel(): void {
    const exportData = this.dataSource.filteredData.map((brand) => ({
      'Brand Name': brand.name,
      'Slug': brand.slug,
      'Featured': brand.is_featured ? 'Yes' : 'No',
      'Status': brand.is_active ? 'Active' : 'Inactive',
      'Sort Order': brand.sort_order ?? '',
    }));

    TableExportUtil.exportToExcel(exportData, 'brands');
  }

  // Remove selected rows (alias for deleteSelectedBrands)
  removeSelectedRows(): void {
    this.deleteSelectedBrands();
  }

  // Add new (alias for addNewBrand)
  addNew(): void {
    this.addNewBrand();
  }

  // Edit call (alias for editBrand)
  editCall(brand: Brand): void {
    this.editBrand(brand);
  }

  // Refresh (alias for loadBrands)
  refresh(): void {
    this.loadBrands();
  }
}
