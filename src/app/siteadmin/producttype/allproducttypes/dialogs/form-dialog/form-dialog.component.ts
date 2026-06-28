// form-dialog.component.ts
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { ProductTypeService } from '../../producttype.service';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { ProductType } from '../../producttype.model';
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
  producttype: ProductType;
}

@Component({
  selector: 'app-producttype-form-dialog',
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
export class ProductTypeFormComponent implements OnInit {
  action: string;
  dialogTitle: string;
  producttypeForm!: UntypedFormGroup;
  producttype: ProductType;
  products: any[] = [];
  isLoading = false;
  totalOriginalPrice = 0;

  constructor(
    public dialogRef: MatDialogRef<ProductTypeFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public ProductTypeService: ProductTypeService,
    private fb: UntypedFormBuilder,
  ) {
    this.action = data.action;
    this.dialogTitle = this.action === 'edit' ? `Edit ${data.producttype.name}` : 'Add New ProductType';
    this.producttype = this.action === 'edit' ? data.producttype : new ProductType({});
    this.producttypeForm = this.createProductTypeForm();
  }

  ngOnInit(): void {
    
  }

  createProductTypeForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.producttype.id],
      name: [
        this.producttype.name,
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
        ]
      ],
      active: [this.producttype.active !== undefined ? this.producttype.active : true, [Validators.required]],
    })
     
  }

  


  
  submit() {
    if (this.producttypeForm.valid) {
      const formData = {
        ...this.producttypeForm.value,
        name: String(this.producttypeForm.value.name || '').trim()
      };
      
      // Filter out empty product entries
  
      if (this.action === 'edit') {
        this.ProductTypeService.updateProductType(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
          },
          error: (err) => {
            console.error('Error updating producttype:', err);
            alert('Error updating producttype: ' + err.error.message);
          }
        });
      } else {
        this.ProductTypeService.addProductType(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
          },
          error: (err) => {
            console.error('Error adding producttype:', err);
            alert('Error adding producttype: ' + err.error.message);
          }
        });
      }
    } else {
      this.markFormGroupTouched(this.producttypeForm);
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
