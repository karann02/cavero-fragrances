import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as XLSX from 'xlsx';
import { CategoryService } from '../../category.service';

export interface ExcelCategoryRow {
  name: string;
  description?: string;
  status?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  meta_title?: string;
  meta_description?: string;
  errors?: string[];
}

@Component({
  selector: 'app-category-excel-import-dialog',
  templateUrl: './category-excel-import-dialog.component.html',
  styleUrls: ['./category-excel-import-dialog.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
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
export class CategoryExcelImportDialogComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  parsedData: ExcelCategoryRow[] = [];
  displayedColumns = ['select', 'name', 'description', 'status', 'is_featured', 'errors'];
  isLoading = false;
  importProgress = 0;
  isImporting = false;
  selectedRows = new Set<number>();
  allSelected = false;

  constructor(
    public dialogRef: MatDialogRef<CategoryExcelImportDialogComponent>,
    private categoryService: CategoryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processExcelFile(input.files[0]);
    }
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      this.processExcelFile(file);
    } else {
      this.showError('Please upload a valid Excel file (.xlsx, .xls)');
    }
  }

  processExcelFile(file: File): void {
    this.isLoading = true;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        this.parsedData = jsonData.map((row) => {
          const cat: ExcelCategoryRow = {
            name: this.str(row, 'name'),
            description: this.str(row, 'description'),
            status: this.bool(row, 'status', true),
            is_featured: this.bool(row, 'is_featured', false),
            sort_order: this.num(row, 'sort_order', 0),
            meta_title: this.str(row, 'meta_title'),
            meta_description: this.str(row, 'meta_description'),
            errors: [],
          };
          if (!cat.name?.trim()) cat.errors!.push('Category name is required');
          return cat;
        });

        this.isLoading = false;
        if (this.parsedData.length === 0) {
          this.showError('No data found in Excel file');
        } else {
          this.autoSelectValidRows();
          this.showSuccess(`Loaded ${this.parsedData.length} categories from Excel`);
        }
      } catch (err: any) {
        this.isLoading = false;
        this.showError(`Error reading file: ${err.message}`);
      }
    };
    reader.onerror = () => { this.isLoading = false; this.showError('Error reading file'); };
    reader.readAsArrayBuffer(file);
  }

  private str(row: any, key: string): string {
    const v = row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
    return v !== undefined && v !== null ? String(v).trim() : '';
  }

  private num(row: any, key: string, def = 0): number {
    const v = row[key] ?? row[key.toLowerCase()];
    if (v === undefined || v === null || v === '') return def;
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? def : n;
  }

  private bool(row: any, key: string, def = false): boolean {
    const v = row[key] ?? row[key.toLowerCase()];
    if (v === undefined || v === null || v === '') return def;
    const s = String(v).toLowerCase().trim();
    return s === 'true' || s === 'yes' || s === '1' || s === 'y';
  }

  private autoSelectValidRows(): void {
    this.selectedRows.clear();
    this.parsedData.forEach((_, i) => { if (!this.hasErrors(i)) this.selectedRows.add(i); });
    this.updateAllSelected();
  }

  hasErrors(i: number): boolean { return (this.parsedData[i]?.errors?.length || 0) > 0; }

  get errorCount(): number {
    return this.parsedData.filter((_, i) => this.hasErrors(i)).length;
  }

  toggleRowSelection(i: number): void {
    this.selectedRows.has(i) ? this.selectedRows.delete(i) : this.selectedRows.add(i);
    this.updateAllSelected();
  }

  toggleAllSelection(): void {
    if (this.allSelected) {
      this.selectedRows.clear();
    } else {
      this.parsedData.forEach((_, i) => { if (!this.hasErrors(i)) this.selectedRows.add(i); });
    }
    this.updateAllSelected();
  }

  updateAllSelected(): void {
    const valid = this.parsedData.map((_, i) => i).filter(i => !this.hasErrors(i));
    this.allSelected = valid.length > 0 && valid.every(i => this.selectedRows.has(i));
  }

  async importCategories(): Promise<void> {
    const rows = this.parsedData.filter((_, i) => this.selectedRows.has(i));
    if (rows.length === 0) { this.showError('Please select at least one category to import'); return; }

    this.isImporting = true;
    this.importProgress = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        await this.importSingleCategory(rows[i]);
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(`${rows[i].name}: ${err.message || 'Import failed'}`);
      }
      this.importProgress = Math.round(((i + 1) / rows.length) * 100);
    }

    this.isImporting = false;
    if (errorCount === 0) {
      this.showSuccess(`Successfully imported ${successCount} category(s)`);
      this.dialogRef.close({ success: true, imported: successCount });
    } else {
      this.showError(`Imported ${successCount}, ${errorCount} failed: ${errors.join('; ')}`);
      if (successCount > 0) this.dialogRef.close({ success: true, imported: successCount });
    }
  }

  importSingleCategory(row: ExcelCategoryRow): Promise<any> {
    return new Promise((resolve, reject) => {
      this.categoryService.addCategory({
        name: row.name,
        description: row.description || '',
        status: row.status !== false,
        is_featured: row.is_featured || false,
        sort_order: row.sort_order || 0,
        meta_title: row.meta_title || '',
        meta_description: row.meta_description || '',
      }).subscribe({ next: resolve, error: (err) => reject(new Error(err.error?.message || 'Failed')) });
    });
  }

  downloadTemplate(): void {
    const templateData = [
      { name: 'Face Wash', description: 'All face wash products', status: true, is_featured: true, sort_order: 1, meta_title: 'Face Wash', meta_description: 'Best face wash products' },
      { name: 'Body Wash', description: 'All body wash products', status: true, is_featured: false, sort_order: 2, meta_title: 'Body Wash', meta_description: 'Best body wash products' },
      { name: 'Face Serum', description: 'All face serum products', status: true, is_featured: true, sort_order: 3, meta_title: 'Face Serum', meta_description: 'Best face serum products' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 35 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Categories');
    XLSX.writeFile(wb, 'cavero_category_import_template.xlsx');
    this.showSuccess('Template downloaded!');
  }

  showSuccess(msg: string): void { this.snackBar.open(msg, 'Close', { duration: 3000, panelClass: ['snackbar-success'] }); }
  showError(msg: string): void { this.snackBar.open(msg, 'Close', { duration: 5000, panelClass: ['snackbar-danger'] }); }
  close(): void { this.dialogRef.close(); }
}
