import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { getSeoRouteParam } from '../../../../app/shared/utils/seo-url.util';

@Component({
  selector: 'app-cavero-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class CaveroFooterComponent implements OnInit {
  currentYear = new Date().getFullYear();

  readonly instagramUrl = 'https://www.instagram.com/caverofragrance';
  readonly whatsappNumber = '919274521140'; // E.164 without +
  get whatsappUrl(): string {
    return `https://wa.me/${this.whatsappNumber}`;
  }

  footerLinks = {
    categories: [] as { name: string; link: string }[],
    information: [
      { name: 'Privacy Policy',       link: '/cms/privacy-policy' },
      { name: 'Terms & Conditions',   link: '/cms/terms-and-conditions' },
      { name: 'Shipping Policy',      link: '/cms/shipping-policy' },
      { name: 'Return & Refund',      link: '/cms/return-refund-policy' },
      { name: 'Cancellation Policy',  link: '/cms/cancellation-policy' },
      { name: 'COD Policy',           link: '/cms/cod-policy' },
      { name: 'Fragrance Disclaimer', link: '/cms/fragrance-disclaimer' }
    ],
    company: [
      { name: 'About Us',   link: '/cms/about-us' },
      { name: 'Contact Us', link: '/cms/contact' },
      { name: 'FAQ',        link: '/cms/faq' }
    ]
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadFooterCategories();
  }

  private loadFooterCategories(): void {
    this.http.get<any>(environment.categoryApiBaseUrl).subscribe({
      next: (response) => {
        const categories = Array.isArray(response?.data) ? response.data : [];
        const dynamicCategories = categories
          .filter((cat: any) => cat && (cat.status === true || cat.status === 1 || cat.status === '1' || cat.status === 'true'))
          .sort((a: any, b: any) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0))
          .slice(0, 6)
          .map((cat: any) => ({
            name: String(cat.name || cat.category_name || 'Category').trim(),
            link: cat.id ? `/shop-category/${getSeoRouteParam(cat)}` : '/shop'
          }));

        this.footerLinks.categories = dynamicCategories;
      },
      error: (error) => {
        console.error('Footer category load failed:', error);
        this.footerLinks.categories = [];
      }
    });
  }
}
