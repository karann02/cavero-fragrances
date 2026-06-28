import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { CmsService } from '../../cmspage.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  title: string;
  slug: string;
}

@Component({
    selector: 'app-all-cms-delete',
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
export class AllCmsDeleteComponent {
  constructor(
    public dialogRef: MatDialogRef<AllCmsDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public cmsService: CmsService
  ) {}
  confirmDelete(): void {
    this.cmsService.deleteCmsPages([this.data.id]).subscribe({
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