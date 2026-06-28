import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { SupportTicketsService } from './support-tickets.service';
import { rowsAnimation } from '@shared';

@Component({
  selector: 'app-all-tickets',
  templateUrl: './alltickets.component.html',
  styleUrls: ['./alltickets.component.scss'],
  animations: [rowsAnimation],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatButtonModule, MatTooltipModule, MatTableModule, MatSortModule,
    MatPaginatorModule, MatSelectModule, MatSnackBarModule
  ]
})
export class AllTicketsComponent implements OnInit {
  displayedColumns = ['id', 'name', 'mobile', 'email', 'subject', 'message', 'status', 'createdAt'];
  dataSource = new MatTableDataSource<any>([]);
  isLoading = true;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private ticketsService: SupportTicketsService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.ticketsService.getTickets().subscribe({
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

  updateStatus(row: any, status: string): void {
    this.ticketsService.updateStatus(row.id, status).subscribe({
      next: () => {
        row.status = status;
        this.snackBar.open('Status updated', '', { duration: 2000, panelClass: 'snackbar-success' });
      },
      error: () => {
        this.snackBar.open('Failed to update status', '', { duration: 2000, panelClass: 'snackbar-danger' });
      }
    });
  }
}
