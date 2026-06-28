import { Component, AfterViewInit, OnDestroy, OnInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { CaveroService } from '../../themes/cavero/services/cavero.service';
import { environment } from '../../environments/environment';

import { AnimateOnScrollDirective } from '../core/directives/animate-on-scroll.directive';
import { MotionService } from '../core/services/motion.service';

// Cavero theme
import { CaveroHeroSliderComponent } from '../../themes/cavero/components/hero-slider';
import { CaveroFeaturedCategoriesComponent } from '../../themes/cavero/components/featured-categories';
import { CaveroPopularProductsComponent } from '../../themes/cavero/components/popular-products/popular-products.component';
import { CaveroSpecialProductsComponent } from '../../themes/cavero/components/special-products/special-products.component';
import { CaveroFooterComponent } from '../../themes/cavero/components/footer/footer.component';
import { InfluencerReelsComponent } from '../../themes/cavero/components/influencer-reels/influencer-reels.component';
// Import components...

const CONTACT_SETTINGS_API = `${environment.apiGatewayBaseUrl}/api/contact-settings`;
const FREE_GIFTS_ACTIVE_API = `${environment.freeGiftsApiBaseUrl}/active`;

interface HomeSeoSettings {
  seo_title: string;
  seo_keywords: string;
  seo_description: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
   imports: [
    CommonModule,
    RouterModule,
    CaveroHeroSliderComponent,
    CaveroFeaturedCategoriesComponent,
    CaveroPopularProductsComponent,
    CaveroSpecialProductsComponent,
    CaveroFooterComponent,
    InfluencerReelsComponent,
    AnimateOnScrollDirective,
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  /** Upload images (banners) are served by the backend — not bundled (angular.json ignores uploads/**) */
  readonly uploadsBase = environment.apiGatewayBaseUrl;

  // Homepage free-gift teaser — fetched from admin (Sales → Free Gifts), capped at 2 for a clean bar
  freeGifts: { name: string; min_order_value: number }[] = [];

  /** Shop-by-Notes circles — warm CSS gradients, no imagery needed */
  readonly fragranceNotes = [
    { name: 'Oud',        gradient: 'radial-gradient(circle at 30% 30%, #6B4A2A, #2A1A0E)' },
    { name: 'Amber',      gradient: 'radial-gradient(circle at 30% 30%, #E8A84C, #8B5614)' },
    { name: 'Musk',       gradient: 'radial-gradient(circle at 30% 30%, #D9CDB8, #8A7B62)' },
    { name: 'Rose',       gradient: 'radial-gradient(circle at 30% 30%, #D87C8A, #7A2E3C)' },
    { name: 'Saffron',    gradient: 'radial-gradient(circle at 30% 30%, #8DCFB4, #B8762A)' },
    { name: 'Sandalwood', gradient: 'radial-gradient(circle at 30% 30%, #C9A87C, #6B4A2A)' },
    { name: 'Vanilla',    gradient: 'radial-gradient(circle at 30% 30%, #F5E8C8, #418576)' },
    { name: 'Citrus',     gradient: 'radial-gradient(circle at 30% 30%, #E8D96A, #8B8B14)' }
  ];

  private readonly defaultSeoSettings: HomeSeoSettings = {
    seo_title: 'Cavero Fragrances — Luxury Arabian Perfumes & Oud',
    seo_keywords: 'cavero fragrances, oud perfume, attar, arabian perfume, luxury fragrance india',
    seo_description: 'Shop premium Oud, Attar and Arabian fragrances at Cavero Fragrances. Handpicked luxury scents delivered across India.'
  };

  private themeLink?: HTMLLinkElement;
  private iconLink?: HTMLLinkElement;
  private swiperLink?: HTMLLinkElement;
  private choicesLink?: HTMLLinkElement;
  private scriptsLoaded = false;

  constructor(
    private caveroService: CaveroService,
    private http: HttpClient,
    private titleService: Title,
    private metaService: Meta,
    private motion: MotionService,
    private hostRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.loadCaveroAssets();
    this.applySeoSettings(this.defaultSeoSettings);
    this.loadSeoSettings();
    this.loadFreeGifts();
  }

  /** Pull active free gifts from admin and show at most two on the teaser bar. */
  private loadFreeGifts(): void {
    this.http.get<any>(FREE_GIFTS_ACTIVE_API).subscribe({
      next: (res) => {
        const gifts = (res?.data ?? []) as { name: string; min_order_value: number }[];
        this.freeGifts = [...gifts]
          .sort((a, b) => a.min_order_value - b.min_order_value)
          .slice(0, 2);
      },
      error: () => { this.freeGifts = []; }
    });
  }

  ngAfterViewInit(): void {
    this.initializeWhenReady();
    // Boot the premium motion layer. When motion is disabled (reduced-motion /
    // automated browsers) reveal everything immediately so nothing stays hidden;
    // otherwise wait a tick for the section shells to mount before wiring GSAP.
    if (this.motion.disabled) {
      this.motion.init(this.hostRef.nativeElement);
    } else {
      setTimeout(() => this.motion.init(this.hostRef.nativeElement), 500);
    }
  }

  ngOnDestroy(): void {
    this.removeDynamicAssets();
    this.motion.destroy();
  }

  private loadCaveroAssets(): void {
    // Load CSS — only assets that actually exist
    this.themeLink = this.appendLink('assets/cavero/css/theme.min.css');
    this.iconLink  = this.appendLink('assets/cavero/icons/cavero-icons.min.css');
    this.swiperLink = this.appendLink('assets/cavero/vendor/swiper/swiper-bundle.min.css');
    this.choicesLink = this.appendLink('assets/cavero/vendor/choices.js/public/assets/styles/choices.min.css');
    // simplebar & nouislider CSS skipped — vendor files not present

    // Load JavaScript
    this.loadJavaScriptAssets().then(() => {
      this.scriptsLoaded = true;
      this.initializeCavero();
    });
  }

  private appendLink(href: string): HTMLLinkElement {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return link;
  }

  private loadJavaScriptAssets(): Promise<void> {
    return new Promise((resolve) => {
      const scriptsToLoad = [
        'assets/cavero/vendor/swiper/swiper-bundle.min.js',
        'assets/cavero/js/theme.min.js',
        'assets/cavero/vendor/choices.js/public/assets/scripts/choices.min.js',
        // simplebar & nouislider JS skipped — vendor files not present
      ];

      this.loadScriptsSequentially(scriptsToLoad, resolve);
    });
  }

  private loadScriptsSequentially(scripts: string[], callback: () => void): void {
    let index = 0;

    const loadNextScript = () => {
      if (index >= scripts.length) {
        callback();
        return;
      }

      const script = document.createElement('script');
      script.src = scripts[index];
      script.onload = () => {
        index++;
        loadNextScript();
      };
      script.onerror = () => {
        console.error(`Failed to load script: ${scripts[index]}`);
        index++;
        loadNextScript();
      };
      document.head.appendChild(script);
    };

    loadNextScript();
  }

  private initializeWhenReady(): void {
    const maxWaitTime = 5000; // 5 seconds max
    const startTime = Date.now();

    const checkAndInitialize = () => {
      if (this.scriptsLoaded) {
        this.initializeCavero();
        return;
      }

      if (Date.now() - startTime < maxWaitTime) {
        setTimeout(checkAndInitialize, 100);
      } else {
        console.warn('Scripts loading timeout, initializing anyway');
        this.initializeCavero();
      }
    };

    checkAndInitialize();
  }

  private initializeCavero(): void {
    // Wait for DOM to be fully ready
    setTimeout(() => {
      this.caveroService.initializeCavero();
    }, 300);
  }

  private removeDynamicAssets(): void {
    [this.themeLink, this.iconLink, this.swiperLink, this.choicesLink].forEach(asset => {
      if (asset && asset.parentNode) {
        asset.parentNode.removeChild(asset);
      }
    });
  }

  private loadSeoSettings(): void {
    this.http.get<any>(CONTACT_SETTINGS_API).subscribe({
      next: (res) => {
        const data = res?.data || {};
        this.applySeoSettings({
          seo_title: (data.seo_title || '').trim() || this.defaultSeoSettings.seo_title,
          seo_keywords: (data.seo_keywords || '').trim() || this.defaultSeoSettings.seo_keywords,
          seo_description: (data.seo_description || '').trim() || this.defaultSeoSettings.seo_description
        });
      },
      error: () => {
        this.applySeoSettings(this.defaultSeoSettings);
      }
    });
  }

  private applySeoSettings(seo: HomeSeoSettings): void {
    this.titleService.setTitle(seo.seo_title);
    this.metaService.updateTag({ name: 'description', content: seo.seo_description });
    this.metaService.updateTag({ name: 'keywords', content: seo.seo_keywords });
    this.metaService.updateTag({ property: 'og:title', content: seo.seo_title });
    this.metaService.updateTag({ property: 'og:description', content: seo.seo_description });
    this.metaService.updateTag({ name: 'twitter:title', content: seo.seo_title });
    this.metaService.updateTag({ name: 'twitter:description', content: seo.seo_description });
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary' });
  }
}

