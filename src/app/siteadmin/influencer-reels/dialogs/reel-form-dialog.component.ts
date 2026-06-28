import { Component, Inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from 'environments/environment';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, first } from 'rxjs/operators';

const API = `${environment.apiGatewayBaseUrl}/api/reels`;

@Component({
  selector: 'app-reel-form-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSlideToggleModule, MatSnackBarModule, MatDialogContent, MatDialogClose
  ],
  templateUrl: './reel-form-dialog.component.html',
  styleUrls: ['./reel-form-dialog.component.scss']
})
export class ReelFormDialogComponent implements OnInit {
  form!: FormGroup;
  isSaving = false;

  previewProductImage: string | null = null;
  selectedProductFile: File | null = null;
  removeProductImage = false;

  previewReelVideo: string | null = null;
  selectedReelVideoFile: File | null = null;
  removeReelVideo = false;
  existingReelVideoUrl: string | null = null;

  @ViewChild('productFileInput') productFileInput!: ElementRef;
  @ViewChild('reelVideoInput') reelVideoInput!: ElementRef;

  constructor(
    public dialogRef: MatDialogRef<ReelFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { action: string; row?: any },
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const row = this.data.row;
    this.form = this.fb.group({
      title: [row?.title || '', Validators.required],
      product_name: [row?.product_name || ''],
      product_price: [row?.product_price || ''],
      product_original_price: [row?.product_original_price || ''],
      product_description: [row?.product_description || ''],
      instagram_url: [row?.instagram_url || ''],
      product_detail_url: [row?.product_detail_url || ''],
      discount_text: [row?.discount_text || ''],
      sort_order: [
        row?.sort_order || 0,
        [Validators.required, Validators.min(1)],
        [this.sortOrderAsyncValidator(row?.id)]
      ],
      is_active: [row?.is_active !== undefined ? row.is_active : true]
    });

    if (this.data.action === 'edit' && row) {
      const base = environment.apiGatewayBaseUrl;
      this.previewProductImage = row.product_image ? `${base}${row.product_image}` : null;
      this.existingReelVideoUrl = row.reel_url || null;
    }
  }

  private sortOrderAsyncValidator(reelId?: number) {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || Number(control.value) <= 0) {
        return of(null);
      }

      const newSortOrder = Number(control.value);

      return this.http.get<any>(`${API}/admin`).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        first(),
        map((response) => {
          const reels = response?.data || [];
          const isDuplicate = reels.some(
            (reel: any) => reel.sort_order === newSortOrder && reel.id !== reelId
          );
          return isDuplicate ? { sortOrderExists: { value: newSortOrder } } : null;
        }),
        catchError(() => of(null))
      );
    };
  }

  onProductImageChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedProductFile = file;
    this.removeProductImage = false;
    const reader = new FileReader();
    reader.onload = (e: any) => this.previewProductImage = e.target.result;
    reader.readAsDataURL(file);
  }

  onReelVideoChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedReelVideoFile = file;
    this.removeReelVideo = false;
    if (this.previewReelVideo) URL.revokeObjectURL(this.previewReelVideo);
    this.previewReelVideo = URL.createObjectURL(file);
  }

  removeProductImagePreview(): void {
    this.selectedProductFile = null;
    this.previewProductImage = null;
    if (this.data.action === 'edit') this.removeProductImage = true;
    if (this.productFileInput?.nativeElement) this.productFileInput.nativeElement.value = '';
  }

  removeReelVideoPreview(): void {
    if (this.previewReelVideo) URL.revokeObjectURL(this.previewReelVideo);
    this.selectedReelVideoFile = null;
    this.previewReelVideo = null;
    this.existingReelVideoUrl = null;
    if (this.data.action === 'edit') this.removeReelVideo = true;
    if (this.reelVideoInput?.nativeElement) this.reelVideoInput.nativeElement.value = '';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    const fd = new FormData();
    const v = this.form.value;
    Object.keys(v).forEach(k => fd.append(k, v[k] ?? ''));
    if (this.selectedProductFile) fd.append('product_image', this.selectedProductFile);
    if (this.selectedReelVideoFile) fd.append('reel_video', this.selectedReelVideoFile);
    if (this.data.action === 'edit' && this.removeProductImage && !this.selectedProductFile) fd.append('remove_product_image', 'true');
    if (this.data.action === 'edit' && this.removeReelVideo && !this.selectedReelVideoFile) fd.append('remove_reel_video', 'true');

    const req = this.data.action === 'edit'
      ? this.http.put<any>(`${API}/${this.data.row.id}`, fd)
      : this.http.post<any>(`${API}`, fd);

    req.subscribe({
      next: () => { this.isSaving = false; this.dialogRef.close(true); },
      error: (error) => {
        this.isSaving = false;
        this.snackBar.open(error?.error?.message || 'Failed to save reel details', '', {
          duration: 3000,
          panelClass: 'snackbar-danger'
        });
      }
    });
  }
}
