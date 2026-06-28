import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { CouponService } from '../../coupon.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  code: string;
  type: string;
  value: string;
}

@Component({
    selector: 'app-all-coupon-delete',
    templateUrl: './delete.component.html',
    styleUrls: ['./delete.component.scss'],
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatDialogClose,
    ]
})
export class AllCouponDeleteComponent {
  constructor(
    public dialogRef: MatDialogRef<AllCouponDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public couponService: CouponService
  ) {}
  confirmDelete(): void {
    this.couponService.deleteCoupons([this.data.id]).subscribe({
      next: (response) => {
         console.log('Delete Response:', response);
        this.dialogRef.close(response); // Close with the response data
        // Handle successful deletion, e.g., refresh the table or show a notification
      },
      error: (error) => {
        console.error('Delete Error:', error);
        // Handle the error appropriately
      },
    });
  }
}