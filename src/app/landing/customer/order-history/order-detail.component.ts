import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReturnService } from './return.service';
import { InvoiceService } from '../../../shared/services/invoice.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-5" *ngIf="order">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h2 class="mb-0">Order #{{ order.order_number }}</h2>
            <span class="badge mt-2" 
                  [ngClass]="{
                    'bg-success': order.order_status === 'delivered',
                    'bg-primary': order.order_status === 'shipped',
                    'bg-warning': order.order_status === 'pending',
                    'bg-danger': order.order_status === 'cancelled',
                    'bg-info': order.order_status === 'return_requested'
                  }">
                  {{ order.order_status | titlecase }}
            </span>
        </div>
        <div>
            <button *ngIf="order.order_status === 'delivered'" 
                    class="btn btn-outline-danger me-2" 
                    (click)="requestReturn()">
                Return Order
            </button>
            <button class="btn btn-outline-primary me-2" (click)="downloadInvoice()">
                Download Invoice
            </button>
            <a routerLink="/my-orders" class="btn btn-outline-secondary">Back to Orders</a>
        </div>
      </div>

      <div class="row">
        <div class="col-lg-8">
          <div class="card shadow-sm mb-4">
            <div class="card-header bg-white">
              <h5 class="mb-0">Items</h5>
            </div>
             <div class="table-responsive">
              <table class="table mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th class="text-center">Quantity</th>
                    <th class="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of order.order_items">
                    <td>
                      <div class="d-flex align-items-center">
                        <div>
                          <h6 class="mb-0">{{ item.product?.name || item.name || 'Product' }}</h6>
                          <small class="text-muted">{{ item.price | currency }}</small>
                        </div>
                      </div>
                    </td>
                    <td class="text-center">{{ item.quantity }}</td>
                    <td class="text-end">{{ (item.price * item.quantity) | currency }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card shadow-sm mb-4">
            <div class="card-header bg-white">
              <h5 class="mb-0">Order Summary</h5>
            </div>
            <div class="card-body">
              <ul class="list-unstyled mb-0">
                <li class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Subtotal:</span>
                  <span class="fw-bold">{{ order.total_amount | currency }}</span>
                </li>
                <li class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Shipping:</span>
                  <span>{{ order.shipping_amount | currency }}</span>
                </li>
                 <li class="d-flex justify-content-between border-top pt-3 mt-3">
                  <span class="h6 mb-0">Total:</span>
                  <span class="h6 mb-0">{{ order.final_amount | currency }}</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="card shadow-sm">
            <div class="card-header bg-white">
              <h5 class="mb-0">Shipping Info</h5>
            </div>
            <div class="card-body">
              <p class="mb-1 fw-bold">{{ order.shipping_address?.firstName }} {{ order.shipping_address?.lastName }}</p>
              <p class="mb-1">{{ order.shipping_address?.address }}</p>
              <p class="mb-1">{{ order.shipping_address?.city }}, {{ order.shipping_address?.zip_code }}</p>
              <p class="mb-0">{{ order.shipping_address?.phone }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="container py-5 text-center" *ngIf="!order && !loading">
      <h3>Order not found</h3>
      <a routerLink="/my-orders" class="btn btn-primary mt-3">Back to Orders</a>
    </div>
  `
})
export class OrderDetailComponent implements OnInit {
  order: any = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private returnService: ReturnService,
    private invoiceService: InvoiceService
  ) { }

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (orderId) {
      this.fetchOrder(orderId);
    }
  }

  fetchOrder(id: string): void {
    this.http.get<any>(`${environment.orderApiBaseUrl}/${id}`)
      .subscribe({
        next: (res) => {
          this.order = res.data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to fetch order', err);
          this.loading = false;
        }
      });
  }

  requestReturn(): void {
    if (!this.order) return;
    const reason = prompt('Please enter the reason for return:');
    if (reason) {
      this.returnService.requestReturn({ order_id: this.order.id, reason }).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Return requested successfully', 'Close', { duration: 3000 });
            this.order.order_status = 'return_requested';
          } else {
            this.snackBar.open(res.message || 'Failed to request return', 'Close', { duration: 3000 });
          }
        },
        error: (err) => {
          console.error('Return request failed', err);
          this.snackBar.open('Error requesting return', 'Close', { duration: 3000 });
        }
      });
    }
  }

  async downloadInvoice(): Promise<void> {
    if (!this.order) return;

    try {
      await this.invoiceService.downloadOrderInvoice(this.order);
    } catch (error) {
      console.error('Invoice download failed', error);
      this.snackBar.open('Unable to download invoice', 'Close', { duration: 3000 });
    }
  }
}
