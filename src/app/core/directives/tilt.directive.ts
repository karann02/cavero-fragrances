import { Directive, ElementRef, NgZone, OnDestroy, OnInit, Renderer2 } from '@angular/core';

/**
 * appTilt — subtle 3D pointer tilt + light glare for cards.
 *
 * Adds a `.cavero-tilt-glare` child on init and rotates the host toward the
 * cursor. Disabled on touch devices, reduced-motion, and automated browsers
 * (Playwright) so it never interferes with tests or accessibility.
 */
@Directive({
  selector: '[appTilt]',
  standalone: true,
})
export class TiltDirective implements OnInit, OnDestroy {
  private readonly max = 7; // deg
  private glare?: HTMLElement;
  private rect?: DOMRect;
  private enabled = false;
  private bound: Array<() => void> = [];

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    if (this.isDisabled()) return;
    this.enabled = true;

    const host = this.el.nativeElement;
    this.renderer.addClass(host, 'cavero-tilt');

    this.glare = this.renderer.createElement('span');
    this.renderer.addClass(this.glare, 'cavero-tilt-glare');
    this.renderer.appendChild(host, this.glare);

    this.zone.runOutsideAngular(() => {
      this.bound.push(
        this.renderer.listen(host, 'pointerenter', () => this.onEnter()),
        this.renderer.listen(host, 'pointermove', (e: PointerEvent) => this.onMove(e)),
        this.renderer.listen(host, 'pointerleave', () => this.onLeave())
      );
    });
  }

  private onEnter(): void {
    this.rect = this.el.nativeElement.getBoundingClientRect();
    this.el.nativeElement.classList.add('is-tilting');
  }

  private onMove(e: PointerEvent): void {
    if (!this.rect) this.rect = this.el.nativeElement.getBoundingClientRect();
    const r = this.rect;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rx = (0.5 - py) * this.max * 2;
    const ry = (px - 0.5) * this.max * 2;
    this.el.nativeElement.style.transform =
      `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    if (this.glare) {
      this.glare.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      this.glare.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    }
  }

  private onLeave(): void {
    const host = this.el.nativeElement;
    host.classList.remove('is-tilting');
    host.style.transform = '';
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
    if (this.enabled) this.el.nativeElement.style.transform = '';
  }
}
