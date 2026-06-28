import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-order-success',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
<!-- ── Loading ── -->
<div class="cvr-os-loading" *ngIf="loading">
  <span class="cvr-os-spinner"></span>
</div>

<!-- ── Success Page ── -->
<div class="cvr-os" *ngIf="!loading && order">

  <!-- Hero: confetti + checkmark + heading -->
  <div class="cvr-os-hero">

    <!-- Confetti particles (CSS-only animation) -->
    <div class="cvr-os-confetti" aria-hidden="true">
      <span class="cvr-p cvr-p-1"></span>
      <span class="cvr-p cvr-p-2"></span>
      <span class="cvr-p cvr-p-3"></span>
      <span class="cvr-p cvr-p-4"></span>
      <span class="cvr-p cvr-p-5"></span>
      <span class="cvr-p cvr-p-6"></span>
      <span class="cvr-p cvr-p-7"></span>
      <span class="cvr-p cvr-p-8"></span>
      <span class="cvr-p cvr-p-9"></span>
      <span class="cvr-p cvr-p-10"></span>
      <span class="cvr-p cvr-p-11"></span>
      <span class="cvr-p cvr-p-12"></span>
    </div>

    <!-- SVG Checkmark (stroke-draw animation) -->
    <div class="cvr-os-check-wrap">
      <svg class="cvr-os-check-svg" width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle class="cvr-check-ring" cx="48" cy="48" r="44" stroke="#418576" stroke-width="2" fill="none"/>
        <circle cx="48" cy="48" r="38" fill="rgba(65,133,118,0.07)"/>
        <path class="cvr-check-path" d="M28 48L42 62L68 34" stroke="#418576" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </div>

    <h1 class="cvr-os-title">Order Confirmed!</h1>
    <p class="cvr-os-subtitle">Thank you for your purchase. We'll process your order shortly.</p>

    <!-- Order number badge -->
    <div class="cvr-os-order-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      Order #{{ order.order_number }}
    </div>

  </div>

  <!-- Details grid -->
  <div class="container">
    <div class="cvr-os-grid">

      <!-- LEFT: Items + Delivery -->
      <div>

        <!-- Items -->
        <div class="cvr-os-card">
          <h5 class="cvr-os-card-title">Items Ordered</h5>
          <div class="cvr-os-items-list">
            <div *ngFor="let item of order.order_items" class="cvr-os-item">
              <span class="cvr-os-item-name">{{ item.product?.name || 'Fragrance' }}</span>
              <span class="cvr-os-item-qty">× {{ item.quantity }}</span>
              <span class="cvr-os-item-total">&#8377;{{ (item.price * item.quantity) | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <!-- Delivery Info -->
        <div class="cvr-os-card">
          <h5 class="cvr-os-card-title">Delivery Information</h5>
          <div class="cvr-os-delivery-grid">
            <div>
              <p class="cvr-os-label">Shipping To</p>
              <p class="cvr-os-val-strong">{{ order.shipping_address?.firstName }} {{ order.shipping_address?.lastName }}</p>
              <p class="cvr-os-val">{{ order.shipping_address?.address }}</p>
              <p class="cvr-os-val">{{ order.shipping_address?.city }}, {{ order.shipping_address?.zip_code }}</p>
              <p class="cvr-os-val">{{ order.shipping_address?.phone }}</p>
            </div>
            <div>
              <p class="cvr-os-label">Estimated Delivery</p>
              <p class="cvr-os-val-strong">3–5 Business Days</p>
              <p class="cvr-os-label" style="margin-top:0.75rem">Confirmation sent to</p>
              <p class="cvr-os-val-strong" style="color:#418576; word-break:break-all;">{{ order.shipping_address?.email }}</p>
            </div>
          </div>
        </div>

      </div>

      <!-- RIGHT: Summary + Payment + CTAs -->
      <div>

        <!-- Order Summary -->
        <div class="cvr-os-card">
          <h5 class="cvr-os-card-title">Order Summary</h5>
          <div class="cvr-os-row">
            <span>Subtotal</span>
            <span>&#8377;{{ order.total_amount | number:'1.0-0' }}</span>
          </div>
          <div class="cvr-os-row cvr-os-row--discount" *ngIf="order.discount_amount > 0">
            <span>Discount</span>
            <span>−&#8377;{{ order.discount_amount | number:'1.0-0' }}</span>
          </div>
          <div class="cvr-os-row">
            <span>Delivery</span>
            <span *ngIf="order.shipping_amount > 0">&#8377;{{ order.shipping_amount | number:'1.0-0' }}</span>
            <span *ngIf="order.shipping_amount == 0" class="cvr-free-tag">FREE</span>
          </div>
          <div class="cvr-os-total-row">
            <span>Total Paid</span>
            <span class="cvr-os-total-amt">&#8377;{{ order.final_amount | number:'1.0-0' }}</span>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="cvr-os-card">
          <p class="cvr-os-label">Payment Method</p>
          <p class="cvr-os-val-strong">
            <span *ngIf="order.payment_method === 'cash_on_delivery'">Cash on Delivery</span>
            <span *ngIf="order.payment_method === 'online'">Online Payment (Razorpay)</span>
          </p>
          <span class="cvr-os-payment-badge"
            [class.cvr-os-payment-badge--paid]="order.payment_status === 'paid'"
            [class.cvr-os-payment-badge--pending]="order.payment_status !== 'paid'">
            {{ order.payment_status | titlecase }}
          </span>
        </div>

        <!-- CTAs -->
        <a routerLink="/profile" fragment="orders" class="cvr-os-btn-primary">View My Orders</a>
        <a routerLink="/shop" class="cvr-os-btn-outline">Continue Shopping</a>

      </div>

    </div>
  </div>
