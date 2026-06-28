import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { rowsAnimation } from '@shared';

@Component({
    selector: 'app-all-returns',
    templateUrl: './allreturns.component.html',
    styleUrls: ['./allreturns.component.scss'],
    animations: [rowsAnimation],
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule, MatIconModule,
        MatButtonModule, MatTooltipModule, MatTableModule, MatSortModule,
        MatPaginatorModule, MatSelectModule, MatSnackBarModule, MatDialogModule
    ]
})
export class AllReturnsComponent implements OnInit {
    displayedColumns = ['id', 'order_number', 'customer', 'reason', 'amount', 'status', 'createdAt', 'actions'];
    dataSource = new MatTableDataSource<any>([]);
    isLoading = true;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private http: HttpClient,
        private snackBar: MatSnackBar
    ) {}

    ngOnInit(): void {
        this.loadData();
    }

    loadData(): void {
        this.isLoading = true;
        this.http.get<any>(`${environment.returnApiBaseUrl}`).subscribe({
            next: (res) => {
                this.dataSource.data = res.data || [];
                this.isLoading = false;
                setTimeout(() => {
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
                });
            },
            error: () => { this.isLoading = false; }
        });
    }

    applyFilter(event: Event): void {
        const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
        this.dataSource.filter = val;
    }

    updateStatus(row: any, status: string, refundAmount?: number): void {
        const body: any = { status };
        if (status === 'refunded' && refundAmount != null) {
            body.refund_amount = refundAmount;
        }

        this.http.patch<any>(`${environment.returnApiBaseUrl}/${row.id}/status`, body).subscribe({
            next: (res) => {
                row.status = status;
                if (status === 'refunded' && refundAmount != null) {
                    row.refund_amount = refundAmount;
                }
                this.snackBar.open(`Return ${status}`, '', { duration: 2500, panelClass: 'snackbar-success' });
            },
            error: (err) => {
                const msg = err.error?.message || 'Failed to update status';
                this.snackBar.open(msg, '', { duration: 3000, panelClass: 'snackbar-danger' });
            }
        });
    }

    approve(row: any): void {
        this.updateStatus(row, 'approved');
    }

    reject(row: any): void {
        this.updateStatus(row, 'rejected');
    }

    refund(row: any): void {
        const input = prompt(`Enter refund amount for order ${row.order_number} (max ₹${row.final_amount}):`, row.final_amount);
        if (input == null) return;
        const amount = parseFloat(input);
        if (isNaN(amount) || amount <= 0) {
            this.snackBar.open('Invalid amount', '', { duration: 2500 });
            return;
        }
        this.updateStatus(row, 'refunded', amount);
    }

    getStatusColor(status: string): string {
        switch (status) {
            case 'requested': return 'accent';
            case 'approved':  return 'primary';
            case 'rejected':  return 'warn';
            case 'refunded':  return 'primary';
            default:          return '';
        }
    }
}
