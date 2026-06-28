import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

/**
 * Lightweight animated number counter for the Atelier dashboard KPIs.
 * Sets the host element's text to the value, easing from 0 on change.
 * Honours prefers-reduced-motion / Playwright (renders final value at once).
 */
@Directive({ selector: '[cvCountUp]', standalone: true })
export class CountUpDirective implements OnChanges {
  @Input('cvCountUp') value: number | string = 0;
  @Input() cvPrefix = '';
  @Input() cvDur = 1100;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(): void { this.run(); }

  private fmt(n: number): string {
    return this.cvPrefix + Math.round(n).toLocaleString('en-IN');
  }

  private run(): void {
    const target = Number(this.value) || 0;
    const reduce =
      (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      (navigator as any).webdriver;
    if (reduce) { this.el.nativeElement.textContent = this.fmt(target); return; }

    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / this.cvDur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      this.el.nativeElement.textContent = this.fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
