import { Injectable, NgZone } from '@angular/core';
import Lenis from 'lenis';

/**
 * MotionService — the homepage premium-motion engine.
 *
 * Responsibilities:
 *  - Single kill-switch: if the user prefers reduced motion OR we are running
 *    under an automated browser (Playwright sets navigator.webdriver), ALL JS
 *    motion is disabled and the page behaves like a normal, fully-visible site.
 *  - Lazy-loads GSAP core + ScrollTrigger from CDN (keeps the Angular bundle
 *    lean — same pattern the project uses for Swiper via window.*).
 *  - Boots Lenis smooth-scroll and drives it from a single RAF loop, kept in
 *    sync with ScrollTrigger.
 *  - Scans the page for [data-reveal] and [data-parallax] hooks and wires them.
 *    Reveals fall back to an IntersectionObserver when GSAP is unavailable, so
 *    content is NEVER left invisible.
 *  - Fully tears everything down on destroy() so effects never leak to other
 *    routes (catalog / checkout / product pages keep native scroll).
 */
@Injectable({ providedIn: 'root' })
export class MotionService {
  private lenis: Lenis | null = null;
  private rafId: number | null = null;
  private gsap: any = null;
  private ScrollTrigger: any = null;
  private readyPromise: Promise<any> | null = null;
  private io: IntersectionObserver | null = null;
  private active = false;
  // True once Lenis is booted at the app root (sitewide smooth scroll). When set,
  // destroy() (called when leaving the homepage) keeps Lenis alive for other routes.
  private lenisAtAppLevel = false;
  private tickerWired = false;

  private static readonly GSAP_SRC =
    'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';
  private static readonly ST_SRC =
    'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js';

  constructor(private zone: NgZone) {}

  /** True when motion must be suppressed (accessibility or automated tests). */
  get disabled(): boolean {
    if (typeof window === 'undefined') return true;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const automated = (navigator as any).webdriver === true;
    return !!reduced || automated;
  }

