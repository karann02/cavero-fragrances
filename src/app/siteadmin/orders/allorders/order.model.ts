import { formatDate } from '@angular/common';

export class Order {
  id: string;
  user_id: string;
  total_amount: number;
  payment_status: string;
  order_status: string;
  payment_mode: string;
  razorpay_order_id: string;
  tracking_number: string;
  address: any;
  created_at: string;

  constructor(order: Partial<Order> = {}) {
    this.id = order.id || this.getRandomID();
    this.user_id = order.user_id || '';
    this.total_amount = order.total_amount || 0;
    this.payment_status = order.payment_status || 'pending';
    this.order_status = order.order_status || 'placed';
    this.payment_mode = order.payment_mode || 'razorpay';
    this.razorpay_order_id = order.razorpay_order_id || '';
    this.tracking_number = order.tracking_number || '';
    this.address = order.address || {};
    this.created_at = order.created_at || '';
  }

  public getRandomID(): string {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000).toString(16);
    };
    return S4() + S4();
  }
}