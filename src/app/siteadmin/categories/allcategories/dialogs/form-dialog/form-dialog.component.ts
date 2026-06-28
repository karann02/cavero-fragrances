import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { CategoryService } from '../../category.service';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Category } from '../../category.model';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, first } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';

export interface DialogData {
  id: number;
  action: string;
  category: Category;
}

@Component({
  selector: 'app-category-form-dialog',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatDialogClose,
    CommonModule
  ]
})
export class CategoryFormComponent implements OnInit {
  action: string;
  dialogTitle: string;
  categoryForm!: UntypedFormGroup;
  category: Category;
  selectedImageFile?: File;
  imagePreviewUrl: string | null = null;
  imageMarkedForRemoval = false;
  isDragging = false;

  constructor(
    public dialogRef: MatDialogRef<CategoryFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public categoryService: CategoryService,
    private fb: UntypedFormBuilder,
  ) {
    this.action = data.action;
    this.dialogTitle = this.action === 'edit' ? `Edit ${data.category.name}` : 'Add New Category';
    // Honour passed data for both add (carries a pre-seeded sort_order) and edit.
    this.category = this.action === 'edit' ? data.category : new Category(data.category || {});
    this.categoryForm = this.createCategoryForm();
  }

  ngOnInit(): void {
    if (this.category.image_url) {
      this.imagePreviewUrl = this.resolveCategoryImageUrl(this.category.image_url);
    }
    this.setupStatusSync();
    this.setupSlugSync();
  }

