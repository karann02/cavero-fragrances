import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface DialogData {
  order: any;
}

@Component({
    selector: 'app-order-status-update',
    templateUrl: './form-dialog.component.html',
    imports: [
        MatButtonModule,
        MatSelectModule,
        FormsModule,
        CommonModule
    ]
})
export class OrderStatusUpdateComponent {
  selectedStatus: string;

  statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    public dialogRef: MatDialogRef<OrderStatusUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.selectedStatus = data.order.order_status;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  confirmUpdate(): void {
    this.dialogRef.close(this.selectedStatus);
  }
}