</div>

<!-- ── Not Found ── -->
<div class="cvr-os-notfound" *ngIf="!loading && !order">
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(65,133,118,0.4)" stroke-width="1.5">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
  <h3>Order not found</h3>
  <a routerLink="/" class="cvr-os-btn-primary" style="display:inline-block;max-width:200px;">Go Home</a>
</div>
    `,
    styles: [`
/* ── Page Shell ─────────────────────────────── */
:host { display: block; background: #1A322D; min-height: 100vh; }

/* ── Loading ─────────────────────────────────── */
.cvr-os-loading {
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh;
}
.cvr-os-spinner {
  display: inline-block; width: 36px; height: 36px;
  border: 3px solid rgba(65,133,118,0.2);
  border-top-color: #418576; border-radius: 50%;
  animation: cvr-spin 0.8s linear infinite;
}
@keyframes cvr-spin { to { transform: rotate(360deg); } }

/* ── Hero ────────────────────────────────────── */
.cvr-os-hero {
  position: relative; overflow: hidden;
  text-align: center; padding: 4rem 1rem 3.5rem;
  background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(65,133,118,0.07) 0%, transparent 70%);
  border-bottom: 1px solid rgba(65,133,118,0.08);
  margin-bottom: 3rem;
}

/* ── Confetti Particles ──────────────────────── */
.cvr-os-confetti {
  position: absolute; inset: 0;
  pointer-events: none; overflow: hidden;
}
.cvr-p {
  position: absolute; top: 45%; left: 50%;
  width: 8px; height: 8px; border-radius: 2px;
  opacity: 0;
  animation: cvr-burst 2.4s ease-out forwards;
}
.cvr-p-1  { background:#418576; animation-delay:0.9s; --tx:-120px; --ty:-140px; --r:45deg; }
.cvr-p-2  { background:#E8C96B; width:6px; height:12px; animation-delay:0.95s; --tx:130px; --ty:-120px; --r:-30deg; }
.cvr-p-3  { background:#FFF7E4; border-radius:50%; animation-delay:1.0s; --tx:-90px; --ty:-180px; --r:0deg; }
.cvr-p-4  { background:#418576; animation-delay:1.05s; --tx:100px; --ty:-160px; --r:60deg; }
.cvr-p-5  { background:#E8C96B; width:5px; height:10px; animation-delay:1.1s; --tx:-160px; --ty:-80px; --r:-60deg; }
.cvr-p-6  { background:rgba(65,133,118,0.7); animation-delay:1.0s; --tx:160px; --ty:-90px; --r:30deg; }
.cvr-p-7  { background:#418576; width:10px; height:5px; animation-delay:1.15s; --tx:-60px; --ty:-200px; --r:-45deg; }
.cvr-p-8  { background:#FFF7E4; border-radius:50%; width:6px; height:6px; animation-delay:1.1s; --tx:70px; --ty:-190px; --r:0deg; }
.cvr-p-9  { background:#E8C96B; animation-delay:1.2s; --tx:-180px; --ty:-110px; --r:90deg; }
.cvr-p-10 { background:#418576; animation-delay:1.05s; --tx:180px; --ty:-70px; --r:-90deg; }
.cvr-p-11 { background:rgba(255,247,228,0.8); width:4px; height:10px; animation-delay:1.15s; --tx:-40px; --ty:-210px; --r:20deg; }
.cvr-p-12 { background:#E8C96B; animation-delay:1.2s; --tx:50px; --ty:-220px; --r:-20deg; }

@keyframes cvr-burst {
  0%   { opacity: 0; transform: translate(0,0) rotate(0deg) scale(0); }
  15%  { opacity: 1; }
  70%  { opacity: 0.8; transform: translate(var(--tx), var(--ty)) rotate(var(--r)) scale(1); }
  100% { opacity: 0; transform: translate(calc(var(--tx) * 1.3), calc(var(--ty) + 80px)) rotate(calc(var(--r) * 2)) scale(0.6); }
}

/* ── SVG Checkmark ───────────────────────────── */
.cvr-os-check-wrap {
  position: relative; z-index: 1;
  display: inline-flex; margin-bottom: 1.75rem;
}
.cvr-os-check-svg { display: block; }

.cvr-check-ring {
  stroke-dasharray: 277;
  stroke-dashoffset: 277;
  animation: cvr-ring-draw 0.65s ease-out 0.3s forwards;
}
@keyframes cvr-ring-draw {
  to { stroke-dashoffset: 0; }
}

.cvr-check-path {
  stroke-dasharray: 55;
  stroke-dashoffset: 55;
  animation: cvr-check-draw 0.5s ease-out 0.9s forwards;
}
@keyframes cvr-check-draw {
  to { stroke-dashoffset: 0; }
}

/* ── Hero Text ───────────────────────────────── */
.cvr-os-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700; font-style: italic;
  color: #418576;
  margin: 0 0 0.75rem;
  opacity: 0;
  animation: cvr-fade-up 0.5s ease-out 1.3s forwards;
}
.cvr-os-subtitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9375rem;
  color: rgba(255,247,228,0.5);
  margin: 0 0 1.5rem;
  opacity: 0;
  animation: cvr-fade-up 0.5s ease-out 1.45s forwards;
}
@keyframes cvr-fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Order Number Badge ──────────────────────── */
.cvr-os-order-badge {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: rgba(65,133,118,0.1);
  border: 1px solid rgba(65,133,118,0.35);
  color: #418576;
  font-family: 'DM Sans', sans-serif;
  font-weight: 700; font-size: 0.9375rem;
  letter-spacing: 0.04em;
  padding: 0.5rem 1.25rem;
  border-radius: 99px;
  opacity: 0;
  animation: cvr-fade-up 0.5s ease-out 1.6s forwards;
}

/* ── Details Grid ────────────────────────────── */
.cvr-os-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 1.5rem;
  padding-bottom: 5rem;
  align-items: start;
}
@media (max-width: 991px) {
  .cvr-os-grid { grid-template-columns: 1fr; }
}

/* ── Cards ───────────────────────────────────── */
.cvr-os-card {
  background: #1A322D;
  border: 1px solid rgba(65,133,118,0.12);
  border-radius: 4px;
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}
.cvr-os-card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1rem; font-weight: 600;
  color: #FFF7E4;
  margin: 0 0 1.25rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid rgba(65,133,118,0.1);
}

/* Items list */
.cvr-os-items-list { display: flex; flex-direction: column; gap: 0; }
.cvr-os-item {
  display: flex; align-items: baseline; gap: 0.5rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid rgba(255,247,228,0.05);
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
}
.cvr-os-item:last-child { border-bottom: none; }
.cvr-os-item-name { flex: 1; color: rgba(255,247,228,0.75); }
.cvr-os-item-qty { color: rgba(255,247,228,0.35); font-size: 0.75rem; flex-shrink: 0; }
.cvr-os-item-total { color: #FFF7E4; font-weight: 600; flex-shrink: 0; }

/* Delivery grid */
.cvr-os-delivery-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
}
@media (max-width: 575px) {
  .cvr-os-delivery-grid { grid-template-columns: 1fr; }
}
.cvr-os-label {
  font-family: 'DM Sans', sans-serif; font-size: 0.6875rem;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: rgba(255,247,228,0.3); margin: 0 0 0.3rem;
}
.cvr-os-val-strong {
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
  font-weight: 600; color: rgba(255,247,228,0.85); margin: 0 0 0.2rem;
}
.cvr-os-val {
  font-family: 'DM Sans', sans-serif; font-size: 0.8125rem;
  color: rgba(255,247,228,0.45); margin: 0 0 0.15rem;
}

/* Summary rows */
.cvr-os-row {
  display: flex; justify-content: space-between;
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
  color: rgba(255,247,228,0.5); margin-bottom: 0.625rem;
}
.cvr-os-row--discount { color: #22c55e; }
.cvr-free-tag {
  background: rgba(34,197,94,0.12); color: #22c55e;
  font-size: 0.625rem; font-weight: 700;
  padding: 0.1rem 0.4rem; border-radius: 99px; letter-spacing: 0.07em;
}
.cvr-os-total-row {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 0.875rem; margin-top: 0.375rem;
  border-top: 1px solid rgba(65,133,118,0.12);
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
  color: rgba(255,247,228,0.65); font-weight: 500;
}
.cvr-os-total-amt {
  font-family: 'Playfair Display', serif;
  font-size: 1.375rem; font-weight: 700; color: #418576;
}

/* Payment badge */
.cvr-os-payment-badge {
  display: inline-block; margin-top: 0.625rem;
  font-family: 'DM Sans', sans-serif; font-size: 0.6875rem;
  font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  padding: 0.2rem 0.6rem; border-radius: 99px;
}
.cvr-os-payment-badge--paid    { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.25); }
.cvr-os-payment-badge--pending { background: rgba(234,179,8,0.12); color: #eab308; border: 1px solid rgba(234,179,8,0.25); }

/* CTAs */
.cvr-os-btn-primary {
  display: block; width: 100%; text-align: center;
  height: 48px; line-height: 48px; padding: 0 1.5rem;
  background: linear-gradient(90deg, #418576, #E8C96B, #418576);
  background-size: 200% 100%;
  color: #1A322D; font-family: 'DM Sans', sans-serif;
  font-weight: 700; font-size: 0.875rem; letter-spacing: 0.08em;
  text-transform: uppercase; text-decoration: none;
  border-radius: 2px; margin-bottom: 0.75rem;
  transition: background-position 0.5s;
}
.cvr-os-btn-primary:hover { background-position: right center; color: #1A322D; }
.cvr-os-btn-outline {
  display: block; width: 100%; text-align: center;
  height: 48px; line-height: 46px; padding: 0 1.5rem;
  border: 1px solid rgba(255,247,228,0.35);
  color: #FFF7E4; font-family: 'DM Sans', sans-serif;
  font-weight: 600; font-size: 0.875rem; letter-spacing: 0.06em;
  text-decoration: none; border-radius: 2px;
  transition: border-color 0.2s, color 0.2s;
}
.cvr-os-btn-outline:hover { border-color: rgba(141,207,180,0.6); color: #8DCFB4; }

/* Not found */
.cvr-os-notfound {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 1rem; min-height: 60vh;
  font-family: 'Playfair Display', serif;
  color: rgba(255,247,228,0.4); font-size: 1.125rem;
  text-align: center;
}
    `]
})
export class OrderSuccessComponent implements OnInit {
    order: any = null;
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient
    ) {}

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');

        // Show the confirmation ONLY right after a successful order placement
        // (checkout sets a one-time token). A refresh or a direct/stale visit has
        // no token → send the user to the shop instead of a stale confirmation.
        if (!this.consumeJustPlacedFlag(id)) {
            this.router.navigate(['/shop'], { replaceUrl: true });
            return;
        }

        if (id) {
            this.http.get<any>(`${environment.orderApiBaseUrl}/${id}`).subscribe({
                next: (res) => {
                    this.order = res.data;
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
        } else {
            this.loading = false;
        }
    }

    /** True only on the fresh post-checkout visit; consumes the one-time token. */
    private consumeJustPlacedFlag(id: string | null): boolean {
        try {
            const flag = sessionStorage.getItem('cavero_just_placed_order');
            if (flag && (!id || flag === id)) {
                sessionStorage.removeItem('cavero_just_placed_order');
                return true;
            }
        } catch { /* sessionStorage unavailable — fall through */ }
        return false;
    }
}
