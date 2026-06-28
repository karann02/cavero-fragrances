import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { CartService } from './cart.service';
import { Cart, CartItem } from '../models/cart.model';
import { CaveroNavbarComponent } from '../../../themes/cavero/components/navbar/navbar.component';
import { CaveroFooterComponent } from '../../../themes/cavero/components/footer/footer.component';
import { CaveroService } from '../../../themes/cavero/services/cavero.service';
import { FrontendNotificationService } from '../../shared/services/frontend-notification.service';
import { getSeoRouteParam } from '../../shared/utils/seo-url.util';
import { environment } from '../../../environments/environment';

interface FreeGift {
  id: number;
  name: string;
  min_order_value: number;
  is_active: boolean;
}

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, HttpClientModule, CaveroNavbarComponent, CaveroFooterComponent],
    templateUrl: './cart.component.html',
    styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit, OnDestroy {
    cart$: Observable<Cart>;
    freeGifts: FreeGift[] = [];
    availableCoupons: any[] = [];
    couponCode: string = '';
    private hadCouponApplied = false;
    private cartSub?: Subscription;
    private themeLink?: HTMLLinkElement;
    private iconLink?: HTMLLinkElement;

    constructor(
        private cartService: CartService,
        private caveroService: CaveroService,
        private notification: FrontendNotificationService,
        private http: HttpClient
    ) {
        this.cart$ = this.cartService.cart$;
    }

    ngOnInit(): void {
        this.themeLink = document.createElement('link');
        this.themeLink.rel = 'stylesheet';
        this.themeLink.href = 'assets/cavero/css/theme.min.css';
        document.head.appendChild(this.themeLink);

        this.iconLink = document.createElement('link');
        this.iconLink.rel = 'stylesheet';
        this.iconLink.href = 'assets/cavero/icons/cavero-icons.min.css';
        document.head.appendChild(this.iconLink);

        const script = document.createElement('script');
        script.src = 'assets/cavero/js/theme.min.js';
        script.onload = () => setTimeout(() => this.caveroService.initializeCavero(), 300);
        document.head.appendChild(script);

        this.loadFreeGifts();
        this.loadAvailableCoupons();

        // When an applied coupon gets auto-removed (cart dropped below its minimum),
        // clear the manual coupon-code input so the field doesn't keep a stale code.
        this.cartSub = this.cart$.subscribe(cart => {
            const hasCoupon = !!cart.applied_coupon;
            if (this.hadCouponApplied && !hasCoupon) {
                this.couponCode = '';
            }
            this.hadCouponApplied = hasCoupon;
        });
    }

    ngOnDestroy(): void {
        [this.themeLink, this.iconLink].forEach(el => el?.parentNode?.removeChild(el));
        this.cartSub?.unsubscribe();
    }

    loadFreeGifts(): void {
        this.http.get<any>(`${environment.freeGiftsApiBaseUrl}/active`)
            .subscribe({ next: res => { if (res.success) this.freeGifts = res.data; }, error: () => {} });
    }

    loadAvailableCoupons(): void {
        this.cartService.getAvailableCoupons().subscribe({
            next: (coupons) => {
                const now = Date.now();
                this.availableCoupons = (coupons || []).filter((c: any) => {
                    if (c?.status === false) return false;
                    if (c?.valid_until && new Date(c.valid_until).getTime() < now) return false;
                    return true;
                });
            },
            error: () => { this.availableCoupons = []; }
        });
    }

    /** A coupon is applicable when the cart subtotal meets its minimum order amount. */
    isCouponApplicable(coupon: any, subtotal: number): boolean {
        return Number(subtotal || 0) >= Number(coupon?.min_order_amount || 0);
    }

    /** Short human label for a coupon's discount, e.g. "20% OFF" or "₹100 OFF". */
    getCouponDiscountLabel(coupon: any): string {
        if (coupon?.type === 'fixed') {
            return `₹${Number(coupon.value || 0)} OFF`;
        }
        return `${Number(coupon?.value || 0)}% OFF`;
    }

    /** Rupee discount this coupon gives on a given order value (capped at max_discount). */
    getCouponSavings(coupon: any, orderValue: number): number {
        const value = Number(coupon?.value || 0);
        const order = Number(orderValue || 0);
        let savings: number;
        if (coupon?.type === 'fixed') {
            savings = value;
        } else {
            savings = order * (value / 100);
            const cap = coupon?.max_discount;
            if (cap !== null && cap !== undefined) {
                savings = Math.min(savings, Number(cap));
            }
        }
        return Math.max(0, Math.round(Math.min(savings, order)));
    }

    /** The closest coupon the customer is just short of unlocking (for the upsell nudge). */
    getNextCoupon(subtotal: number): any | null {
        const sub = Number(subtotal || 0);
        return this.availableCoupons
            .filter(c => Number(c?.min_order_amount || 0) > sub)
            .sort((a, b) => Number(a.min_order_amount) - Number(b.min_order_amount))[0] || null;
    }

    /** How much more the customer must add to unlock the given coupon. */
    getAmountToUnlock(coupon: any, subtotal: number): number {
        return Math.max(0, Number(coupon?.min_order_amount || 0) - Number(subtotal || 0));
    }

    /** Progress (0-100) toward unlocking a coupon from the cart subtotal. */
    getCouponProgress(coupon: any, subtotal: number): number {
        const min = Number(coupon?.min_order_amount || 0);
        if (min <= 0) return 100;
        return Math.min(100, Math.max(0, Math.round((Number(subtotal || 0) / min) * 100)));
    }

    /** The applicable coupon that saves the most money — flagged as the BEST deal. */
    getBestCoupon(subtotal: number): any | null {
        const applicable = this.availableCoupons.filter(c => this.isCouponApplicable(c, subtotal));
        if (applicable.length < 2) return null;
        return applicable
            .map(c => ({ c, save: this.getCouponSavings(c, subtotal) }))
            .sort((a, b) => b.save - a.save)[0]?.c || null;
    }

    /** True when a coupon expires within the next 3 days (urgency badge). */
    isCouponExpiringSoon(coupon: any): boolean {
        if (!coupon?.valid_until) return false;
        const ms = new Date(coupon.valid_until).getTime() - Date.now();
        return ms > 0 && ms <= 3 * 24 * 60 * 60 * 1000;
    }

    /** Human label for imminent expiry, e.g. "Expires today" / "Expires in 2 days". */
    getCouponExpiryLabel(coupon: any): string {
        if (!coupon?.valid_until) return '';
        const days = Math.ceil((new Date(coupon.valid_until).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        if (days <= 0) return 'Expires today';
        if (days === 1) return 'Expires tomorrow';
        return `Expires in ${days} days`;
    }

    /** Apply a coupon straight from the list (only when it meets the minimum). */
    applyCouponFromList(coupon: any, subtotal: number): void {
        const code = String(coupon?.code || '').trim();
        if (!code || !this.isCouponApplicable(coupon, subtotal)) return;
        // Apply directly — do NOT fill the manual input box.
        this.cartService.applyCouponCode(code).subscribe({ next: () => {}, error: () => {} });
    }

    getNextGift(subtotal: number): FreeGift | null {
        return this.freeGifts.find(g => subtotal < g.min_order_value) || null;
    }

    getUnlockedGifts(subtotal: number): FreeGift[] {
        return this.freeGifts.filter(g => subtotal >= g.min_order_value);
    }

    getProgressPercent(subtotal: number, next: FreeGift): number {
        const prev = this.freeGifts
            .filter(g => g.min_order_value < next.min_order_value)
            .reduce((max, g) => Math.max(max, g.min_order_value), 0);
        const range = next.min_order_value - prev;
        const progress = subtotal - prev;
        return Math.min(100, Math.max(0, Math.round((progress / range) * 100)));
    }

    /** True when the item's quantity has reached its available stock (combo boxes are uncapped). */
    isMaxQuantity(item: CartItem): boolean {
        if (this.isComboBoxItem(item)) return false;
        const stock = Number(item.stock);
        return Number.isFinite(stock) && stock >= 0 && item.quantity >= stock;
    }

    incrementItem(item: CartItem): void {
        const stock = Number(item.stock);
        const hasStock = Number.isFinite(stock) && stock >= 0 && !this.isComboBoxItem(item);

        // already at the ceiling — block and explain (same as the product detail page)
        if (hasStock && item.quantity >= stock) {
            this.notification.error(`We don't have more than ${stock} in stock right now. Please try again later.`);
            return;
        }

        const next = item.quantity + 1;
        this.cartService.updateQuantity(item.product_id, next);

        // just hit the ceiling — tell the customer why the + is now disabled
        if (hasStock && next >= stock) {
            this.notification.error(`That's all we have in stock right now (${stock}). Please try again later for more.`);
        }
    }

    decrementItem(item: CartItem): void {
        this.cartService.updateQuantity(item.product_id, item.quantity - 1);
    }

    removeItem(productId: string): void {
        this.cartService.removeFromCart(productId);
    }

    clearCart(): void {
        this.cartService.clearCart();
    }

    /** Product name without the trailing "(size)" — the size is shown as its own badge. */
    getItemDisplayName(item: CartItem): string {
        const name = String(item.product_name || '');
        const size = String(item.selected_size || '').trim();
        const suffix = ` (${size})`;
        if (size && name.endsWith(suffix)) {
            return name.slice(0, name.length - suffix.length).trim();
        }
        return name;
    }

    applyCoupon(): void {
        const code = this.couponCode.trim();
        if (code) {
            this.cartService.applyCouponCode(code).subscribe({ next: () => {}, error: () => {} });
        }
    }

    removeCoupon(): void {
        this.cartService.removeCoupon(true);
        this.couponCode = '';
    }

    isComboBoxItem(item: CartItem): boolean {
        return item.item_type === 'combo_box';
    }

    getProductRouteParam(item: CartItem): string {
        return getSeoRouteParam(item);
    }
}
