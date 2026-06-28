import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, ElementRef, Inject, OnInit } from '@angular/core';
import { CouponService } from '../../coupon.service';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '@core/service/auth.service';
import { Router } from '@angular/router';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';

export interface DialogData {
  id: number;
  action: string;
  coupon: any;
}

@Component({
  selector: 'app-coupon-form-dialog',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  imports: [
    MatButtonModule,
    MatIconModule,
    FeatherIconsComponent,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatDialogClose,
    CommonModule
  ]
})
export class CouponFormDialogComponent implements OnInit {
  action: string;
  dialogTitle: string;
  couponForm!: UntypedFormGroup;
  coupon: any;
  token: any;
  today: Date = new Date();
  readonly rupeeSymbol = '\u20B9';

  constructor(
    public dialogRef: MatDialogRef<CouponFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public couponService: CouponService,
    private fb: UntypedFormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.action = data.action;
    this.dialogTitle = this.action === 'edit' ? `Edit ${data.coupon.code}` : 'Add New Coupon';
    this.coupon = this.action === 'edit' ? data.coupon : {};
    this.couponForm = this.createCouponForm();
  }

  ngOnInit(): void {
    this.token = this.authService.getDecodeToken();
    
    // Listen to type changes to show/hide max discount
    this.couponForm.get('type')?.valueChanges.subscribe(type => {
      if (type === 'percentage') {
        this.couponForm.get('max_discount')?.setValidators([Validators.min(0)]);
      } else {
        this.couponForm.get('max_discount')?.clearValidators();
      }
      this.couponForm.get('max_discount')?.updateValueAndValidity();
    });

    // Listen to usage_limit changes: disable dates if usage limit is set
    this.couponForm.get('usage_limit')?.valueChanges.subscribe(usageLimit => {
      const validFromControl = this.couponForm.get('valid_from');
      const validUntilControl = this.couponForm.get('valid_until');
      
      if (usageLimit && usageLimit > 0) {
        // Usage limit is set - disable date fields and clear their validators
        validFromControl?.clearValidators();
        validUntilControl?.clearValidators();
        validFromControl?.disable({ emitEvent: false });
        validUntilControl?.disable({ emitEvent: false });
      } else {
        // Usage limit is not set - enable date fields and set validators
        validFromControl?.setValidators([Validators.required]);
        validUntilControl?.setValidators([Validators.required]);
        validFromControl?.enable({ emitEvent: false });
        validUntilControl?.enable({ emitEvent: false });
      }
      validFromControl?.updateValueAndValidity({ emitEvent: false });
      validUntilControl?.updateValueAndValidity({ emitEvent: false });
    });

    // Listen to valid_from/valid_until changes: disable usage limit if dates are set
    this.couponForm.get('valid_from')?.valueChanges.subscribe(() => {
      this.updateUsageLimitState();
    });
    
    this.couponForm.get('valid_until')?.valueChanges.subscribe(() => {
      this.updateUsageLimitState();
    });

    // Initial state check
    this.updateUsageLimitState();
    this.updateDateFieldsState();
  }

  private updateUsageLimitState(): void {
    const validFrom = this.couponForm.get('valid_from')?.value;
    const validUntil = this.couponForm.get('valid_until')?.value;
    const usageLimitControl = this.couponForm.get('usage_limit');

    const hasDates = validFrom && validUntil;

    if (hasDates) {
      // Dates are set - disable usage limit
      usageLimitControl?.clearValidators();
      usageLimitControl?.disable({ emitEvent: false });
    } else {
      // Dates are not set - enable usage limit
      usageLimitControl?.setValidators([Validators.min(1)]);
      usageLimitControl?.enable({ emitEvent: false });
    }
    usageLimitControl?.updateValueAndValidity({ emitEvent: false });
  }

