import { formatDate } from '@angular/common';

export class Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  expiry_date: string;
  is_active: boolean;

  constructor(coupon: Partial<Coupon> = {}) {
    this.id = coupon.id || this.getRandomID();
    this.code = coupon.code || '';
    this.discount_type = coupon.discount_type || 'percent';
    this.discount_value = coupon.discount_value || 0;
    this.min_order_amount = coupon.min_order_amount || 0;
    this.expiry_date = coupon.expiry_date || '';
    this.is_active = coupon.is_active !== undefined ? coupon.is_active : true;
  }

  public getRandomID(): string {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000).toString(16);
    };
    return S4() + S4();
  }
}