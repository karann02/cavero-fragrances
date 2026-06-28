// form-dialog.component.ts
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { SliderService } from '../../slider.service';
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
import { Slider } from '../../slider.model';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { environment } from '../../../../../../environments/environment';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, first } from 'rxjs/operators';

export interface DialogData {
  id: number;
  action: string;
  slider: Slider;
}

@Component({
  selector: 'app-slider-form-dialog',
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
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogClose,
    CommonModule
  ]
})
export class SliderFormComponent implements OnInit {
  action: string;
  dialogTitle: string;
  sliderForm!: UntypedFormGroup;
  slider: Slider;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  imageMarkedForRemoval = false;
  isUploading = false;
  isDragOver = false;
  apiUrl = environment.authApiBaseUrl;

  constructor(
    public dialogRef: MatDialogRef<SliderFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public sliderService: SliderService,
    private fb: UntypedFormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.action = data.action;
    this.dialogTitle = this.action === 'edit' ? `Edit ${data.slider?.title || 'Slider'}` : 'Add New Slider';
    // for 'add', honour any pre-seeded values (e.g. auto-suggested sort_order)
    this.slider = this.action === 'edit' ? data.slider : new Slider(data.slider || {});
    
    console.log('Form Dialog Constructor - Action:', this.action);
    console.log('Form Dialog Constructor - Slider data:', this.slider);
    
    this.sliderForm = this.createSliderForm();
    
    // Set image preview for edit mode
    if (this.action === 'edit' && this.slider.image) {
      this.imagePreview = this.getExistingImagePreviewUrl();
    }
  }

  ngOnInit(): void {
    if (this.action === 'edit' && this.slider?.id) {
      // Always fetch fresh data for edit mode
      this.sliderService.getSliderById(this.slider.id).subscribe({
        next: (res) => {
          if (!res?.data) {
            console.error('No slider data received');
            return;
          }

          console.log('Fresh slider data from API:', res.data);
          this.slider = new Slider(res.data);
          
          // Update form with fresh data
          this.sliderForm.patchValue({
            id: this.slider.id,
            button_url: this.slider.button_url || '',
            sort_order: this.slider.sort_order || 0,
            is_active: this.slider.is_active !== undefined ? this.slider.is_active : true,
            display_on: this.slider.display_on || (this.slider as any).screen_type || 'all',
          });

          console.log('Form patched with values:', this.sliderForm.value);

          this.imageMarkedForRemoval = false;
          this.imagePreview = this.slider.image ? this.getExistingImagePreviewUrl() : null;
        },
        error: (err) => {
          console.error('Error fetching latest slider details:', err);
        }
      });
    }
  }

  createSliderForm(): UntypedFormGroup {
    console.log('Creating form with slider data:', this.slider);
    const form = this.fb.group({
      id: [this.slider.id || ''],
      button_url: [this.slider.button_url || ''],
      sort_order: [
        this.slider.sort_order || 0,
        [Validators.min(0)],
        [this.sortOrderAsyncValidator()]
      ],
      is_active: [this.slider.is_active !== undefined ? this.slider.is_active : true],
      display_on: [this.slider.display_on || (this.slider as any).screen_type || 'all', [Validators.required]],
    });
    console.log('Created form with values:', form.value);
    return form;
  }

  private sortOrderAsyncValidator() {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value === 0) {
        return of(null);
      }

      const currentSortOrder = this.slider?.sort_order;
      const newSortOrder = control.value;

      // If sort order hasn't changed, no validation needed
      if (currentSortOrder === newSortOrder) {
        return of(null);
      }

      return this.sliderService.getAllSliders().pipe(
        debounceTime(300),
        distinctUntilChanged(),
        first(),
        map((response) => {
          const sliders = response?.data || [];
          const isDuplicate = sliders.some(
            (slider: any) => slider.sort_order === newSortOrder && slider.id !== this.slider.id
          );
          return isDuplicate ? { sortOrderExists: { value: newSortOrder } } : null;
        }),
        catchError(() => of(null))
      );
    };
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    this.processFile(file);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files) {
      const file = event.dataTransfer.files[0];
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  processFile(file: File): void {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, GIF)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      this.selectedFile = file;
      this.imageMarkedForRemoval = false;

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    if (this.selectedFile) {
      this.selectedFile = null;

      if (this.action === 'edit' && this.slider.image && !this.imageMarkedForRemoval) {
        this.imagePreview = this.getExistingImagePreviewUrl();
        return;
      }

      this.imagePreview = null;
      return;
    }

    if (this.action === 'edit' && this.slider.image) {
      this.imageMarkedForRemoval = true;
    }

    this.imagePreview = null;
  }

  submit() {
    if (this.isUploading) return;

    if (!this.sliderForm!.valid) {
      this.markFormGroupTouched(this.sliderForm!);
      return;
    }

    if (this.action === 'add' && !this.selectedFile) {
      alert('Please select an image');
      return;
    }

    // Lock immediately — prevents any double-click or re-entry
    this.isUploading = true;
    this.cdr.detectChanges();

    const formData = new FormData();

    Object.keys(this.sliderForm!.value).forEach(key => {
      if (key === 'id' && this.action === 'add') return;
      const val = this.sliderForm!.value[key];
      if (val !== null && val !== undefined && val !== '') {
        formData.append(key, val);
      }
    });

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    if (this.action === 'edit' && this.imageMarkedForRemoval && !this.selectedFile) {
      formData.append('remove_image', 'true');
    }

    const request$ = this.action === 'edit'
      ? this.sliderService.updateSlider(this.slider.id, formData)
      : this.sliderService.addSlider(formData);

    request$.subscribe({
      next: (res: any) => {
        this.isUploading = false;
        this.dialogRef!.close(res.data);
      },
      error: (err: any) => {
        this.isUploading = false;
        this.cdr.detectChanges();
        const msg = err.error?.message || 'Unknown error';
        alert(`Error ${this.action === 'edit' ? 'updating' : 'adding'} slider: ${msg}`);
      }
    });
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

  private getExistingImagePreviewUrl(): string {
    return this.slider.image.startsWith('http')
      ? this.slider.image
      : `${this.apiUrl.replace('/api/auth', '')}${this.slider.image}`;
  }
}