  private updateDateFieldsState(): void {
    const usageLimit = this.couponForm.get('usage_limit')?.value;
    const validFromControl = this.couponForm.get('valid_from');
    const validUntilControl = this.couponForm.get('valid_until');

    if (usageLimit && usageLimit > 0) {
      // Usage limit is set - disable date fields
      validFromControl?.clearValidators();
      validUntilControl?.clearValidators();
      validFromControl?.disable({ emitEvent: false });
      validUntilControl?.disable({ emitEvent: false });
    } else {
      // Usage limit is not set - enable date fields
      validFromControl?.setValidators([Validators.required]);
      validUntilControl?.setValidators([Validators.required]);
      validFromControl?.enable({ emitEvent: false });
      validUntilControl?.enable({ emitEvent: false });
    }
    validFromControl?.updateValueAndValidity({ emitEvent: false });
    validUntilControl?.updateValueAndValidity({ emitEvent: false });
  }

  createCouponForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.coupon.id],
      code: [this.coupon.code || '', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[A-Z0-9_-]+$/)]],
      type: [this.coupon.type || 'percentage', [Validators.required]],
      value: [this.coupon.value ?? null, [Validators.required, Validators.min(0)]],
      min_order_amount: [this.coupon.min_order_amount ?? null, [Validators.min(0)]],
      max_discount: [this.coupon.max_discount || null, [Validators.min(0)]],
      usage_limit: [this.coupon.usage_limit || null, [Validators.min(1)]],
      valid_from: [this.coupon.usage_limit ? null : this.coupon.valid_from || null, []],
      valid_until: [this.coupon.usage_limit ? null : this.coupon.valid_until || null, []],
      status: [this.coupon.status !== undefined ? this.coupon.status : true, [Validators.required]],
    }, { validators: [this.dateRangeValidator, this.discountValueValidator] });
  }

  private dateRangeValidator(group: UntypedFormGroup) {
    const from = group.get('valid_from')?.value;
    const until = group.get('valid_until')?.value;
    const usageLimit = group.get('usage_limit')?.value;
    
    // Skip validation if this is a FCFS coupon (usage limit is set)
    if (usageLimit && usageLimit > 0) {
      return null;
    }
    
    // For date-based coupons, validate date range
    if (!from || !until) return null;
    return new Date(until) >= new Date(from) ? null : { invalidDateRange: true };
  }

  private discountValueValidator(group: UntypedFormGroup) {
    const type = group.get('type')?.value;
    const value = Number(group.get('value')?.value ?? 0);
    if (type !== 'percentage') return null;
    return value <= 100 ? null : { percentageTooHigh: true };
  }

  generateCode() {
    if (!this.couponForm.get('code')?.value) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      this.couponForm.patchValue({ code });
    }
  }

  submit() {
    if (this.couponForm.valid) {
      const formData = {
        ...this.couponForm.value,
        code: String(this.couponForm.value.code || '').trim().toUpperCase()
      };
      // empty number fields → 0 (fields start blank to avoid leading-zero on typing)
      formData.value = Number(formData.value) || 0;
      formData.min_order_amount = Number(formData.min_order_amount) || 0;
      
      // Handle both FCFS and date-based coupons
      const usageLimit = formData.usage_limit;
      const validFrom = formData.valid_from;
      const validUntil = formData.valid_until;

      // For FCFS coupons: set dates to null or use current date
      if (usageLimit && usageLimit > 0) {
        formData.valid_from = null;
        formData.valid_until = null;
      } else {
        // For date-based coupons: convert dates to ISO string
        formData.valid_from = new Date(validFrom).toISOString();
        formData.valid_until = new Date(validUntil).toISOString();
      }
      
      if (this.action === 'edit') {
        this.couponService.updateCoupon(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
            this.showSuccessNotification('Coupon updated successfully!');
          },
          error: (err) => {
            console.error('Error updating coupon:', err);
            this.showErrorNotification('Failed to update coupon');
          }
        });
      } else {
        this.couponService.addCoupon(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
            this.showSuccessNotification('Coupon added successfully!');
          },
          error: (err) => {
            console.error('Error adding coupon:', err);
            this.showErrorNotification('Failed to add coupon');
          }
        });
      }
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched(this.couponForm);
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
    // You can implement snackbar notification here
    console.log('Success:', message);
  }

  private showErrorNotification(message: string) {
    // You can implement snackbar notification here
    console.error('Error:', message);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    this.submit();
  }

  // Get form control for template
  getFormControl(controlName: string): UntypedFormControl {
    return this.couponForm.get(controlName) as UntypedFormControl;
  }
}
