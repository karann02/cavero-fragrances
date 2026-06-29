import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-product-detail-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail-gallery.component.html',
  styleUrl: './product-detail-gallery.component.scss'
})
export class ProductDetailGalleryComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() images: any[] = [];
  @Input() productId: string = '';
  @Input() refreshToken = 0;
  @Input() discountPercent = 0;

  readonly fallbackImage = 'assets/images/cavero-logo.png';
  resolvedImages: string[] = [];
  selectedIndex = 0;
  showAllThumbnails = false;
  @ViewChild('thumbRail') thumbRail?: ElementRef<HTMLDivElement>;
  canScrollThumbsUp = false;
  canScrollThumbsDown = false;
  readonly thumbVisibleCount = 7;

  isViewerOpen = false;
  viewerIndex = 0;
  private touchStartX = 0;
  private touchEndX = 0;
  private mainImagePointerStartX = 0;
  private mainImagePointerCurrentX = 0;
  private mainImagePointerActive = false;
  isMainImageDragging = false;
  private suppressMainImageClick = false;
  private scrollLockY = 0;
  private hiddenChromeElements: HTMLElement[] = [];
  private hiddenChromeInlineStyles = new Map<
    HTMLElement,
    {
      display: string;
      displayPriority: string;
      visibility: string;
      visibilityPriority: string;
      pointerEvents: string;
      pointerEventsPriority: string;
    }
  >();
  private readonly chromeHideClass = 'viewer-hidden-for-gallery';

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['images'] && !changes['productId'] && !changes['refreshToken']) return;

    const resetState = !!changes['images'] || !!changes['productId'];
    this.rebuildImages(resetState);
  }

  get selectedImage(): string {
    return this.resolvedImages[this.selectedIndex] || this.fallbackImage;
  }

  get visibleThumbnails(): Array<{ url: string; index: number; overflow: boolean; overflowCount: number }> {
    if (this.showAllThumbnails || this.resolvedImages.length <= 5) {
      return this.resolvedImages.map((url, index) => ({
        url,
        index,
        overflow: false,
        overflowCount: 0
      }));
    }

    return this.resolvedImages.slice(0, 5).map((url, index) => ({
      url,
      index,
      overflow: index === 4,
      overflowCount: index === 4 ? this.resolvedImages.length - 4 : 0
    }));
  }

  selectImage(index: number): void {
    if (index < 0 || index >= this.resolvedImages.length) return;
    this.selectedIndex = index;
    this.scrollActiveThumbIntoView();
  }

  showPrevImage(): void {
    if (!this.resolvedImages.length) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.resolvedImages.length) % this.resolvedImages.length;
    this.scrollActiveThumbIntoView();
  }

  showNextImage(): void {
    if (!this.resolvedImages.length) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.resolvedImages.length;
    this.scrollActiveThumbIntoView();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.rebuildImages(false), 0);
  }

  ngOnDestroy(): void {
    this.releaseViewerUiLock();
  }

  onThumbnailClick(index: number, overflow: boolean): void {
    if (overflow && !this.showAllThumbnails) {
      this.showAllThumbnails = true;
      setTimeout(() => {
        this.updateThumbScrollState();
        this.scrollActiveThumbIntoView();
        this.nudgeThumbRailForDiscovery();
      }, 0);
    }
    this.selectImage(index);
  }

  onThumbRailScroll(): void {
    this.updateThumbScrollState();
  }

  scrollThumbRail(direction: 'up' | 'down'): void {
    const rail = this.thumbRail?.nativeElement;
    if (!rail) return;

    const delta = direction === 'up' ? -210 : 210;
    rail.scrollBy({ top: delta, behavior: 'smooth' });

    setTimeout(() => this.updateThumbScrollState(), 220);
  }

  get shouldShowThumbScrollControls(): boolean {
    return this.showAllThumbnails && this.resolvedImages.length > this.thumbVisibleCount;
  }

  onMainImageError(): void {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.resolvedImages.length) {
      this.resolvedImages[this.selectedIndex] = this.fallbackImage;
    }
  }

  onThumbImageError(index: number): void {
    if (index >= 0 && index < this.resolvedImages.length) {
      this.resolvedImages[index] = this.fallbackImage;
    }
  }

  openViewer(index?: number): void {
    this.viewerIndex = typeof index === 'number' ? index : this.selectedIndex;
    this.isViewerOpen = true;
    this.applyViewerUiLock();
  }

  onMainImagePointerDown(event: PointerEvent): void {
    if (this.resolvedImages.length <= 1) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture?.(event.pointerId);
    this.mainImagePointerStartX = event.clientX || 0;
    this.mainImagePointerCurrentX = this.mainImagePointerStartX;
    this.mainImagePointerActive = true;
    this.isMainImageDragging = false;
  }

  onMainImagePointerMove(event: PointerEvent): void {
    if (!this.mainImagePointerActive) return;

    this.mainImagePointerCurrentX = event.clientX || 0;
    this.isMainImageDragging = Math.abs(this.mainImagePointerCurrentX - this.mainImagePointerStartX) >= 12;
  }

  onMainImagePointerUp(event: PointerEvent): void {
    if (!this.mainImagePointerActive || this.resolvedImages.length <= 1) return;

    const target = event.currentTarget as HTMLElement | null;
    target?.releasePointerCapture?.(event.pointerId);
    this.mainImagePointerCurrentX = event.clientX || this.mainImagePointerCurrentX;
    const delta = this.mainImagePointerCurrentX - this.mainImagePointerStartX;
    this.mainImagePointerActive = false;
    this.isMainImageDragging = false;

    if (Math.abs(delta) >= 12) {
      this.suppressMainImageClick = true;
    }

    if (Math.abs(delta) < 40) return;

    if (delta > 0) {
      this.showPrevImage();
    } else {
      this.showNextImage();
    }
  }

  onMainImagePointerCancel(event?: PointerEvent): void {
    const target = event?.currentTarget as HTMLElement | null;
    if (event) {
      target?.releasePointerCapture?.(event.pointerId);
    }
    this.mainImagePointerActive = false;
    this.isMainImageDragging = false;
  }

  onMainImageClick(): void {
    if (this.suppressMainImageClick) {
      this.suppressMainImageClick = false;
      return;
    }

    this.openViewer();
  }

  closeViewer(): void {
    this.isViewerOpen = false;
    this.releaseViewerUiLock();
  }

  showPrevInViewer(): void {
    if (!this.resolvedImages.length) return;
    this.viewerIndex = (this.viewerIndex - 1 + this.resolvedImages.length) % this.resolvedImages.length;
  }

  showNextInViewer(): void {
    if (!this.resolvedImages.length) return;
    this.viewerIndex = (this.viewerIndex + 1) % this.resolvedImages.length;
  }

  onViewerTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX || 0;
  }

  onViewerTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0]?.clientX || 0;
    const delta = this.touchEndX - this.touchStartX;

    if (Math.abs(delta) < 40) return;

    if (delta > 0) {
      this.showPrevInViewer();
    } else {
      this.showNextInViewer();
    }
  }

  private updateThumbScrollState(): void {
    const rail = this.thumbRail?.nativeElement;
    if (!rail || !this.shouldShowThumbScrollControls) {
      this.canScrollThumbsUp = false;
      this.canScrollThumbsDown = false;
      return;
    }

    const maxScrollTop = rail.scrollHeight - rail.clientHeight;
    this.canScrollThumbsUp = rail.scrollTop > 2;
    this.canScrollThumbsDown = rail.scrollTop < maxScrollTop - 2;
  }

  private scrollActiveThumbIntoView(): void {
    const rail = this.thumbRail?.nativeElement;
    if (!rail) return;

    const activeThumb = rail.querySelector<HTMLElement>(`.thumb-btn[data-thumb-index="${this.selectedIndex}"]`);
    if (!activeThumb) return;

    activeThumb.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }

  private nudgeThumbRailForDiscovery(): void {
    const rail = this.thumbRail?.nativeElement;
    if (!rail) return;
    if (typeof window === 'undefined' || window.innerWidth > 991.98) return;
    if (rail.scrollWidth <= rail.clientWidth + 2) return;

    rail.scrollBy({
      left: Math.max(80, Math.round(rail.clientWidth * 0.35)),
      behavior: 'smooth'
    });
  }

  private applyViewerUiLock(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;
    this.scrollLockY = window.scrollY || window.pageYOffset || 0;

    this.hideStorefrontChrome();

    body.classList.add('gallery-viewer-open');
    html.classList.add('gallery-viewer-open');

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${this.scrollLockY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    html.style.overflow = 'hidden';
    html.style.setProperty('overscroll-behavior', 'none');
  }

  private releaseViewerUiLock(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;

    body.classList.remove('gallery-viewer-open');
    html.classList.remove('gallery-viewer-open');

    body.style.removeProperty('overflow');
    body.style.removeProperty('position');
    body.style.removeProperty('top');
    body.style.removeProperty('left');
    body.style.removeProperty('right');
    body.style.removeProperty('width');

    html.style.removeProperty('overflow');
    html.style.removeProperty('overscroll-behavior');

    this.restoreStorefrontChrome();

    if (this.scrollLockY > 0) {
      window.scrollTo(0, this.scrollLockY);
    }
    this.scrollLockY = 0;
  }

  private hideStorefrontChrome(): void {
    this.restoreStorefrontChrome();

    const targets = document.querySelectorAll<HTMLElement>(
      'app-cavero-navbar, app-product-detail-breadcrumb, app-scroll-top-button, header.navbar-sticky'
    );

    targets.forEach((el) => {
      this.hiddenChromeInlineStyles.set(el, {
        display: el.style.getPropertyValue('display'),
        displayPriority: el.style.getPropertyPriority('display'),
        visibility: el.style.getPropertyValue('visibility'),
        visibilityPriority: el.style.getPropertyPriority('visibility'),
        pointerEvents: el.style.getPropertyValue('pointer-events'),
        pointerEventsPriority: el.style.getPropertyPriority('pointer-events')
      });

      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.classList.add(this.chromeHideClass);
      this.hiddenChromeElements.push(el);
    });
  }

  private restoreStorefrontChrome(): void {
    if (!this.hiddenChromeElements.length) return;

    this.hiddenChromeElements.forEach((el) => {
      const snapshot = this.hiddenChromeInlineStyles.get(el);

      if (snapshot) {
        if (snapshot.display) {
          el.style.setProperty('display', snapshot.display, snapshot.displayPriority || undefined);
        } else {
          el.style.removeProperty('display');
        }

        if (snapshot.visibility) {
          el.style.setProperty('visibility', snapshot.visibility, snapshot.visibilityPriority || undefined);
        } else {
          el.style.removeProperty('visibility');
        }

        if (snapshot.pointerEvents) {
          el.style.setProperty('pointer-events', snapshot.pointerEvents, snapshot.pointerEventsPriority || undefined);
        } else {
          el.style.removeProperty('pointer-events');
        }
      }

      el.classList.remove(this.chromeHideClass);
    });

    this.hiddenChromeElements = [];
    this.hiddenChromeInlineStyles.clear();
  }

  getImageUrl(image: any): string {
    if (!image) return this.fallbackImage;
    // Plain string URL
    if (typeof image === 'string') {
      if (image.startsWith('http')) return image;
      if (image.startsWith('/uploads/') || image.startsWith('uploads/')) {
        return `${environment.apiGatewayBaseUrl}/${image.replace(/^\//, '')}`;
      }
      return image;
    }
    // Object with image_url field (common API pattern)
    if (image.image_url) {
      const u = image.image_url;
      if (u.startsWith('http')) return u;
      return `${environment.apiGatewayBaseUrl}/${u.replace(/^\//, '')}`;
    }
    // Prefer an absolute (Cloudinary) URL when present
    const direct = image.url || image.secure_url || image.path;
    if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) return direct;
    // Object with filename
    if (image.filename) {
      return `${environment.apiGatewayBaseUrl}/uploads/products/${image.filename}`;
    }
    // Object with url
    if (image.url) {
      if (image.url.startsWith('http')) return image.url;
      return `${environment.apiGatewayBaseUrl}/${image.url.replace(/^\//, '')}`;
    }
    // Object with path
    if (image.path) {
      const idx = image.path.lastIndexOf('uploads');
      if (idx !== -1) {
        return `${environment.apiGatewayBaseUrl}/${image.path.slice(idx).replace(/\\/g, '/')}`;
      }
    }
    return this.fallbackImage;
  }

  trackByThumb(_: number, thumb: { index: number }): number {
    return thumb.index;
  }

  private rebuildImages(resetState: boolean): void {
    const normalizedInputs = this.normalizeImagesInput(this.images);
    const nextImages = normalizedInputs
      .map((image) => this.getImageUrl(image))
      .filter((url) => !!url);

    const deduped = Array.from(new Set(nextImages));
    const nextResolved = deduped.length ? deduped : [this.fallbackImage];
    const previousSelectedUrl = this.resolvedImages[this.selectedIndex];

    this.resolvedImages = nextResolved;

    if (resetState) {
      this.selectedIndex = 0;
      this.showAllThumbnails = false;
    } else if (previousSelectedUrl) {
      const nextSelectedIndex = this.resolvedImages.indexOf(previousSelectedUrl);
      this.selectedIndex = nextSelectedIndex >= 0
        ? nextSelectedIndex
        : Math.min(this.selectedIndex, this.resolvedImages.length - 1);
    } else {
      this.selectedIndex = Math.min(this.selectedIndex, this.resolvedImages.length - 1);
    }

    setTimeout(() => this.updateThumbScrollState(), 0);
    setTimeout(() => this.scrollActiveThumbIntoView(), 0);
  }

  private normalizeImagesInput(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [trimmed];
      }
    }

    if (value && typeof value === 'object') {
      if (Array.isArray(value.images)) {
        return value.images;
      }
      return [value];
    }

    return [];
  }
}
