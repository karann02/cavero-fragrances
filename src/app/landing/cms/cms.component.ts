import { Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CaveroService } from '../../../themes/cavero/services/cavero.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Cavero theme
import { CaveroNavbarComponent } from '../../../themes/cavero/components/navbar/navbar.component';
import { CaveroFooterComponent } from '../../../themes/cavero/components/footer/footer.component';

// Import product-detail-specific components

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CaveroNavbarComponent,
    CaveroFooterComponent,
    
  ],
  templateUrl: './cms.component.html',
})
export class CmsComponent implements OnInit, AfterViewInit, OnDestroy {
  
  private themeLink?: HTMLLinkElement;
  private iconLink?: HTMLLinkElement;
  private swiperLink?: HTMLLinkElement;
  private scriptsLoaded = false;
  pageContent: any = null;
  loading = true;

  constructor(
    private caveroService: CaveroService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCaveroAssets();
    this.route.params.subscribe(params => {
      const pageSlug = params['slug'] || params['id'];
      this.loadCmsPage(pageSlug);
    });
  }

  loadCmsPage(slug: string): void {
    this.http.get(`${environment.authApiBaseUrl}/cms/${slug}`).subscribe({
      next: (data: any) => {
        this.pageContent = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeWhenReady();
  }

  ngOnDestroy(): void {
    this.removeDynamicAssets();
  }

  private loadCaveroAssets(): void {
    // Load CSS
    this.themeLink = document.createElement('link');
    this.themeLink.rel = 'stylesheet';
    this.themeLink.href = 'assets/cavero/css/theme.min.css';
    document.head.appendChild(this.themeLink);

    this.iconLink = document.createElement('link');
    this.iconLink.rel = 'stylesheet';
    this.iconLink.href = 'assets/cavero/icons/cavero-icons.min.css';
    document.head.appendChild(this.iconLink);

    this.swiperLink = document.createElement('link');
    this.swiperLink.rel = 'stylesheet';
    this.swiperLink.href = 'assets/cavero/vendor/swiper/swiper-bundle.min.css';
    document.head.appendChild(this.swiperLink);

    // Load JavaScript
    this.loadJavaScriptAssets().then(() => {
      this.scriptsLoaded = true;
      this.initializeCavero();
    });
  }

  private loadJavaScriptAssets(): Promise<void> {
    return new Promise((resolve) => {
      const scriptsToLoad = [
        'assets/cavero/js/theme.min.js',
        'assets/cavero/vendor/swiper/swiper-bundle.min.js',
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
    const maxWaitTime = 5000;
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
    setTimeout(() => {
      this.caveroService.initializeCavero();
    }, 300);
  }

  private removeDynamicAssets(): void {
    [this.themeLink, this.iconLink, this.swiperLink].forEach(asset => {
      if (asset && asset.parentNode) {
        asset.parentNode.removeChild(asset);
      }
    });
  }
}
