import { Injectable } from '@angular/core';

type ToastVariant = 'success' | 'error' | 'info' | 'celebrate';

@Injectable({
  providedIn: 'root'
})
export class FrontendNotificationService {
  private readonly STYLE_ID = 'cavero-toast-styles';
  private readonly STACK_ID = 'cavero-toast-stack';
  private readonly MAX_VISIBLE = 3;
  private readonly DURATION = 2000;

  show(message: string, variant: ToastVariant = 'info'): void {
    if (typeof document === 'undefined') return;

    this.ensureStyles();
    const stack = this.ensureStack();

    const duration = this.DURATION;
    const title = this.resolveTitle(message, variant);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const key = `${variant}|${message}`;

    // De-dupe: if an identical alert is already on screen, just restart its
    // timer instead of stacking a new copy (e.g. tapping qty-up at stock cap).
    const existing = stack.querySelector(
      `.cavero-toast[data-key="${this.cssEscape(key)}"]:not(.is-leaving)`
    ) as HTMLElement | null;
    if (existing) {
      (existing as any)._restartTimer?.();
      return;
    }

    const toast = document.createElement('div');
    toast.className = `cavero-toast cavero-toast--${variant}` + (reduce ? ' cavero-toast--noanim' : '');
    toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
    toast.setAttribute('data-key', key);
    toast.innerHTML = `
      <span class="cavero-toast__glow" aria-hidden="true"></span>
      <span class="cavero-toast__icon" aria-hidden="true">${this.iconSvg(variant)}</span>
      <div class="cavero-toast__body">
        <div class="cavero-toast__title">${this.escape(title)}</div>
        <div class="cavero-toast__msg">${this.escape(message)}</div>
      </div>
      <button class="cavero-toast__close" type="button" aria-label="Dismiss notification">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <span class="cavero-toast__progress" aria-hidden="true"></span>
    `;

    // newest on top
    stack.prepend(toast);

    // cap the stack — drop the oldest
    while (stack.children.length > this.MAX_VISIBLE) {
      const oldest = stack.lastElementChild as HTMLElement | null;
      if (!oldest) break;
      this.dismiss(oldest);
    }

    const progress = toast.querySelector('.cavero-toast__progress') as HTMLElement;
    const close = toast.querySelector('.cavero-toast__close') as HTMLElement;
    close.onclick = () => this.dismiss(toast);

    if (reduce) {
      let timer = window.setTimeout(() => this.dismiss(toast), duration);
      (toast as any)._restartTimer = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => this.dismiss(toast), duration);
      };
      (toast as any)._clearTimer = () => window.clearTimeout(timer);
      return;
    }

    // drive auto-dismiss off a remaining-time timer so hover can pause it
    let remaining = duration;
    let startedAt = Date.now();
    let timer = 0;

    const startTimer = () => {
      progress.style.animation = 'none';
      // force reflow so the animation restarts cleanly when re-armed
      void progress.offsetWidth;
      progress.style.animation = `cavero-toast-progress ${remaining}ms linear forwards`;
      progress.style.animationPlayState = 'running';
      startedAt = Date.now();
      timer = window.setTimeout(() => this.dismiss(toast), remaining);
    };
    startTimer();

    toast.addEventListener('mouseenter', () => {
      window.clearTimeout(timer);
      remaining -= Date.now() - startedAt;
      progress.style.animationPlayState = 'paused';
    });
    toast.addEventListener('mouseleave', () => {
      startedAt = Date.now();
      timer = window.setTimeout(() => this.dismiss(toast), Math.max(remaining, 400));
      progress.style.animationPlayState = 'running';
    });

    (toast as any)._restartTimer = () => {
      window.clearTimeout(timer);
      remaining = duration;
      startTimer();
    };
    (toast as any)._clearTimer = () => window.clearTimeout(timer);
  }

  error(message: string): void { this.show(message, 'error'); }
  success(message: string): void { this.show(message, 'success'); }
  celebrate(message: string): void { this.show(message, 'celebrate'); }

  private dismiss(toast: HTMLElement): void {
    if (!toast || toast.classList.contains('is-leaving')) return;
    (toast as any)._clearTimer?.();
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 420);
  }

  private resolveTitle(message: string, variant: ToastVariant): string {
    const m = message.toLowerCase();
    const isLogin = /login first|sign in|sign-in|authenticate/i.test(message);
    const isStock = /stock/i.test(message);
    const isCoupon = /coupon/i.test(m);
    const isGiftBox = /gift box|your box|added to item|applied to your box|items selected/i.test(m);
    const isCart = /added to cart|cart/i.test(m);
    const isWishlist = /wishlist/i.test(m);

    if (variant === 'error') {
      return isLogin ? 'Login Required'
        : isCoupon ? 'Coupon Not Valid'
        : isStock ? 'Stock Limit Reached'
        : 'Something Needs Attention';
    }
    if (variant === 'success') {
      return isGiftBox ? 'Gift Box Updated'
        : isCart ? 'Added to Cart'
        : isWishlist ? 'Wishlist Updated'
        : 'Success';
    }
    if (variant === 'celebrate') return 'Savings Unlocked';
    return 'Quick Update';
  }

  private iconSvg(variant: ToastVariant): string {
    if (variant === 'success') {
      return `<svg class="cavero-toast__check" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17 19 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    if (variant === 'error') {
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 6.5v7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.4" fill="#fff"/></svg>`;
    }
    if (variant === 'celebrate') {
      return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3.2l2.1 4.6 5 .6-3.7 3.4 1 4.9L12 18.7 7.6 16.7l1-4.9L4.9 8.4l5-.6L12 3.2z" fill="#fff"/></svg>`;
    }
    return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="1.5" fill="#fff"/><path d="M12 11v6.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`;
  }

  private cssEscape(value: string): string {
    const w = window as any;
    if (w.CSS && typeof w.CSS.escape === 'function') return w.CSS.escape(value);
    // fallback: escape characters that would break an attribute selector
    return String(value ?? '').replace(/["\\\]]/g, '\\$&');
  }

  private escape(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private ensureStack(): HTMLElement {
    let stack = document.getElementById(this.STACK_ID);
    if (!stack) {
      stack = document.createElement('div');
      stack.id = this.STACK_ID;
      stack.className = 'cavero-toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  private ensureStyles(): void {
    if (document.getElementById(this.STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = this.STYLE_ID;
    style.textContent = `
.cavero-toast-stack {
  position: fixed; top: 22px; right: 22px; z-index: 100000;
  display: flex; flex-direction: column; gap: 12px;
  width: min(400px, calc(100vw - 28px));
  pointer-events: none;
}
@media (max-width: 575.98px) {
  .cavero-toast-stack { top: 12px; right: 10px; left: 10px; width: auto; }
}

.cavero-toast {
  --cav-accent: #8DCFB4;
  --cav-grad: linear-gradient(160deg, #8DCFB4, #418576);
  --cav-glow: rgba(141,207,180,.45);
  pointer-events: auto;
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 13px;
  padding: 14px 15px;
  border-radius: 16px;
  background: linear-gradient(150deg, rgba(26,50,45,.90), rgba(15,28,22,.96));
  border: 1px solid rgba(141,207,180,.20);
  box-shadow: 0 20px 48px rgba(8,18,14,.5), 0 2px 8px rgba(8,18,14,.35), inset 0 1px 0 rgba(255,255,255,.07);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  backdrop-filter: blur(18px) saturate(150%);
  color: #FFF7E4;
  transform: translateX(118%);
  opacity: 0;
  animation: cavero-toast-in .58s cubic-bezier(.21,1.04,.3,1) forwards;
  will-change: transform, opacity;
}
.cavero-toast::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--cav-grad);
}
.cavero-toast.is-leaving { animation: cavero-toast-out .4s cubic-bezier(.4,0,1,1) forwards; }

.cavero-toast--success  { --cav-accent:#34D399; --cav-grad:linear-gradient(160deg,#4ADE9B,#0F9D6B); --cav-glow:rgba(52,211,153,.5); }
.cavero-toast--error    { --cav-accent:#FB7185; --cav-grad:linear-gradient(160deg,#FB7185,#E11D48); --cav-glow:rgba(244,63,94,.5); }
.cavero-toast--celebrate{ --cav-accent:#F4C66B; --cav-grad:linear-gradient(160deg,#F8D67E,#D9952A); --cav-glow:rgba(244,198,107,.55); }
.cavero-toast--info     { --cav-accent:#8DCFB4; --cav-grad:linear-gradient(160deg,#8DCFB4,#418576); --cav-glow:rgba(141,207,180,.45); }

/* soft moving sheen on entrance */
.cavero-toast__glow {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,.10) 48%, transparent 72%);
  transform: translateX(-120%);
  animation: cavero-toast-sheen 1.1s ease .25s 1;
}

.cavero-toast__icon {
  position: relative;
  width: 44px; height: 44px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  background: var(--cav-grad);
  box-shadow: 0 8px 20px var(--cav-glow), inset 0 1px 0 rgba(255,255,255,.3);
}
.cavero-toast__icon::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  border: 2px solid var(--cav-accent);
  animation: cavero-toast-ring 1.8s ease-out infinite;
}
.cavero-toast__check path {
  stroke-dasharray: 26; stroke-dashoffset: 26;
  animation: cavero-toast-draw .5s cubic-bezier(.65,0,.35,1) .18s forwards;
}

.cavero-toast__body { min-width: 0; }
.cavero-toast__title {
  font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 14px;
  letter-spacing: .005em; color: #FFFFFF; margin-bottom: 2px; line-height: 1.25;
}
.cavero-toast__msg {
  font-family: 'DM Sans', sans-serif; font-size: 12.5px; line-height: 1.45;
  color: rgba(255,247,228,.74); word-break: break-word;
}

.cavero-toast__close {
  align-self: flex-start;
  width: 28px; height: 28px; border-radius: 9px; border: none; cursor: pointer;
  background: rgba(255,255,255,.06); color: rgba(255,247,228,.55);
  display: flex; align-items: center; justify-content: center;
  transition: background .18s ease, color .18s ease, transform .18s ease;
}
.cavero-toast__close:hover { background: rgba(255,255,255,.16); color: #fff; transform: rotate(90deg); }

.cavero-toast__progress {
  position: absolute; left: 0; right: 0; bottom: 0; height: 3px;
  background: var(--cav-grad); transform-origin: left center;
}

@keyframes cavero-toast-in {
  0%   { transform: translateX(118%); opacity: 0; }
  60%  { opacity: 1; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes cavero-toast-out {
  0%   { transform: translateX(0) scale(1); opacity: 1; max-height: 140px; margin-bottom: 0; }
  100% { transform: translateX(118%) scale(.96); opacity: 0; max-height: 0; margin-bottom: -12px; }
}
@keyframes cavero-toast-progress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes cavero-toast-ring { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(1.45); opacity: 0; } }
@keyframes cavero-toast-draw { to { stroke-dashoffset: 0; } }
@keyframes cavero-toast-sheen { to { transform: translateX(120%); } }

.cavero-toast--noanim,
.cavero-toast--noanim .cavero-toast__glow,
.cavero-toast--noanim .cavero-toast__icon::after,
.cavero-toast--noanim .cavero-toast__check path {
  animation: none !important;
}
.cavero-toast--noanim { transform: none; opacity: 1; }
.cavero-toast--noanim .cavero-toast__check path { stroke-dashoffset: 0; }

@media (prefers-reduced-motion: reduce) {
  .cavero-toast { animation: none; transform: none; opacity: 1; }
  .cavero-toast__icon::after, .cavero-toast__glow { animation: none; }
}
`;
    document.head.appendChild(style);
  }
}