  /**
   * Boot the homepage motion scene. Safe to call once from ngAfterViewInit.
   * @param root element to scan for [data-reveal]/[data-parallax] hooks.
   */
  init(root: HTMLElement | Document = document): void {
    if (this.active) return;
    this.active = true;

    // Kill-switch: ensure any pre-hidden reveal targets become visible, then bail.
    if (this.disabled) {
      this.revealAllStatic(root);
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.initLenis();
      this.whenReady()
        .then((gsap) => {
          if (gsap) {
            this.wireGsapTicker();
            this.setupReveals(root, true);
            this.setupParallax(root);
          } else {
            this.setupReveals(root, false);
          }
        })
        .catch(() => this.setupReveals(root, false));
    });
  }

  /**
   * Boot Lenis smooth-scroll for the WHOLE site (call once from the app root).
   * Idempotent and kill-switch aware. The homepage motion scene reuses this same
   * Lenis instance, and it is intentionally NOT torn down on route changes.
   */
  initSmoothScroll(): void {
    if (this.disabled || this.lenis) return;
    this.lenisAtAppLevel = true;
    this.zone.runOutsideAngular(() => this.initLenis());
  }

  /** Scroll to the top — through Lenis when active, otherwise native. */
  scrollToTop(immediate = true): void {
    if (this.lenis) {
      try {
        this.lenis.scrollTo(0, { immediate });
        return;
      } catch {
        /* fall through to native */
      }
    }
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }

  /** Resolves with the gsap object, or null if it could not be loaded. */
  whenReady(): Promise<any> {
    if (this.disabled) return Promise.resolve(null);
    if (this.gsap) return Promise.resolve(this.gsap);
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = this.loadGsap()
      .then(() => {
        const g = (window as any).gsap;
        const st = (window as any).ScrollTrigger;
        if (g && st) {
          g.registerPlugin(st);
          this.gsap = g;
          this.ScrollTrigger = st;
          return g;
        }
        return null;
      })
      .catch(() => null);

    return this.readyPromise;
  }

  private initLenis(): void {
    if (this.lenis) return; // single Lenis instance shared across the app
    try {
      this.lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
        // The admin (Atelier shell) + any CDK overlay (dialogs/drawers/select
        // panels) scroll their OWN inner containers. Exempt them from Lenis so
        // native wheel/trackpad scrolling works there (Lenis only smooths the
        // storefront window). Without this, Lenis preventDefault()s the wheel
        // and only scrollbar-drag worked in the admin.
        prevent: (node: HTMLElement) =>
          !!node?.closest?.('.cv-shell, .cdk-overlay-container, [data-lenis-prevent]'),
      });

      // If GSAP isn't ready yet, run our own RAF; once GSAP loads we hand the
      // loop to its ticker (see wireGsapTicker) and cancel this one.
      const loop = (time: number) => {
        this.lenis?.raf(time);
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    } catch {
      this.lenis = null;
    }
  }

  private wireGsapTicker(): void {
    if (!this.lenis || !this.gsap || this.tickerWired) return;
    this.tickerWired = true;
    // Hand the RAF loop to GSAP's ticker for a single, synced clock.
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lenis.on('scroll', () => this.ScrollTrigger?.update());
    this.gsap.ticker.add((time: number) => this.lenis?.raf(time * 1000));
    this.gsap.ticker.lagSmoothing(0);
  }

  /** GSAP-driven scroll reveals (or IntersectionObserver fallback). */
  private setupReveals(root: HTMLElement | Document, withGsap: boolean): void {
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!targets.length) return;

    if (withGsap && this.gsap && this.ScrollTrigger) {
      targets.forEach((el) => {
        // GSAP drives opacity/transform per-frame — drop the CSS transition so
        // the two easings don't stack.
        el.style.transition = 'none';
        const delay = parseFloat(el.getAttribute('data-reveal-delay') || '0');
        this.gsap.fromTo(
          el,
          { autoAlpha: 0, y: 36 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            delay,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 86%', once: true },
            onStart: () => el.classList.add('is-revealed'),
          }
        );
      });
      this.ScrollTrigger.refresh();
      return;
    }

    // Fallback — IntersectionObserver toggles .is-revealed (CSS handles motion).
    this.io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-revealed');
          this.io?.unobserve(e.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    targets.forEach((el) => this.io!.observe(el));
  }

  /** Scroll-linked parallax for [data-parallax] (speed = px of travel). */
  private setupParallax(root: HTMLElement | Document): void {
    if (!this.gsap || !this.ScrollTrigger) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'));
    targets.forEach((el) => {
      const amount = parseFloat(el.getAttribute('data-parallax') || '40');
      this.gsap.fromTo(
        el,
        { yPercent: -amount / 10 },
        {
          yPercent: amount / 10,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('[data-parallax-scope]') || el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    });
  }

  private revealAllStatic(root: HTMLElement | Document): void {
    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      el.classList.add('is-revealed');
    });
  }

  private loadGsap(): Promise<void> {
    return this.injectScript(MotionService.GSAP_SRC).then(() =>
      this.injectScript(MotionService.ST_SRC)
    );
  }

  private injectScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset['loaded'] === 'true') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        s.dataset['loaded'] = 'true';
        resolve();
      };
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
  }

  /**
   * Tear down the homepage scene (reveals/parallax) — call from the host's
   * ngOnDestroy. When Lenis is owned at the app level (sitewide smooth scroll),
   * it is deliberately preserved so scrolling stays smooth on every other route.
   */
  destroy(): void {
    this.active = false;
    try {
      this.ScrollTrigger?.getAll().forEach((t: any) => t.kill());
    } catch {
      /* noop */
    }
    this.io?.disconnect();
    this.io = null;

    // Keep the app-level smooth scroll running across routes.
    if (this.lenisAtAppLevel) return;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.lenis) {
      try {
        this.lenis.destroy();
      } catch {
        /* noop */
      }
      this.lenis = null;
    }
  }
}
