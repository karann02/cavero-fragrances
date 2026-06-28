import { Component, OnInit, AfterViewChecked, AfterViewInit, OnDestroy, ElementRef, ViewChild, ViewChildren, QueryList, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';

const API = `${environment.apiGatewayBaseUrl}`;
const PREVIEW_DURATION = 10; // seconds

@Component({
  selector: 'app-influencer-reels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './influencer-reels.component.html',
  styleUrls: ['./influencer-reels.component.scss']
})
export class InfluencerReelsComponent implements OnInit, AfterViewChecked, AfterViewInit, OnDestroy {
  reels: any[] = [];
  isLoading = true;
  activeReel: any = null;
  isMuted = false;
  private swiperInitialized = false;
  private previewObserver?: IntersectionObserver;
  private sectionObserver?: IntersectionObserver;
  private isSectionInView = false;
  private previewTimers = new Map<HTMLVideoElement, ReturnType<typeof setInterval>>();
  private observedVideos = new Set<HTMLVideoElement>();

  @ViewChild('reelsSection') reelsSection?: ElementRef<HTMLElement>;
  @ViewChild('swiperEl') swiperEl!: ElementRef;
  @ViewChildren('previewVideo') previewVideos!: QueryList<ElementRef<HTMLVideoElement>>;
  @ViewChild('modalVideo') modalVideo?: ElementRef<HTMLVideoElement>;

  constructor(private http: HttpClient) {}

  formatPrice(price: string | number | null | undefined): string {
    if (price === null || price === undefined || price === '') return '';
    const numeric = Number(price.toString().replace(/[^\d.]/g, ''));
    if (!Number.isFinite(numeric)) return '';
    return `\u20B9${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(numeric)}`;
  }

  getFloatingImage(reel: any): string | null {
    return reel.productImageUrl || null;
  }

  ngOnInit(): void {
    this.http.get<any>(`${API}/api/reels`).subscribe({
      next: (res) => {
        this.reels = (res.data || []).map((r: any) => ({
          ...r,
          productImageUrl: this.toAbsoluteUrl(r.product_image),
          inlineVideoUrl: this.buildVideoUrl(r),
          posterUrl: this.buildPosterUrl(r),
          displayTitle: (r.product_name || r.title || '').trim(),
          productDetailUrl: this.normalizePageUrl(r.product_detail_url),
          instagramUrl: this.normalizeInstagramUrl(r.instagram_url),
          instagramLabel: this.getInstagramLabel(r.instagram_url),
        }));
        this.isLoading = false;
        this.swiperInitialized = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  ngAfterViewInit(): void {
    this.previewVideos.changes.subscribe(() => this.syncPreviewVideos());
    this.ensureSectionObserver();
  }

  ngAfterViewChecked(): void {
    if (this.reels.length > 0 && !this.swiperInitialized) {
      this.initSwiper();
    }
    this.syncPreviewVideos();
  }

  ngOnDestroy(): void {
    this.previewObserver?.disconnect();
    this.sectionObserver?.disconnect();
    this.clearAllPreviewTimers();
    this.observedVideos.clear();
  }

  // Called on loadedmetadata — start the 10s loop
  onPreviewVideoReady(video: HTMLVideoElement | null): void {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = false; // we handle looping manually
    video.currentTime = 0;
  }

  // timeupdate as backup — reset if somehow past 10s
  onPreviewTimeUpdate(video: HTMLVideoElement): void {
    if (video.currentTime >= PREVIEW_DURATION) {
      video.currentTime = 0;
      video.play().catch(() => undefined);
    }
  }

  onPreviewVideoError(reel: any): void {
    reel.inlineVideoUrl = null;
  }

  onReelCardClick(reel: any): void {
    this.openReel(reel);
  }

  openReel(reel: any): void {
    this.isMuted = false;
    this.activeReel = { ...reel };
    document.body.style.overflow = 'hidden';
  }

  closeReel(): void {
    this.activeReel = null;
    document.body.style.overflow = '';
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.modalVideo?.nativeElement) {
      this.modalVideo.nativeElement.muted = this.isMuted;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeReel(); }

  private startPreviewTimer(video: HTMLVideoElement): void {
    // Clear any existing timer for this video
    this.clearPreviewTimer(video);
    const timer = setInterval(() => {
      if (!video.paused && !video.ended) {
        video.currentTime = 0;
        video.play().catch(() => undefined);
      }
    }, PREVIEW_DURATION * 1000);
    this.previewTimers.set(video, timer);
  }

  private clearPreviewTimer(video: HTMLVideoElement): void {
    const existing = this.previewTimers.get(video);
    if (existing) {
      clearInterval(existing);
      this.previewTimers.delete(video);
    }
  }

  private clearAllPreviewTimers(): void {
    this.previewTimers.forEach((timer) => clearInterval(timer));
    this.previewTimers.clear();
  }

  private initSwiper(): void {
    const Swiper = (window as any).Swiper;
    if (!Swiper || !this.swiperEl?.nativeElement) return;
    const el = this.swiperEl.nativeElement;
    if (el.swiper) el.swiper.destroy(true, true);
    const shouldLoop = this.reels.length > 3;
    new Swiper(el, {
      slidesPerView: 'auto',
      spaceBetween: 16,
      loop: shouldLoop,
      watchOverflow: true,
      centerInsufficientSlides: true,
      loopedSlides: shouldLoop ? Math.min(8, this.reels.length) : 0,
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
      }
    });
    this.swiperInitialized = true;
  }

  private syncPreviewVideos(): void {
    if (!this.previewVideos?.length) return;
    this.ensurePreviewObserver();
    this.ensureSectionObserver();

    this.previewVideos.forEach((videoRef) => {
      const video = videoRef.nativeElement;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = false;
      if (!this.observedVideos.has(video)) {
        this.previewObserver?.observe(video);
        this.observedVideos.add(video);
      }
    });
  }

  trackByReel(index: number, reel: any): string | number {
    return reel?.id ?? index;
  }

  hasProductDescription(reel: any): boolean {
    return !!String(reel?.product_description || '').trim();
  }

  private buildVideoUrl(reel: any): string | null {
    const resolved = this.toAbsoluteUrl(reel.resolved_reel_video_url);
    if (this.isVideoFile(resolved)) return resolved;
    const reelUrl = this.toAbsoluteUrl(reel.reel_url);
    if (this.isVideoFile(reelUrl)) return reelUrl;
    const thumbnail = this.toAbsoluteUrl(reel.thumbnail_url);
    if (this.isVideoFile(thumbnail)) return thumbnail;
    return null;
  }

  private buildPosterUrl(reel: any): string | null {
    const thumb = this.toAbsoluteUrl(reel.resolved_reel_thumbnail_url) || this.toAbsoluteUrl(reel.thumbnail_url);
    if (thumb && !this.isVideoFile(thumb)) return thumb;
    const productImg = this.toAbsoluteUrl(reel.product_image);
    if (productImg && !this.isVideoFile(productImg)) return productImg;
    return null;
  }

  private toAbsoluteUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private normalizePageUrl(url: string | null | undefined): string | null {
    const value = String(url || '').trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    return value.startsWith('/') ? value : `/${value}`;
  }

  private normalizeInstagramUrl(url: string | null | undefined): string | null {
    const value = String(url || '').trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('@')) return `https://www.instagram.com/${value.slice(1)}`;
    if (/^instagram\.com\//i.test(value) || /^www\.instagram\.com\//i.test(value)) {
      return `https://${value}`;
    }
    return value;
  }

  private getInstagramLabel(url: string | null | undefined): string {
    const value = String(url || '').trim();
    if (!value) return 'Instagram link';
    if (value.startsWith('@')) return value;

    try {
      const parsed = new URL(this.normalizeInstagramUrl(value) || value);
      return parsed.pathname.replace(/^\/+|\/+$/g, '') || parsed.hostname;
    } catch {
      return value;
    }
  }

  private isVideoFile(url: string | null | undefined): boolean {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
  }

  private ensurePreviewObserver(): void {
    if (this.previewObserver) return;
    this.previewObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (this.isSectionInView && entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            video.currentTime = 0;
            video.play().catch(() => undefined);
            this.startPreviewTimer(video);
          } else {
            video.pause();
            this.clearPreviewTimer(video);
          }
        });
      },
      { threshold: [0.15, 0.3, 0.6] }
    );
  }

  private ensureSectionObserver(): void {
    if (this.sectionObserver || !this.reelsSection?.nativeElement) return;
    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.isSectionInView = !!entry?.isIntersecting;
        if (!this.isSectionInView) {
          this.previewVideos?.forEach((v) => {
            v.nativeElement.pause();
            this.clearPreviewTimer(v.nativeElement);
          });
        } else {
          this.syncPreviewVideos();
        }
      },
      { threshold: [0.1, 0.2] }
    );
    this.sectionObserver.observe(this.reelsSection.nativeElement);
  }
}
