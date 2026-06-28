import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { CountryService } from '../../country.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  first_name: string;
  department_name: string;
  contact_no: string;
}

@Component({
    selector: 'app-all-country-delete',
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
export class AllCountryDeleteComponent {
  constructor(
    public dialogRef: MatDialogRef<AllCountryDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public CountryService: CountryService
  ) {}
  confirmDelete(): void {
    this.CountryService.deleteCountry(this.data.id).subscribe({
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
