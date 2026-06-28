import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import { ProductService } from '../../product.service';
import { CategoryService } from '../../../../categories/allcategories/category.service';
import { ProductTypeService } from '../../../../producttype/allproducttypes/producttype.service';

export interface ExcelProductRow {
  name: string;
  sku: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_price?: number;
  quantity: number;
  sub_category_name?: string;
  category_id?: number;
  product_type_name?: string;
  product_type_id?: number;
  tags?: string;
  weight?: number;
  ingredients?: string;
  calories?: string;
  delivery_info?: string;
  is_featured?: boolean;
  is_published?: boolean;
  status?: boolean;
  errors?: string[];
  selected?: boolean;
}

@Component({
  selector: 'app-excel-import-dialog',
  templateUrl: './excel-import-dialog.component.html',
  styleUrls: ['./excel-import-dialog.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatDialogContent,
    MatDialogTitle,
  ],
})
export class ExcelImportDialogComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  parsedData: ExcelProductRow[] = [];
  displayedColumns: string[] = [
    'select',
    'name',
    'sku',
    'price',
    'quantity',
    'category',
    'status',
    'errors',
  ];
  isLoading = false;
  importProgress = 0;
  isImporting = false;
  selectedRows = new Set<number>();
  allSelected = false;

  categories: any[] = [];
  productTypes: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<ExcelImportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private productService: ProductService,
    private categoryService: CategoryService,
    private productTypeService: ProductTypeService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadReferenceData();
  }

  triggerFileInput(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  loadReferenceData(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (res) => {
        this.categories = res.data || [];
      },
      error: (err) => console.error('Error loading categories:', err),
    });


    this.productTypeService.getAllProductTypes().subscribe({
      next: (res) => {
        this.productTypes = res.data || [];
      },
      error: (err) => console.error('Error loading product types:', err),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.name.endsWith('.csv')) {
        this.processCSVFile(file);
      } else {
        this.processExcelFile(file);
      }
    }
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        if (file.name.endsWith('.csv')) {
          this.processCSVFile(file);
        } else {
          this.processExcelFile(file);
        }
      } else {
        this.showError('Please upload a valid Excel file (.xlsx, .xls) or CSV file (.csv)');
      }
    }
  }

  processCSVFile(file: File): void {
    this.isLoading = true;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const csvData = e.target.result;
        const workbook = XLSX.read(csvData, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        this.parsedData = jsonData.map((row, index) => {
          let productRow: ExcelProductRow = {
            name: this.getStringValue(row, 'name', 'product name'),
            sku: this.getStringValue(row, 'sku', 'SKU'),
            description: this.getStringValue(row, 'description', 'description'),
            short_description: this.getStringValue(
              row,
              'short_description',
              'short description'
            ),
            price: this.getNumberValue(row, 'price', 'price'),
            compare_price: this.getNumberValue(row, 'compare_price', 'compare price'),
            quantity: this.getNumberValue(row, 'quantity', 'stock', 0),
            sub_category_name: this.getStringValue(row, 'sub_category', 'sub category'),
            product_type_name: this.getStringValue(row, 'product_type', 'product type'),
            tags: this.getStringValue(row, 'tags', 'tags'),
            weight: this.getNumberValue(row, 'weight', 'weight'),
            ingredients: this.getStringValue(row, 'ingredients', 'ingredients'),
            calories: this.getStringValue(row, 'calories', 'calories'),
            delivery_info: this.getStringValue(row, 'delivery_info', 'delivery info'),
            is_featured: this.getBooleanValue(row, 'is_featured', 'is featured'),
            is_published: this.getBooleanValue(row, 'is_published', 'is published', true),
            status: this.getBooleanValue(row, 'status', 'status', true),
            selected: true,
            errors: [],
          };

          productRow = this.resolveIds(productRow);
          this.validateRow(productRow, index + 2);
          return productRow;
        });

        this.isLoading = false;
        if (this.parsedData.length === 0) {
          this.showError('No data found in CSV file');
        } else {
          this.autoSelectValidRows();
          this.showSuccess(`Loaded ${this.parsedData.length} products from CSV`);
        }
      } catch (error: any) {
        this.isLoading = false;
        this.showError(`Error reading CSV file: ${error.message}`);
      }
    };

    reader.onerror = () => {
      this.isLoading = false;
      this.showError('Error reading file');
    };

    reader.readAsText(file);
  }

  processExcelFile(file: File): void {
    this.isLoading = true;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        this.parsedData = jsonData.map((row, index) => {
          let productRow: ExcelProductRow = {
            name: this.getStringValue(row, 'name', 'product name'),
            sku: this.getStringValue(row, 'sku', 'SKU'),
            description: this.getStringValue(row, 'description', 'description'),
            short_description: this.getStringValue(
              row,
              'short_description',
              'short description'
            ),
            price: this.getNumberValue(row, 'price', 'price'),
            compare_price: this.getNumberValue(row, 'compare_price', 'compare price'),
            quantity: this.getNumberValue(row, 'quantity', 'stock', 0),
            sub_category_name: this.getStringValue(row, 'sub_category', 'sub category'),
            product_type_name: this.getStringValue(row, 'product_type', 'product type'),
            tags: this.getStringValue(row, 'tags', 'tags'),
            weight: this.getNumberValue(row, 'weight', 'weight'),
            ingredients: this.getStringValue(row, 'ingredients', 'ingredients'),
            calories: this.getStringValue(row, 'calories', 'calories'),
            delivery_info: this.getStringValue(row, 'delivery_info', 'delivery info'),
            is_featured: this.getBooleanValue(row, 'is_featured', 'is featured'),
            is_published: this.getBooleanValue(row, 'is_published', 'is published', true),
            status: this.getBooleanValue(row, 'status', 'status', true),
            selected: true,
            errors: [],
          };

          productRow = this.resolveIds(productRow);
          this.validateRow(productRow, index + 2);
          return productRow;
        });

        this.isLoading = false;
        if (this.parsedData.length === 0) {
          this.showError('No data found in Excel file');
        } else {
          this.autoSelectValidRows();
          this.showSuccess(`Loaded ${this.parsedData.length} products from Excel`);
        }
      } catch (error: any) {
        this.isLoading = false;
        this.showError(`Error reading Excel file: ${error.message}`);
      }
    };

    reader.onerror = () => {
      this.isLoading = false;
      this.showError('Error reading file');
    };

    reader.readAsArrayBuffer(file);
  }

  resolveIds(row: ExcelProductRow): ExcelProductRow {
    if (row.sub_category_name) {
      const cat = this.categories.find(
        c => c.name?.toLowerCase() === row.sub_category_name!.toLowerCase()
      );
      if (cat) {
        row.category_id = cat.id;
      } else {
        row.errors?.push(`Category "${row.sub_category_name}" not found`);
      }
    }


    if (row.product_type_name) {
      const pt = this.productTypes.find(
        p => p.name?.toLowerCase() === row.product_type_name!.toLowerCase()
      );
      if (pt) {
        row.product_type_id = pt.id;
      } else {
        row.errors?.push(`Product Type "${row.product_type_name}" not found`);
      }
    }

    return row;
  }

  validateRow(row: ExcelProductRow, rowNumber: number): void {
    if (!row.name || row.name.trim() === '') {
      row.errors?.push('Product name is required');
    }
    if (!row.sku || row.sku.trim() === '') {
      row.errors?.push('SKU is required');
    }
    if (row.price === null || row.price === undefined || row.price < 0) {
      row.errors?.push('Valid price is required');
    }
    if (row.quantity === null || row.quantity === undefined || row.quantity < 0) {
      row.errors?.push('Valid quantity is required');
    }
  }

  getStringValue(row: any, ...keys: string[]): string {
    for (const key of keys) {
      const value = row[key] || row[key.toLowerCase()] || row[key.toUpperCase()];
      if (value !== undefined && value !== null) {
        return String(value).trim();
      }
    }
    return '';
  }

  getNumberValue(
    row: any,
    key: string,
    altKey?: string,
    defaultValue: number = 0
  ): number {
    const keys = [key, altKey].filter(Boolean) as string[];
    for (const k of keys) {
      const value = row[k] || row[k.toLowerCase()] || row[k.toUpperCase()];
      if (value !== undefined && value !== null && value !== '') {
        const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? defaultValue : num;
      }
    }
    return defaultValue;
  }

  getBooleanValue(
    row: any,
    key: string,
    altKey?: string,
    defaultValue: boolean = false
  ): boolean {
    const keys = [key, altKey].filter(Boolean) as string[];
    for (const k of keys) {
      const value = row[k] || row[k.toLowerCase()] || row[k.toUpperCase()];
      if (value !== undefined && value !== null && value !== '') {
        const str = String(value).toLowerCase().trim();
        return str === 'true' || str === 'yes' || str === '1' || str === 'y';
      }
    }
    return defaultValue;
  }

  private autoSelectValidRows(): void {
    this.selectedRows.clear();
    this.parsedData.forEach((_, i) => {
      if (!this.hasErrors(i)) this.selectedRows.add(i);
    });
    this.updateAllSelected();
  }

  get errorCount(): number {
    return this.parsedData.reduce(
      (count, _, index) => (this.hasErrors(index) ? count + 1 : count),
      0
    );
  }

  toggleRowSelection(index: number): void {
    if (this.selectedRows.has(index)) {
      this.selectedRows.delete(index);
    } else {
      this.selectedRows.add(index);
    }
    this.updateAllSelected();
  }

  toggleAllSelection(): void {
    if (this.allSelected) {
      this.selectedRows.clear();
    } else {
      this.parsedData.forEach((_, index) => {
        if (!this.hasErrors(index)) {
          this.selectedRows.add(index);
        }
      });
    }
    this.updateAllSelected();
  }

  updateAllSelected(): void {
    const validIndices = this.parsedData
      .map((_, i) => i)
      .filter(i => !this.hasErrors(i));
    this.allSelected =
      validIndices.length > 0 &&
      validIndices.every(i => this.selectedRows.has(i));
  }

  hasErrors(index: number): boolean {
    return (
      (this.parsedData[index]?.errors?.length || 0) > 0
    );
  }

  getSelectedRows(): ExcelProductRow[] {
    return this.parsedData.filter((_, index) => this.selectedRows.has(index));
  }

  async importProducts(): Promise<void> {
    const selectedRows = this.getSelectedRows();
    if (selectedRows.length === 0) {
      this.showError('Please select at least one product to import');
      return;
    }

    const rowsWithErrors = selectedRows.filter((row) => row.errors && row.errors.length > 0);
    if (rowsWithErrors.length > 0) {
      this.showError(
        `Cannot import ${rowsWithErrors.length} product(s) with errors. Please fix them first.`
      );
      return;
    }

    this.isImporting = true;
    this.importProgress = 0;
    const total = selectedRows.length;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      try {
        await this.importSingleProduct(row);
        successCount++;
      } catch (error: any) {
        errorCount++;
        errors.push(`${row.name} (${row.sku}): ${error.message || 'Import failed'}`);
      }

      this.importProgress = Math.round(((i + 1) / total) * 100);
    }

    this.isImporting = false;

    if (errorCount === 0) {
      this.showSuccess(`Successfully imported ${successCount} product(s)`);
      this.dialogRef.close({ success: true, imported: successCount });
    } else {
      this.showError(
        `Imported ${successCount} product(s), ${errorCount} failed. Errors: ${errors.join('; ')}`
      );
      if (successCount > 0) {
        this.dialogRef.close({ success: true, imported: successCount, errors });
      }
    }
  }

  importSingleProduct(row: ExcelProductRow): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();

      // Add all product fields
      formData.append('name', row.name);
      formData.append('sku', row.sku);
      formData.append('description', row.description || '');
      formData.append('short_description', row.short_description || '');
      formData.append('price', row.price.toString());
      if (row.compare_price) {
        formData.append('compare_price', row.compare_price.toString());
      }
      formData.append('quantity', row.quantity.toString());
      if (row.category_id) {
        formData.append('category_id', row.category_id.toString());
      }
        if (row.product_type_id) {
        formData.append('product_type_id', row.product_type_id.toString());
      }
      if (row.tags) {
        const tagsArray = row.tags.split(',').map((t) => t.trim()).filter((t) => t);
        formData.append('tags', JSON.stringify(tagsArray));
      } else {
        formData.append('tags', JSON.stringify([]));
      }
      if (row.weight) {
        formData.append('weight', row.weight.toString());
      }
      if (row.ingredients) {
        formData.append('ingredients', row.ingredients);
      }
      if (row.calories) {
        formData.append('calories', row.calories);
      }
      if (row.delivery_info) {
        formData.append('delivery_info', row.delivery_info);
      }
      formData.append('is_featured', row.is_featured ? 'true' : 'false');
      formData.append('is_published', row.is_published !== false ? 'true' : 'false');
      formData.append('status', row.status !== false ? '1' : '0');
      formData.append('track_quantity', 'true');
      formData.append('specifications', JSON.stringify({}));
      formData.append('dimensions', JSON.stringify({}));
      formData.append('existing_images', JSON.stringify([]));

      this.productService.addProductWithImages(formData).subscribe({
        next: (res) => {
          resolve(res);
        },
        error: (err) => {
          reject(
            new Error(
              err.error?.message || err.message || 'Failed to import product'
            )
          );
        },
      });
    });
  }

  downloadTemplate(): void {
    const templateData = [
      {
        name: 'Vitamin C Face Wash',
        sku: 'SKU-VC-FW-001',
        description: 'A gentle face wash enriched with Vitamin C that brightens skin and removes impurities.',
        short_description: 'Brightening Vitamin C face wash',
        price: 299,
        compare_price: 399,
        quantity: 100,
        sub_category: 'face wash',
        product_type: 'Skincare',
        tags: 'vitamin c, face wash, brightening',
        weight: 0.15,
        ingredients: 'Aqua, Vitamin C, Aloe Vera, Glycerin',
        calories: '',
        delivery_info: 'Delivered in 3-5 business days',
        is_featured: true,
        is_published: true,
        status: true,
      },
      {
        name: '10% Niacinamide Serum 30ml',
        sku: 'SKU-NIA-SR-002',
        description: 'High-strength niacinamide serum that minimizes pores and controls oil.',
        short_description: 'Pore-minimizing niacinamide serum',
        price: 548,
        compare_price: 699,
        quantity: 500,
        sub_category: 'Face serum',
        product_type: 'Skincare',
        tags: 'niacinamide, serum, pores',
        weight: 0.05,
        ingredients: 'Niacinamide 10%, Zinc PCA 1%, Aqua',
        calories: '',
        delivery_info: 'Delivered in 3-5 business days',
        is_featured: false,
        is_published: true,
        status: true,
      },
      {
        name: 'Kiwi Dragon Fruit Body Wash',
        sku: 'SKU-KD-BW-003',
        description: 'Refreshing body wash with kiwi and dragon fruit extracts for soft, glowing skin.',
        short_description: 'Refreshing fruit body wash',
        price: 550,
        compare_price: 650,
        quantity: 200,
        sub_category: 'Body wash',
        product_type: 'Body Care',
        tags: 'body wash, kiwi, dragon fruit',
        weight: 0.3,
        ingredients: 'Aqua, Kiwi Extract, Dragon Fruit Extract, SLS-free Cleanser',
        calories: '',
        delivery_info: 'Delivered in 3-5 business days',
        is_featured: true,
        is_published: true,
        status: true,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 30 }, // name
      { wch: 18 }, // sku
      { wch: 50 }, // description
      { wch: 30 }, // short_description
      { wch: 10 }, // price
      { wch: 14 }, // compare_price
      { wch: 10 }, // quantity
      { wch: 18 }, // sub_category
      { wch: 18 }, // product_type
      { wch: 25 }, // tags
      { wch: 10 }, // weight
      { wch: 35 }, // ingredients
      { wch: 10 }, // calories
      { wch: 30 }, // delivery_info
      { wch: 12 }, // is_featured
      { wch: 12 }, // is_published
      { wch: 10 }, // status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'cavero_product_import_template.xlsx');
    this.showSuccess('Template downloaded — fill in your products and import!');
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['snackbar-success'],
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['snackbar-danger'],
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
