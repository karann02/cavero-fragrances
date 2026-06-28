import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CartService } from '../cart/cart.service';
import { Cart, CartItem } from '../models/cart.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { RazorpayService } from '../../shared/services/razorpay.service';
import { AuthService } from '../../core/service/auth.service';
import { FrontendNotificationService } from '../../shared/services/frontend-notification.service';
import { CaveroNavbarComponent } from '../../../themes/cavero/components/navbar/navbar.component';
import { CaveroFooterComponent } from '../../../themes/cavero/components/footer/footer.component';

@Component({
    selector: 'app-checkout',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, CaveroNavbarComponent, CaveroFooterComponent],
    templateUrl: './checkout.component.html',
    styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit {
    checkoutForm: FormGroup;
    cart$: Observable<Cart>;
    isSubmitting = false;

    savedAddresses: any[] = [];
    selectedAddressId: number | 'new' | null = null;

    constructor(
        private fb: FormBuilder,
        private cartService: CartService,
        private http: HttpClient,
        private router: Router,
        private snackBar: MatSnackBar,
        private ngZone: NgZone,
        private razorpayService: RazorpayService,
        private authService: AuthService,
        private notification: FrontendNotificationService
    ) {
        this.cart$ = this.cartService.cart$;
        this.checkoutForm = this.fb.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
            address: ['', Validators.required],
            city: ['', Validators.required],
            zipCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
            paymentMethod: ['cash_on_delivery', Validators.required],
            saveAddress: [true]
        });
    }

    ngOnInit(): void {
        this.prefillFromProfile();
        this.loadSavedAddresses();
    }

    get f() { return this.checkoutForm.controls; }

    /** Pre-fill name / email / phone from the logged-in user's token. */
    private prefillFromProfile(): void {
        const user = this.authService.getDecodeToken();
        if (!user) return;

        const fullName = String(user.name || '').trim();
        const [firstName, ...rest] = fullName.split(/\s+/);
        this.checkoutForm.patchValue({
            firstName: firstName || '',
            lastName: rest.join(' ') || '',
            email: user.email || '',
            phone: user.phone || ''
        });
    }

    /** Load the customer's saved addresses; auto-select the default (or first) one. */
    loadSavedAddresses(): void {
        const user = this.authService.getDecodeToken();
        if (!user?.id) return;

        this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/addresses/user/${user.id}`).subscribe({
            next: (res) => {
                if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
                    this.savedAddresses = res.data;
                    const preferred = res.data.find((a: any) => a.is_default) || res.data[0];
                    this.selectAddress(preferred);
                } else {
                    this.useNewAddress();
                }
            },
            error: () => { this.savedAddresses = []; }
        });
    }

    /** Fill the form from a chosen saved address. */
    selectAddress(addr: any): void {
        if (!addr) return;
        this.selectedAddressId = addr.id;
        const line = [addr.street, addr.state].filter(Boolean).join(', ');
        this.checkoutForm.patchValue({
            address: line || addr.street || '',
            city: addr.city || '',
            zipCode: addr.zip_code || ''
        });
    }

    /** Switch to manual entry — clears the address fields so the customer can type a new one. */
    useNewAddress(): void {
        this.selectedAddressId = 'new';
        this.checkoutForm.patchValue({ address: '', city: '', zipCode: '' });
    }

    /** One-line summary of a saved address for the selector card. */
    formatAddress(addr: any): string {
        return [addr.street, addr.city, addr.state, addr.zip_code, addr.country]
            .filter(Boolean)
            .join(', ');
    }

    placeOrder(): void {
        if (this.checkoutForm.invalid) return;

        this.isSubmitting = true;
        const formData = this.checkoutForm.value;

        // Persist a freshly-typed address to the customer's profile when opted in.
        this.maybeSaveNewAddress();

        if (formData.paymentMethod === 'online') {
            this.processOnlinePayment();
        } else {
            this.saveOrder(formData.paymentMethod);
        }
    }

    /** When the customer entered a new address and ticked "save", store it on their
     *  profile so it appears as a saved address next time. Fire-and-forget — a failure
     *  here must never block placing the order. */
    private maybeSaveNewAddress(): void {
        if (this.selectedAddressId !== 'new') return;
        if (!this.checkoutForm.value.saveAddress) return;

        const user = this.authService.getDecodeToken();
        if (!user?.id) return;

        const f = this.checkoutForm.value;
        const payload = {
            user_id: user.id,
            label: 'Home',
            street: f.address,
            city: f.city,
            state: '',
            zip_code: f.zipCode,
            country: 'India',
            is_default: this.savedAddresses.length === 0, // first address becomes the default
            type: 'shipping'
        };

        this.http.post<any>(`${environment.apiGatewayBaseUrl}/api/addresses`, payload)
            .subscribe({ next: () => {}, error: () => {} });
    }

    /** Authoritative payable amount computed from the live cart items (+ coupon /
     *  delivery) — never trust a possibly-stale cart.total which can read 0. */
    private computePayable(cart: Cart): { subtotal: number; discount: number; delivery: number; total: number } {
        const subtotal = (cart.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
        const discount = Number(cart.coupon_discount || 0);
        const delivery = Number(cart.delivery_fee || 0);
        const total = Math.max(subtotal - discount, 0) + delivery;
        const round = (n: number) => Math.round(n * 100) / 100;
        return { subtotal: round(subtotal), discount: round(discount), delivery: round(delivery), total: round(total) };
    }

    async processOnlinePayment(): Promise<void> {
        const cart = this.cartService.getCartValue();
        const payable = this.computePayable(cart);

        // Guard: never open Razorpay (or charge the ₹1 minimum) for an empty/zero cart.
        if (!cart.items?.length || payable.total <= 0) {
            this.snackBar.open('Your cart looks empty — please reload the page and try again.', 'Close', { duration: 4000 });
            this.isSubmitting = false;
            return;
        }

        let pendingOrderId: number | string | null = null;
        try {
            // 1) Create the Razorpay order, then 2) create OUR order as PENDING (stock
            //    reserved) BEFORE the popup — so a dropped connection can't lose the order;
            //    verify/webhook/cleanup reconcile it to paid afterwards.
            const { key, order } = await this.razorpayService.createRazorpayOrder(payable.total);
            const created = await this.placeOrderRequest(this.buildOrderPayload('online', '', order.id));
            pendingOrderId = created?.id ?? null;

            const paymentResponse = await this.razorpayService.openCheckout(key, order, {
                amount: payable.total,
                prefill: {
                    name: `${this.checkoutForm.value.firstName} ${this.checkoutForm.value.lastName}`.trim(),
                    email: this.checkoutForm.value.email,
                    contact: this.checkoutForm.value.phone
                }
            });

            await firstValueFrom(this.razorpayService.verifyPayment(paymentResponse));

            this.ngZone.run(() => {
                this.cartService.clearCart();
                this.notification.success('Order placed successfully! Thank you for shopping with Cavero.');
                try { sessionStorage.setItem('cavero_just_placed_order', String(pendingOrderId)); } catch {}
                this.router.navigate(['/order-success', pendingOrderId]);
            });
        } catch (error) {
            // Payment cancelled/failed after the pending order was created → release its
            // reserved stock now (the server cleanup job is the safety net otherwise).
            if (pendingOrderId) { this.cancelPendingOrder(pendingOrderId); }
            this.ngZone.run(() => {
                this.snackBar.open(this.getErrorMessage(error), 'Close', { duration: 3000 });
                this.isSubmitting = false;
            });
        }
    }

    /** Build the order payload from the current cart + checkout form. */
    private buildOrderPayload(paymentMethod: string, transactionId: string = '', razorpayOrderId: string = ''): any {
        const cart = this.cartService.getCartValue();
        const payable = this.computePayable(cart);
        const formData = this.checkoutForm.value;
        const shippingAddress = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            zip_code: formData.zipCode
        };
        return {
            items: this.buildOrderItems(cart.items),
            shipping_address: shippingAddress,
            billing_address: shippingAddress,
            payment_method: paymentMethod,
            transaction_id: transactionId,
            razorpay_order_id: razorpayOrderId || null,
            subtotal: payable.subtotal,
            delivery_fee: payable.delivery,
            total_amount: payable.total,
            coupon_id: cart.coupon_id || null,
            coupon_code: cart.coupon_code || null
        };
    }

    /** POST an order and resolve with the created order record. */
    private placeOrderRequest(payload: any): Promise<any> {
        return firstValueFrom(this.http.post<any>(`${environment.orderApiBaseUrl}`, payload)).then((res: any) => res?.data);
    }

    /** Release a pending online order (restores stock + reverses coupon) when payment is abandoned. */
    private cancelPendingOrder(orderId: number | string): void {
        this.http.post(`${environment.orderApiBaseUrl}/${orderId}/cancel`, {}).subscribe({ next: () => {}, error: () => {} });
    }

    /** COD path — create the order and go to the success page. */
    saveOrder(paymentMethod: string): void {
        this.placeOrderRequest(this.buildOrderPayload(paymentMethod))
            .then((order: any) => {
                this.cartService.clearCart();
                const orderId = order?.id;
                this.notification.success('Order placed successfully! Thank you for shopping with Cavero.');
                try { sessionStorage.setItem('cavero_just_placed_order', String(orderId)); } catch {}
                this.router.navigate(['/order-success', orderId]);
            })
            .catch((err: any) => {
                console.error('Order placement failed', err);
                this.snackBar.open(this.getErrorMessage(err), 'Close', { duration: 3000 });
                this.isSubmitting = false;
            });
    }

    private buildOrderItems(items: CartItem[]): Array<{ product_id: string; quantity: number; price: number; total: number; selected_size?: string; variant_id?: number; combo_id?: number | boolean }> {
        type OrderItemPayload = { product_id: string; quantity: number; price: number; total: number; selected_size?: string; variant_id?: number; combo_id?: number | boolean };
        return items.flatMap((item): OrderItemPayload[] => {
            if (item.item_type !== 'combo_box' || !item.combo_box_items?.length) {
                return [{
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total,
                    ...(item.selected_size ? { selected_size: item.selected_size } : {}),
                    ...(item.variant_id ? { variant_id: item.variant_id } : {})
                }];
            }

            const multipliedEntries = item.combo_box_items.map((comboItem) => ({
                product_id: comboItem.product_id,
                quantity: Math.max(1, Number(comboItem.quantity || 1)) * Math.max(1, Number(item.quantity || 1)),
                baseTotal: Math.max(0, Number(comboItem.price || 0)) * Math.max(1, Number(comboItem.quantity || 1))
            }));

            const sourceTotal = Math.max(0, Number(item.total || 0));
            const baseTotalSum = multipliedEntries.reduce((sum, entry) => sum + entry.baseTotal, 0);
            let remaining = sourceTotal;

            return multipliedEntries.map((entry, index) => {
                const allocatedTotal = index === multipliedEntries.length - 1
                    ? Number(remaining.toFixed(2))
                    : Number(((baseTotalSum > 0 ? (sourceTotal * entry.baseTotal) / baseTotalSum : sourceTotal / multipliedEntries.length)).toFixed(2));

                remaining = Number((remaining - allocatedTotal).toFixed(2));

                return {
                    product_id: entry.product_id,
                    quantity: entry.quantity,
                    price: Number((allocatedTotal / entry.quantity).toFixed(2)),
                    total: allocatedTotal,
                    combo_id: item.combo_id ?? true   // marks this as a combo line so the server keeps its allocated price
                };
            });
        });
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof HttpErrorResponse) {
            const serverMessage = error.error?.message || error.error?.error || '';
            if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
            if (error.message) return error.message;
        }
        if (error instanceof Error && error.message?.trim()) return error.message;
        return 'Payment failed. Please try again.';
    }
}
