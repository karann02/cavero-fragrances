import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { VariantTypeService } from '../../varianttype.service';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { VariantType } from '../../varianttype.model';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface DialogData {
  id: number;
  action: string;
  varianttype: VariantType;
}

@Component({
  selector: 'app-varianttype-form-dialog',
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
export class VariantTypeFormComponent implements OnInit {
  action: string;
  dialogTitle: string;
  varianttypeForm!: UntypedFormGroup;
  varianttype: VariantType;
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<VariantTypeFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public variantTypeService: VariantTypeService,
    private fb: UntypedFormBuilder,
  ) {
    this.action = data.action;
    this.dialogTitle = this.action === 'edit'
      ? `Edit Size`
      : 'Add New Size';
    // For both add and edit, honour the passed data (add receives a pre-seeded
    // sort_order so the field shows the next number instead of a leading "0").
    this.varianttype = new VariantType(data.varianttype || {});
    this.varianttypeForm = this.createVariantTypeForm();
  }

  ngOnInit(): void {}

  createVariantTypeForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.varianttype.id],
      name: [
        this.varianttype.name,
        [
          Validators.required,
          Validators.minLength(1),
          Validators.maxLength(50),
        ]
      ],
      is_active: [this.varianttype.is_active !== undefined ? this.varianttype.is_active : true, [Validators.required]],
      sort_order: [this.varianttype.sort_order || 0],
    });
  }

  submit() {
    if (this.varianttypeForm.valid) {
      const formData = {
        ...this.varianttypeForm.value,
        name: String(this.varianttypeForm.value.name || '').trim()
      };

      if (this.action === 'edit') {
        this.variantTypeService.update(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
          },
          error: (err) => {
            console.error('Error updating variant type:', err);
            alert('Error updating size: ' + (err.error?.message || err.message));
          }
        });
      } else {
        this.variantTypeService.add(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
          },
          error: (err) => {
            console.error('Error adding variant type:', err);
            alert('Error adding size: ' + (err.error?.message || err.message));
          }
        });
      }
    } else {
      this.markFormGroupTouched(this.varianttypeForm);
      alert('Please fill all required fields correctly');
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
}
