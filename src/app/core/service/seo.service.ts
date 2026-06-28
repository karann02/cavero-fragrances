import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoRouteData {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  robots?: string;
  ogType?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly defaultTitle = 'Cavero Fragrances — Luxury Arabian Perfumes & Oud';
  private readonly defaultDescription =
    'Shop luxury Oud, Attar and Arabian perfumes at Cavero Fragrances. Premium fragrances crafted for those who wear their story in scent.';
  private readonly defaultKeywords =
    'cavero fragrances, oud perfume, attar, arabian perfume, luxury fragrance, india';
  private readonly defaultRobots = 'index,follow';

  constructor(
    private readonly title: Title,
    private readonly meta: Meta,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  applyRouteSeo(rootRoute: ActivatedRoute, urlAfterRedirects: string): void {
    const snapshot = this.getDeepestSnapshot(rootRoute.snapshot);
    const routeData = (snapshot.data || {}) as SeoRouteData;

    const seoTitle = this.clean(routeData.seoTitle) || this.defaultTitle;
    const seoDescription = this.clean(routeData.seoDescription) || this.defaultDescription;
    const seoKeywords = this.clean(routeData.seoKeywords) || this.defaultKeywords;
    const robots = this.clean(routeData.robots) || this.defaultRobots;
    const ogType = this.clean(routeData.ogType) || 'website';
    const canonicalUrl = this.resolveCanonicalUrl(urlAfterRedirects);

    this.title.setTitle(seoTitle);

    this.meta.updateTag({ name: 'description', content: seoDescription }, "name='description'");
    this.meta.updateTag({ name: 'keywords', content: seoKeywords }, "name='keywords'");
    this.meta.updateTag({ name: 'robots', content: robots }, "name='robots'");

    this.meta.updateTag({ property: 'og:title', content: seoTitle }, "property='og:title'");
    this.meta.updateTag(
      { property: 'og:description', content: seoDescription },
      "property='og:description'"
    );
    this.meta.updateTag({ property: 'og:type', content: ogType }, "property='og:type'");
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl }, "property='og:url'");
    this.meta.updateTag(
      { property: 'og:site_name', content: 'Cavero Fragrances' },
      "property='og:site_name'"
    );

    this.meta.updateTag({ name: 'twitter:card', content: 'summary' }, "name='twitter:card'");
    this.meta.updateTag({ name: 'twitter:title', content: seoTitle }, "name='twitter:title'");
    this.meta.updateTag(
      { name: 'twitter:description', content: seoDescription },
      "name='twitter:description'"
    );

    this.updateCanonicalTag(canonicalUrl);
  }

  private getDeepestSnapshot(snapshot: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = snapshot;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }

  private resolveCanonicalUrl(urlAfterRedirects: string): string {
    const pathOnly = (urlAfterRedirects || '/').split('?')[0].split('#')[0] || '/';
    const normalizedPath = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    const origin = this.document.location?.origin || '';
    return origin ? `${origin}${normalizedPath}` : normalizedPath;
  }

  private updateCanonicalTag(url: string): void {
    let canonicalTag = this.document.querySelector(
      "link[rel='canonical']"
    ) as HTMLLinkElement | null;

    if (!canonicalTag) {
      canonicalTag = this.document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      this.document.head.appendChild(canonicalTag);
    }

    canonicalTag.setAttribute('href', url);
  }

  private clean(value?: string): string {
    return String(value || '').trim();
  }
}
