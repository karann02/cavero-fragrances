import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { ComboService } from '../../combo.service';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { Combo, ComboProduct } from '../../combo.model';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { environment } from '../../../../../../environments/environment';

export interface DialogData {
  id: number;
  action: string;
  combo: Combo;
}

@Component({
  selector: 'app-combo-form-dialog',
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
    MatDatepickerModule,
    MatDialogClose,
    CommonModule
  ]
})
export class ComboFormComponent implements OnInit {
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;

  readonly slotCount = 4;
  readonly acceptedFileTypes = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';

  action: string;
  dialogTitle: string;
  comboForm!: UntypedFormGroup;
  combo: Combo;
  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

  categories: Array<{ id: number; name: string }> = [];
  products: Array<{
    id: number;
    name: string;
    category_id: number;
    category_parent_id?: number | null;
    category_name?: string;
    price?: number;
  }> = [];
  loadingOptions = false;

  constructor(
    public dialogRef: MatDialogRef<ComboFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public comboService: ComboService,
    private fb: UntypedFormBuilder,
  ) {
    this.action = data.action;
    this.dialogTitle = this.action === 'edit' ? `Edit ${data.combo.name}` : 'Add New Combo';
    this.combo = this.action === 'edit' ? data.combo : new Combo({});
    this.comboForm = this.createComboForm();
  }

  ngOnInit(): void {
    this.initializeImagePreview();
    this.loadComboOptions();
  }

  get productSlots(): FormArray {
    return this.comboForm.get('product_slots') as FormArray;
  }

