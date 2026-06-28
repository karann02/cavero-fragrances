import { Directive, ElementRef, Input, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';

/**
 * appMagnetic — cursor-follow "magnet" effect for CTA buttons/pills.
 *
 * The host gently translates toward the pointer while hovered, then springs
 * back on leave. Disabled on touch / reduced-motion / automated browsers.
 */
@Directive({
  selector: '[appMagnetic]',
  standalone: true,
})
export class MagneticDirective implements OnInit, OnDestroy {
  /** Pull strength (0–1). Higher = follows the cursor more. */
  @Input() magneticStrength = 0.35;

  private bound: Array<() => void> = [];
  private rect?: DOMRect;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    if (this.isDisabled()) return;
    const host = this.el.nativeElement;
    this.renderer.addClass(host, 'cavero-magnetic');

    this.zone.runOutsideAngular(() => {
      this.bound.push(
        this.renderer.listen(host, 'pointerenter', () => {
          this.rect = host.getBoundingClientRect();
        }),
        this.renderer.listen(host, 'pointermove', (e: PointerEvent) => this.onMove(e)),
        this.renderer.listen(host, 'pointerleave', () => this.onLeave())
      );
    });
  }

  private onMove(e: PointerEvent): void {
    if (!this.rect) this.rect = this.el.nativeElement.getBoundingClientRect();
    const r = this.rect;
    const dx = (e.clientX - (r.left + r.width / 2)) * this.magneticStrength;
    const dy = (e.clientY - (r.top + r.height / 2)) * this.magneticStrength;
    this.el.nativeElement.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
  }

  private onLeave(): void {
    this.el.nativeElement.style.transform = '';
    this.rect = undefined;
  }

  private isDisabled(): boolean {
    if (typeof window === 'undefined') return true;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const automated = (navigator as any).webdriver === true;
    const touch = window.matchMedia?.('(hover: none), (pointer: coarse)').matches;
    return !!reduced || automated || !!touch;
  }

  ngOnDestroy(): void {
    this.bound.forEach((off) => off());
    this.bound = [];
    this.el.nativeElement.style.transform = '';
  }
}
