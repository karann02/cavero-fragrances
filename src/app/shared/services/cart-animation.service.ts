import { Injectable } from '@angular/core';

/**
 * Flying "add to cart" animation. Clones the product image and animates it
 * from the source element into the navbar cart icon, then bounces the icon.
 * Pure DOM + Web Animations API — no dependencies, respects reduced-motion.
 */
@Injectable({ providedIn: 'root' })
export class CartAnimationService {

  flyToCart(imageUrl: string, sourceEl: HTMLElement | null | undefined): void {
    if (!sourceEl || typeof document === 'undefined') return;

    // Respect users who prefer reduced motion — just bounce the badge.
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = this.findCartTarget();
    if (!target) return;

    if (reduce) {
      this.bounce(target);
      return;
    }

    const s = sourceEl.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    if (!s.width || !s.height) { this.bounce(target); return; }

    // start the clone a bit smaller than the source for a refined feel
    const size = Math.min(Math.max(s.width, 64), 120);

    const fly = document.createElement('div');
    fly.className = 'cavero-fly-clone';
    fly.style.left = `${s.left + s.width / 2 - size / 2}px`;
    fly.style.top = `${s.top + s.height / 2 - size / 2}px`;
    fly.style.width = `${size}px`;
    fly.style.height = `${size}px`;
    if (imageUrl) fly.style.backgroundImage = `url('${imageUrl}')`;
    document.body.appendChild(fly);

    const startX = s.left + s.width / 2;
    const startY = s.top + s.height / 2;
    const endX = t.left + t.width / 2;
    const endY = t.top + t.height / 2;
    const dx = endX - startX;
    const dy = endY - startY;

    const anim = fly.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 70}px) scale(0.7)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.25, offset: 1 }
      ],
      { duration: 750, easing: 'cubic-bezier(0.5, 0, 0.25, 1)', fill: 'forwards' }
    );

    anim.onfinish = () => {
      fly.remove();
      this.bounce(target);
    };
    anim.oncancel = () => fly.remove();
  }

  /** Find the currently-visible navbar cart button to fly into. */
  private findCartTarget(): HTMLElement | null {
    const els = Array.from(document.querySelectorAll('.cvr-cart-btn')) as HTMLElement[];
    // prefer a button that is actually rendered (offsetParent null = display:none)
    const visible = els.find(el => el.offsetParent !== null && el.getBoundingClientRect().width > 0);
    return visible || els[0] || null;
  }

  private bounce(target: HTMLElement): void {
    target.classList.remove('cavero-cart-bounce');
    // force reflow so the animation can replay on rapid successive adds
    void target.offsetWidth;
    target.classList.add('cavero-cart-bounce');
    window.setTimeout(() => target.classList.remove('cavero-cart-bounce'), 650);
  }
}
