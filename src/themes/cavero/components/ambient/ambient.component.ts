import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;       // base alpha
  tw: number;      // twinkle phase
}

/**
 * CaveroAmbientComponent — lightweight floating "gold dust" particle field.
 *
 * Pure canvas, no external lib (~ a few KB). Sits absolutely behind hero/dark
 * sections (pointer-events:none). Auto-pauses when scrolled off-screen and is
 * fully disabled under reduced-motion / automated browsers (renders nothing).
 */
@Component({
  selector: 'app-cavero-ambient',
  standalone: true,
  template: `<canvas #canvas class="cavero-ambient-canvas" aria-hidden="true"></canvas>`,
})
export class CaveroAmbientComponent implements AfterViewInit, OnDestroy {
  /** Particle density per 100k px². Lower = sparser. */
  @Input() density = 0.05;
  /** Particle color (gold by default). */
  @Input() color = '65, 133, 118';

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private rafId: number | null = null;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private visible = true;
  private running = false;

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit(): void {
    if (this.isDisabled()) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.host.nativeElement);

    // Pause work when the section is off-screen.
    this.io = new IntersectionObserver(
      (entries) => {
        this.visible = entries[0]?.isIntersecting ?? true;
        if (this.visible) this.start();
        else this.stop();
      },
      { threshold: 0 }
    );
    this.io.observe(this.host.nativeElement);

    this.start();
  }

  private resize(): void {
    const parent = this.host.nativeElement;
    this.w = parent.clientWidth;
    this.h = parent.clientHeight;
    if (!this.w || !this.h) return;

    const canvas = this.canvasRef.nativeElement;
    canvas.width = Math.floor(this.w * this.dpr);
    canvas.height = Math.floor(this.h * this.dpr);
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const target = Math.round((this.w * this.h) / 100000 * (this.density * 100));
    const count = Math.max(18, Math.min(70, target));
    this.particles = Array.from({ length: count }, () => this.spawn());
  }

  private spawn(): Particle {
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -0.08 - Math.random() * 0.25,
      a: 0.18 + Math.random() * 0.45,
      tw: Math.random() * Math.PI * 2,
    };
  }

  private start(): void {
    if (this.running || !this.visible || !this.ctx) return;
    this.running = true;
    this.zone.runOutsideAngular(() => {
      const frame = () => {
        this.draw();
        this.rafId = requestAnimationFrame(frame);
      };
      this.rafId = requestAnimationFrame(frame);
    });
  }

  private stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.tw += 0.02;

      // wrap / recycle
      if (p.y < -10) { p.y = this.h + 10; p.x = Math.random() * this.w; }
      if (p.x < -10) p.x = this.w + 10;
      if (p.x > this.w + 10) p.x = -10;

      const alpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, `rgba(${this.color}, ${alpha})`);
      grad.addColorStop(1, `rgba(${this.color}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  private isDisabled(): boolean {
    if (typeof window === 'undefined') return true;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const automated = (navigator as any).webdriver === true;
    return !!reduced || automated;
  }

  ngOnDestroy(): void {
    this.stop();
    this.ro?.disconnect();
    this.io?.disconnect();
  }
}
