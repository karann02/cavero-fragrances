import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { BrandService } from '../../brand.service';
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
import { Brand } from '../../brand.model';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '@core/service/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, first } from 'rxjs/operators';

export interface DialogData {
  id: number;
  action: string;
  brand: Brand;
}

@Component({
  selector: 'app-brand-form-dialog',
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
    MatCheckboxModule,
    MatDialogClose,
    CommonModule
  ]
})
export class BrandFormComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  action: string;
  dialogTitle: string;
  brandForm!: UntypedFormGroup;
  brand: Brand;
  token: any;

  // File upload properties
  selectedFile: File | null = null;
  logoPreview: string | null = null;
  isDragging = false;
  maxFileSize = 2 * 1024 * 1024; // 2MB
  acceptedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  constructor(
    public dialogRef: MatDialogRef<BrandFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public brandService: BrandService,
    private fb: UntypedFormBuilder,
    private authService: AuthService,
  ) {
    this.action = data.action;
    this.dialogTitle = this.action === 'edit' ? `Edit ${data.brand.name}` : 'Add New Brand';
    this.brand = this.action === 'edit' ? data.brand : new Brand({});
    this.brandForm = this.createBrandForm();
    
    // Initialize logo preview for edit mode
    if (this.action === 'edit' && this.brand.logo) {
      const url = `../assets/uploads/brands/${this.brand.logo}`;
      this.logoPreview = url;
    }
  }

  ngOnInit(): void {
    this.token = this.authService.getDecodeToken();
  }

  createBrandForm(): UntypedFormGroup {
    const form = this.fb.group({
      id: [this.brand.id],
      name: [
        this.brand.name,
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(120),
        ]
      ],
      slug: [
        this.brand.slug || this.generateSlug(this.brand.name),
        [
          Validators.required,
          Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        ]
      ],
      description: [this.brand.description, [Validators.maxLength(500)]],
      is_featured: [this.brand.is_featured || false],
      is_active: [this.brand.is_active !== undefined ? this.brand.is_active : true],
      sort_order: [
        this.brand.sort_order || 0,
        [Validators.min(0)],
        [this.sortOrderAsyncValidator()]
      ],
      meta_title: [this.brand.meta_title || '', [Validators.maxLength(160)]],
      meta_description: [this.brand.meta_description || '', [Validators.maxLength(320)]],
    });

    // Auto-generate slug from name
    form.get('name')?.valueChanges.subscribe(name => {
      if (name && (!form.get('slug')?.value || form.get('slug')?.pristine)) {
        form.get('slug')?.setValue(this.generateSlug(name));
      }
    });

    return form;
  }

  private sortOrderAsyncValidator() {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value === 0) {
        return of(null);
      }

      const currentSortOrder = this.brand?.sort_order;
      const newSortOrder = control.value;

      // If sort order hasn't changed, no validation needed
      if (currentSortOrder === newSortOrder) {
        return of(null);
      }

      return this.brandService.getAllBrands().pipe(
        debounceTime(300),
        distinctUntilChanged(),
        first(),
        map((response) => {
          const brands = response?.data || [];
          const isDuplicate = brands.some(
            (brand: any) => brand.sort_order === newSortOrder && brand.id !== this.brand.id
          );
          return isDuplicate ? { sortOrderExists: { value: newSortOrder } } : null;
        }),
        catchError(() => of(null))
      );
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }

  // File upload methods
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    this.processFile(file);
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
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  processFile(file: File): void {
    // Validate file type
    if (!this.acceptedFileTypes.includes(file.type)) {
      this.showErrorNotification('Invalid file type. Please upload only images (JPEG, PNG, GIF, WebP).');
      return;
    }
    
    // Validate file size
    if (file.size > this.maxFileSize) {
      this.showErrorNotification(`File is too large. Maximum size is 2MB.`);
      return;
    }
    
    this.selectedFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.logoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  removeLogo(): void {
    this.selectedFile = null;
    this.logoPreview = null;
    // For edit mode, we'll handle logo removal in the backend
  }

  triggerFileInput(): void {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  submit() {
    if (this.brandForm.valid) {
      const formData = new FormData();
      const raw = { ...this.brandForm.value };
      raw.name = String(raw.name || '').trim();
      raw.slug = String(raw.slug || this.generateSlug(raw.name)).trim();
      raw.description = String(raw.description || '').trim();
      raw.meta_title = String(raw.meta_title || '').trim();
      raw.meta_description = String(raw.meta_description || '').trim();
      
      // Append form data
      Object.keys(raw).forEach(key => {
        const value = raw[key];
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // Append logo file if selected
      if (this.selectedFile) {
        formData.append('logo', this.selectedFile, this.selectedFile.name);
      }
      
      if (this.action === 'edit') {
        this.brandService.updateBrandWithLogo(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
            this.showSuccessNotification('Brand updated successfully!');
          },
          error: (err) => {
            console.error('Error updating brand:', err);
            this.showErrorNotification('Failed to update brand');
          }
        });
      } else {
        this.brandService.addBrandWithLogo(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
            this.showSuccessNotification('Brand added successfully!');
          },
          error: (err) => {
            console.error('Error adding brand:', err);
            this.showErrorNotification('Failed to add brand');
          }
        });
      }
    } else {
      this.markFormGroupTouched(this.brandForm);
    }
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

  private showSuccessNotification(message: string) {
    console.log('Success:', message);
  }

  private showErrorNotification(message: string) {
    console.error('Error:', message);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    this.submit();
  }

  getFormControl(controlName: string): UntypedFormControl {
    return this.brandForm.get(controlName) as UntypedFormControl;
  }
}