  createComboForm(): UntypedFormGroup {
    const existingSlots = this.extractExistingSlots();
    // mat-datepicker (Moment adapter) binds to date objects, not strings
    const today = new Date();
    const defaultEnd = this.addDays(new Date(), 30);

    return this.fb.group({
      id: [this.combo.id],
      name: [
        this.combo.name,
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(120),
        ]
      ],
      valid_from: [this.combo.valid_from ? new Date(this.combo.valid_from) : today, [Validators.required]],
      valid_to: [this.combo.valid_to ? new Date(this.combo.valid_to) : defaultEnd, [Validators.required]],
      image: [this.combo.image || ''],
      // null (not 0) on add so the field starts empty — no leading "0" before typed digits
      discount_price: [this.combo.discount_price || null, [Validators.required, Validators.min(0), Validators.max(999999)]],
      active: [this.combo.active !== undefined ? this.combo.active : true, [Validators.required]],
      product_slots: this.fb.array(
        Array.from({ length: this.slotCount }, (_, index) => {
          const existing = existingSlots[index];
          return this.fb.group({
            slot: [index + 1],
            category_id: [existing?.category_id ?? null, [Validators.required]],
            product_id: [existing?.product_id ?? null, [Validators.required]]
          });
        })
      )
    });
  }

  private extractExistingSlots(): ComboProduct[] {
    const raw = Array.isArray(this.combo.product_ids) ? this.combo.product_ids : [];
    const normalized = raw
      .map((slot, index) => ({
        slot: Number(slot.slot || index + 1),
        category_id: Number(slot.category_id),
        product_id: Number(slot.product_id)
      }))
      .filter((slot) => Number.isInteger(slot.product_id) && slot.product_id > 0)
      .sort((a, b) => a.slot - b.slot)
      .slice(0, this.slotCount);

    return normalized;
  }

  private loadComboOptions(): void {
    this.loadingOptions = true;

    this.comboService.getProductsForCombo().subscribe({
      next: (res) => {
        const products = Array.isArray(res?.data) ? res.data : [];
        this.products = products.map((product: any) => ({
          id: Number(product.id),
          name: String(product.name || 'Product'),
          category_id: Number(product.category_id),
          category_parent_id:
            product.category_parent_id !== undefined && product.category_parent_id !== null
              ? Number(product.category_parent_id)
              : null,
          category_name: String(product.category_name || product.Category?.name || ''),
          price: Number(product.price || 0)
        }));

        const responseCategories = Array.isArray(res?.categories) ? res.categories : [];
        if (responseCategories.length > 0) {
          this.categories = this.mergeCategories(
            responseCategories.map((category: any) => ({
              id: Number(category.id),
              name: String(category.name || 'Category')
            }))
          );
        }
        this.loadingOptions = false;
      },
      error: (err) => {
        console.error('Error loading combo products:', err);
        this.loadingOptions = false;
      }
    });

    this.comboService.getCategoriesForCombo().subscribe({
      next: (res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        if (rows.length > 0) {
          this.categories = this.mergeCategories(
            this.flattenCategoryTree(rows)
              .filter((category) => category && category.status !== false)
              .map((category) => ({
                id: Number(category.id),
                name: String(category.name || 'Category')
              }))
          );
        }
      },
      error: (err) => {
        console.error('Error loading combo categories:', err);
      }
    });
  }

  getProductsForSlot(index: number): Array<{
    id: number;
    name: string;
    category_id: number;
    category_parent_id?: number | null;
    category_name?: string;
    price?: number;
  }> {
    const slotGroup = this.productSlots.at(index) as UntypedFormGroup;
    const categoryId = Number(slotGroup.get('category_id')?.value);
    if (!Number.isInteger(categoryId) || categoryId <= 0) return [];

    return this.products.filter((product) => {
      const productCategoryId = Number(product.category_id);
      const productParentCategoryId = Number(product.category_parent_id);
      return productCategoryId === categoryId || productParentCategoryId === categoryId;
    });
  }

  onCategoryChange(index: number): void {
    const slotGroup = this.productSlots.at(index) as UntypedFormGroup;
    slotGroup.get('product_id')?.setValue(null);
    slotGroup.get('product_id')?.markAsUntouched();
  }

  isProductSelectedInOtherSlot(currentIndex: number, productId: number): boolean {
    for (let index = 0; index < this.productSlots.length; index += 1) {
      if (index === currentIndex) continue;
      const slotGroup = this.productSlots.at(index) as UntypedFormGroup;
      if (Number(slotGroup.get('product_id')?.value) === Number(productId)) {
        return true;
      }
    }
    return false;
  }

  getCategoryName(categoryId: number | string): string {
    const id = Number(categoryId);
    const category = this.categories.find((row) => Number(row.id) === id);
    return category?.name || 'Category';
  }

  submit() {
    if (this.comboForm.invalid) {
      this.markFormGroupTouched(this.comboForm);
      alert('Please fill all required fields correctly');
      return;
    }

    // datepicker gives a Moment/Date — normalise to the YYYY-MM-DD the backend stores
    const validFrom = this.comboForm.value.valid_from ? this.toDateInputValue(new Date(this.comboForm.value.valid_from)) : '';
    const validTo = this.comboForm.value.valid_to ? this.toDateInputValue(new Date(this.comboForm.value.valid_to)) : '';
    if (validFrom > validTo) {
      alert('Validity end date cannot be before start date');
      return;
    }

    const slots: ComboProduct[] = this.productSlots.controls.map((slot, index) => ({
      slot: index + 1,
      product_id: Number(slot.get('product_id')?.value),
      category_id: Number(slot.get('category_id')?.value)
    }));

    const uniqueProducts = new Set(slots.map((slot) => Number(slot.product_id)));
    if (uniqueProducts.size !== slots.length) {
      alert('Each slot must have a different product');
      return;
    }

    const formData = new FormData();
    formData.append('id', String(this.comboForm.value.id || ''));
    formData.append('name', String(this.comboForm.value.name || '').trim());
    formData.append('valid_from', validFrom);
    formData.append('valid_to', validTo);
    formData.append('discount_price', String(Number(this.comboForm.value.discount_price || 0)));
    formData.append('combo_size', String(this.slotCount));
    formData.append('active', String(!!this.comboForm.value.active));
    formData.append('product_ids', JSON.stringify(slots));

    if (this.selectedImageFile) {
      formData.append('image', this.selectedImageFile, this.selectedImageFile.name);
    } else {
      formData.append('image', String(this.comboForm.get('image')?.value || ''));
    }

    if (this.action === 'edit') {
      this.comboService.updateCombo(formData).subscribe({
        next: (res) => this.dialogRef.close(res.data),
        error: (err) => {
          console.error('Error updating combo:', err);
          alert('Error updating combo: ' + (err?.error?.message || 'Unknown error'));
        }
      });
    } else {
      this.comboService.addCombo(formData).subscribe({
        next: (res) => this.dialogRef.close(res.data),
        error: (err) => {
          console.error('Error adding combo:', err);
          alert('Error adding combo: ' + (err?.error?.message || 'Unknown error'));
        }
      });
    }
  }

  private markFormGroupTouched(formGroup: UntypedFormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof UntypedFormControl) {
        control.markAsTouched();
      } else if (control instanceof UntypedFormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(group => {
          if (group instanceof UntypedFormGroup) {
            this.markFormGroupTouched(group);
          }
        });
      }
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  triggerImageInput(): void {
    this.imageInput?.nativeElement?.click();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (!String(file.type || '').startsWith('image/')) {
      alert('Please select a valid image file.');
      if (input) {
        input.value = '';
      }
      return;
    }

    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreviewUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedImageFile = null;
    this.imagePreviewUrl = '';
    this.comboForm.get('image')?.setValue('');
    if (this.imageInput?.nativeElement) {
      this.imageInput.nativeElement.value = '';
    }
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private initializeImagePreview(): void {
    const resolvedImage = this.resolveComboImage(this.combo.image);
    this.imagePreviewUrl = resolvedImage;
    this.comboForm.get('image')?.setValue(this.combo.image || '');
  }

  private resolveComboImage(image: string | null | undefined): string {
    const rawImage = String(image || '').trim();
    if (!rawImage) return '';
    if (rawImage.startsWith('data:') || rawImage.startsWith('blob:') || rawImage.startsWith('http')) {
      return rawImage;
    }
    if (rawImage.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${rawImage}`;
    if (rawImage.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${rawImage}`;
    return rawImage;
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private flattenCategoryTree(categories: any[]): any[] {
    const flat: any[] = [];
    const stack = [...categories];

    while (stack.length > 0) {
      const category = stack.shift();
      if (!category) continue;
      flat.push(category);

      if (Array.isArray(category.children) && category.children.length > 0) {
        stack.push(...category.children);
      }
    }

    return flat;
  }

  private mergeCategories(incoming: Array<{ id: number; name: string }>): Array<{ id: number; name: string }> {
    const byId = new Map<number, string>();
    [...this.categories, ...incoming].forEach((category) => {
      const id = Number(category.id);
      if (!Number.isInteger(id) || id <= 0) return;
      byId.set(id, String(category.name || 'Category'));
    });

    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