  private slugify(value: string): string {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/['']/g, '')         // drop apostrophes: "Men's" -> "mens"
      .replace(/[^a-z0-9]+/g, '-')  // any run of non-alphanumerics -> single hyphen
      .replace(/^-+|-+$/g, '');     // trim leading/trailing hyphens
  }

  private setupSlugSync(): void {
    const nameControl = this.categoryForm.get('name');
    const slugControl = this.categoryForm.get('slug');
    // Keep the slug auto-derived from the name as the admin types.
    nameControl?.valueChanges.subscribe((name: string) => {
      slugControl?.setValue(this.slugify(name), { emitEvent: false });
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.loadPreview(file);
    }
  }

  createCategoryForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.category.id],
      name: [
        this.category.name,
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(120),
        ]
      ],
      slug: [this.category.slug, [Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      description: [this.category.description, [Validators.maxLength(500)]],
      image_url: [null],
      status: [this.category.status !== undefined ? this.category.status : true, [Validators.required]],
      parent_id: [null],
      is_featured: [this.category.is_featured || false],
      sort_order: [
        this.category.sort_order || 0,
        [Validators.min(0)],
        [this.sortOrderAsyncValidator()]
      ],
      meta_title: [this.category.meta_title, [Validators.maxLength(160)]],
      meta_description: [this.category.meta_description, [Validators.maxLength(320)]],
      created_by: [this.category.created_by || 'system'],
      updated_by: [this.category.updated_by || 'system']
    });
  }

  private sortOrderAsyncValidator() {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value === 0) {
        return of(null);
      }

      const currentSortOrder = this.category?.sort_order;
      const newSortOrder = control.value;

      // If sort order hasn't changed, no validation needed
      if (currentSortOrder === newSortOrder) {
        return of(null);
      }

      return this.categoryService.getAllCategories().pipe(
        debounceTime(300),
        distinctUntilChanged(),
        first(),
        map((response) => {
          const categories = response?.data || [];
          const isDuplicate = categories.some(
            (cat: any) => cat.sort_order === newSortOrder && cat.id !== this.category.id
          );
          return isDuplicate ? { sortOrderExists: { value: newSortOrder } } : null;
        }),
        catchError(() => of(null))
      );
    };
  }

  private setupStatusSync(): void {
    const statusControl = this.categoryForm.get('status');
    const featuredControl = this.categoryForm.get('is_featured');

    const applyStatusRule = (statusValue: boolean) => {
      if (!statusValue) {
        // When inactive: force featured to false and disable it
        featuredControl?.setValue(false);
        featuredControl?.disable({ emitEvent: false });
        return;
      }

      // When active: featured can be selected freely.
      featuredControl?.enable({ emitEvent: false });
    };

    applyStatusRule(!!statusControl?.value);
    statusControl?.valueChanges.subscribe((value) => applyStatusRule(!!value));
  }

  submit() {
    if (this.categoryForm.valid) {
      const formData = { ...this.categoryForm.value };
      formData.name = String(formData.name || '').trim();
      formData.slug = String(formData.slug || '').trim();
      formData.description = String(formData.description || '').trim();
      formData.meta_title = String(formData.meta_title || '').trim();
      formData.meta_description = String(formData.meta_description || '').trim();
      formData.parent_id = null;
      if (this.action === 'edit' && this.imageMarkedForRemoval && !this.selectedImageFile) {
        formData.image_url = null;
      }
      
      if (this.action === 'edit') {
        if (this.selectedImageFile) {
          const payload = this.buildFormData(formData);
          this.categoryService.updateCategory(payload).subscribe({
            next: (res) => {
              this.dialogRef.close(res.data);
            },
            error: (err) => {
              console.error('Error updating category:', err);
            }
          });
        } else {
          this.categoryService.updateCategory(formData).subscribe({
            next: (res) => {
              this.dialogRef.close(res.data);
            },
            error: (err) => {
              console.error('Error updating category:', err);
            }
          });
        }
      } else {
        if (this.selectedImageFile) {
          const payload = this.buildFormData(formData);
          this.categoryService.addCategory(payload).subscribe({
            next: (res) => {
              this.dialogRef.close(res.data);
            },
            error: (err) => {
              console.error('Error adding category:', err);
            }
          });
        } else {
          this.categoryService.addCategory(formData).subscribe({
            next: (res) => {
              this.dialogRef.close(res.data);
            },
            error: (err) => {
              console.error('Error adding category:', err);
            }
          });
        }
      }
    } else {
      this.markFormGroupTouched(this.categoryForm);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.loadPreview(file);
  }

  private loadPreview(file: File): void {
    this.selectedImageFile = file;
    this.imageMarkedForRemoval = false;
    this.categoryForm.patchValue({ image_url: null });
    const reader = new FileReader();
    reader.onload = () => { this.imagePreviewUrl = reader.result as string; };
    reader.readAsDataURL(file);
  }

  clearSelectedImage(): void {
    this.selectedImageFile = undefined;
    this.imagePreviewUrl = null;
    this.imageMarkedForRemoval = true;
    this.categoryForm.patchValue({ image_url: null });
  }

  private buildFormData(formValue: any): FormData {
    const payload = new FormData();
    Object.keys(formValue).forEach((key) => {
      const value = formValue[key];
      if (value !== null && value !== undefined) {
        payload.append(key, value);
      }
    });

    if (this.selectedImageFile) {
      payload.append('image', this.selectedImageFile, this.selectedImageFile.name);
    }

    return payload;
  }

  private markFormGroupTouched(formGroup: UntypedFormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof UntypedFormControl) {
        control.markAsTouched();
      } else if (control instanceof UntypedFormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  private resolveCategoryImageUrl(imageUrl?: string | null): string | null {
    if (!imageUrl) return null;

    const raw = String(imageUrl).trim();
    if (!raw) return null;

    // Already a complete browser-safe source.
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('blob:')) {
      return raw;
    }

    // Normalize and convert to API gateway URL.
    const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');

    if (normalized.startsWith('uploads/')) {
      return `${environment.apiGatewayBaseUrl}/${normalized}`;
    }

    const uploadsIndex = normalized.indexOf('uploads/');
    if (uploadsIndex !== -1) {
      return `${environment.apiGatewayBaseUrl}/${normalized.slice(uploadsIndex)}`;
    }

    // Filename-only values are assumed to be category images.
    if (!normalized.includes('/')) {
      return `${environment.apiGatewayBaseUrl}/uploads/categories/${normalized}`;
    }

    return `${environment.apiGatewayBaseUrl}/${normalized}`;
  }
}
