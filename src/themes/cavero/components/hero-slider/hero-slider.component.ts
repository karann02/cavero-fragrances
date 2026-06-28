import {
  Component, OnInit, OnDestroy, ElementRef, ChangeDetectorRef, NgZone, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { CaveroNavbarComponent } from '../navbar/navbar.component';

interface HeroSlide {
  image: string;
  link: string;
  isExternal: boolean;
  title: string;
}

/**
 * CaveroHeroSliderComponent — homepage masthead.
 *
 * A rounded image slider with a carved cream content card, plus the shared
 * <app-cavero-navbar> floating over it (overlay variant). The slider is a PLAIN
 * crossfade of the admin artwork — no canvas / particles / reveal effects.
 *
 * Kill-switch: reduced-motion / automated browsers get a static first slide with
 * no autoplay.
 */
@Component({
  selector: 'app-cavero-hero-slider',
  standalone: true,
  imports: [CommonModule, RouterModule, CaveroNavbarComponent],
  templateUrl: './hero-slider.component.html',
  styleUrls: ['./hero-slider.component.scss'],
})
export class CaveroHeroSliderComponent implements OnInit, OnDestroy {
  slides: HeroSlide[] = [];
  currentIndex = 0;

  // ── Masthead content ──────────────────────────────────────────────────────
  readonly eyebrow = 'Surat · India';
  readonly tagline = 'Crafting timeless Arabian fragrances';
  readonly ctaLabel = 'Shop the Collection';

  private autoTimer: any = null;
  private destroyed = false;

  private readonly API_URL = `${environment.apiGatewayBaseUrl}/api/auth/sliders/active`;
  private readonly IMG_BASE = `${environment.apiGatewayBaseUrl}`;
  private readonly FALLBACK = 'assets/images/cavero-logo.png';
  private readonly AUTO_MS = 5000;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private router: Router,
    private elRef: ElementRef
  ) {}

  /** True when motion must be suppressed (accessibility / automated tests). */
  get reduceMotion(): boolean {
    if (typeof window === 'undefined') return true;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const automated = (navigator as any).webdriver === true;
    return !!reduced || automated;
  }

  ngOnInit(): void {
    this.http.get<any>(this.API_URL).subscribe({
      next: (res) => {
        const data: any[] = res?.success && res?.data?.length ? res.data : [];
        this.slides = data.map((s: any) => {
          const link = (s?.button_url || '').trim() || '/shop';
          const img = s?.image?.startsWith('/uploads/') ? `${this.IMG_BASE}${s.image}` : (s?.image || this.FALLBACK);
          return { image: img, link, isExternal: /^https?:\/\//i.test(link), title: (s?.title || '').trim() };
        });
        this.cdr.detectChanges();
        if (!this.reduceMotion && this.slides.length > 1) {
          this.zone.runOutsideAngular(() => this.startAuto());
        }
      },
      error: (err) => console.warn('[Hero] slider API error:', err?.message),
    });
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.src.indexOf(this.FALLBACK) === -1) img.src = this.FALLBACK;
  }

  // ── Plain crossfade autoplay ────────────────────────────────────────────────
  private startAuto(): void {
    this.stopAuto();
    this.autoTimer = setInterval(() => {
      if (this.destroyed) { this.stopAuto(); return; }
      this.zone.run(() => {
        this.currentIndex = (this.currentIndex + 1) % this.slides.length;
        this.cdr.detectChanges();
      });
    }, this.AUTO_MS);
  }

  private stopAuto(): void {
    if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null; }
  }

  onSlideClick(): void {
    this.openSlide(this.slides[this.currentIndex]);
  }

  /** Jump to a specific slide via the pagination dots and reset autoplay. */
  goTo(index: number): void {
    if (index < 0 || index >= this.slides.length) return;
    this.currentIndex = index;
    if (!this.reduceMotion && this.slides.length > 1) {
      this.zone.runOutsideAngular(() => this.startAuto());
    }
  }

  /** Open a specific tile's destination (internal route or external link). */
  openSlide(slide: HeroSlide): void {
    if (!slide) return;
    if (slide.isExternal) {
      window.open(slide.link, '_blank', 'noopener');
    } else {
      this.router.navigateByUrl(slide.link);
    }
  }

  /** Smoothly scroll just past the hero to the next section. */
  scrollDown(): void {
    if (typeof window === 'undefined') return;
    const host = this.elRef?.nativeElement as HTMLElement | null;
    const heroBottom = host
      ? host.getBoundingClientRect().bottom + window.scrollY
      : window.innerHeight;
    window.scrollTo({ top: Math.max(0, heroBottom - 72), behavior: 'smooth' });
  }

  @HostListener('document:visibilitychange')
  onVisibility(): void {
    if (this.reduceMotion || this.slides.length <= 1) return;
    if (document.hidden) this.stopAuto();
    else this.zone.runOutsideAngular(() => this.startAuto());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopAuto();
  }
}
