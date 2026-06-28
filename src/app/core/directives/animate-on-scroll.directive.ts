import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  Renderer2
} from '@angular/core';

export type AnimationType = 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right' | 'zoom-in';

const ANIMATION_CLASS: Record<AnimationType, string> = {
  'fade-up':    'cavero-animate-fade-up',
  'fade-in':    'cavero-animate-fade-in',
  'slide-left': 'cavero-animate-slide-left',
  'slide-right':'cavero-animate-slide-right',
  'zoom-in':    'cavero-animate-zoom-in',
};

@Directive({
  selector: '[appAnimateOnScroll]',
  standalone: true
})
export class AnimateOnScrollDirective implements OnInit, OnDestroy {
  @Input() animationType: AnimationType = 'fade-up';
  @Input() delay = 0;
  @Input() staggerDelay = 0;

  private observer!: IntersectionObserver;
  private staggerTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    const native = this.el.nativeElement;
    this.renderer.setStyle(native, 'opacity', '0');
    this.renderer.setStyle(native, 'will-change', 'opacity, transform');

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const animate = () => {
            this.renderer.removeStyle(native, 'opacity');
            this.renderer.addClass(native, ANIMATION_CLASS[this.animationType]);

            if (this.staggerDelay > 0) {
              Array.from(native.children).forEach((child, i) => {
                const t = setTimeout(() => {
                  this.renderer.addClass(child, ANIMATION_CLASS[this.animationType]);
                  (child as HTMLElement).style.opacity = '';
                }, i * this.staggerDelay);
                this.staggerTimers.push(t);
              });
            }

            this.observer.unobserve(native);
          };

          if (this.delay > 0) {
            const t = setTimeout(animate, this.delay);
            this.staggerTimers.push(t);
          } else {
            animate();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    // Pre-hide stagger children
    if (this.staggerDelay > 0) {
      Array.from(native.children).forEach((child) => {
        this.renderer.setStyle(child, 'opacity', '0');
      });
    }

    this.observer.observe(native);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.staggerTimers.forEach(clearTimeout);
  }
}
