import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, firstValueFrom, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface RazorpayConfigResponse {
  key?: string;
  mode?: 'test' | 'live';
  message?: string;
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
}

interface RazorpayFailedResponse {
  error?: {
    description?: string;
  };
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayCheckoutPayload {
  amount: number;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {
  private razorpayScriptPromise: Promise<void> | null = null;

  constructor(private http: HttpClient) {}

  /** Create a Razorpay order (and load the SDK) — call this first so the caller can
   *  persist a pending order with the razorpay order id BEFORE opening the popup. */
  async createRazorpayOrder(amount: number): Promise<{ key: string; order: RazorpayOrderResponse }> {
    const normalizedAmount = Math.max(1, Math.round(amount));
    await this.loadRazorpayScript();

    const [key, order] = await Promise.all([
      this.getPublicKey(),
      firstValueFrom(this.http.post<RazorpayOrderResponse>(`${environment.paymentApiBaseUrl}/create-order`, {
        amount: normalizedAmount,
        currency: 'INR',
        receipt: `order_receipt_${Date.now()}`
      }))
    ]);

    return { key, order };
  }

  /** Full one-shot flow (kept for convenience): create order + open the popup. */
  async pay(payload: RazorpayCheckoutPayload): Promise<RazorpayPaymentResponse> {
    const { key, order } = await this.createRazorpayOrder(payload.amount);
    return this.openCheckout(key, order, payload);
  }

  verifyPayment(payment: RazorpayPaymentResponse) {
    return this.http.post<{ message: string }>(`${environment.paymentApiBaseUrl}/verify-payment`, payment);
  }

  private async getPublicKey(): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<RazorpayConfigResponse>(`${environment.paymentApiBaseUrl}/config`).pipe(
        catchError(() => of({ key: environment.razorpayKey, message: 'Failed to fetch Razorpay config from server.' }))
      )
    );

    const key = response.key || environment.razorpayKey;
    if (!key || key.includes('YOUR_KEY_ID')) {
      throw new Error(response.message || 'Razorpay key is not configured on backend.');
    }
    return key;
  }

  private loadRazorpayScript(): Promise<void> {
    if ((window as any).Razorpay) {
      return Promise.resolve();
    }

    if (this.razorpayScriptPromise) {
      return this.razorpayScriptPromise;
    }

    this.razorpayScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    });

    return this.razorpayScriptPromise;
  }

  openCheckout(
    key: string,
    order: RazorpayOrderResponse,
    payload: RazorpayCheckoutPayload
  ): Promise<RazorpayPaymentResponse> {
    return new Promise((resolve, reject) => {
      const RazorpayCtor = (window as any).Razorpay;
      if (!RazorpayCtor) {
        reject(new Error('Razorpay SDK unavailable.'));
        return;
      }

      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency,
        name: payload.name || 'Cavero Fragrances',
        description: payload.description || 'Order Payment',
        order_id: order.id,
        prefill: payload.prefill || {},
        handler: (response: RazorpayPaymentResponse) => resolve(response),
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled by user.'))
        },
        theme: {
          color: '#3399cc'
        }
      };

      const rzp = new RazorpayCtor(options);
      rzp.on('payment.failed', (response: RazorpayFailedResponse) => {
        reject(new Error(response.error?.description || 'Payment failed. Please try again.'));
      });
      rzp.open();
    });
  }
}
