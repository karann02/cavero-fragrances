import { Route } from '@angular/router';

export const SITEADMIN_ROUTE: Route[] = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Dashboard | Cavero Fragrances' }
  },
  {
    path: 'products',
    loadComponent: () => import('./product/allproduct/allproducts.component').then(m => m.AllProductsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Products | Cavero Fragrances' }
  },
  {
    path: 'categories',
    loadComponent: () => import('./categories/allcategories/allcategories.component').then(m => m.AllCategoriesComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Categories | Cavero Fragrances' }
  },
  {
    path: 'combo',
    loadComponent: () => import('./combo/allcombos/allcombos.component').then(m => m.AllCombosComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Combos | Cavero Fragrances' }
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/allorders/allorders.component').then(m => m.AllOrdersComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Orders | Cavero Fragrances' }
  },
  {
    path: 'returns',
    loadComponent: () => import('./returns/allreturns/allreturns.component').then(m => m.AllReturnsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Returns | Cavero Fragrances' }
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/allcustomers/allcustomers.component').then(m => m.AllCustomersComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Customers | Cavero Fragrances' }
  },
  {
    path: 'coupons',
    loadComponent: () => import('./coupons/allcoupons/allcoupons.component').then(m => m.AllCouponsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Coupons | Cavero Fragrances' }
  },
  {
    path: 'reviews',
    loadComponent: () => import('./reviews/allreviews/allreviews.component').then(m => m.AllReviewsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Reviews | Cavero Fragrances' }
  },
  {
    path: 'sliders',
    loadComponent: () => import('./sliders/allsliders/allsliders.component').then(m => m.AllSlidersComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Sliders | Cavero Fragrances' }
  },
  {
    path: 'variant-types',
    loadComponent: () => import('./variant-types/allvarianttypes.component').then(m => m.AllVariantTypesComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Variant Types | Cavero Fragrances' }
  },
  {
    path: 'inventory',
    loadComponent: () => import('./variants/variants.component').then(m => m.VariantsInventoryComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Inventory Manager | Cavero Fragrances' }
  },
  {
    path: 'freegifts',
    loadComponent: () => import('./freegifts/freegifts.component').then(m => m.FreeGiftsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Free Gifts | Cavero Fragrances' }
  },
  {
    path: 'cms-pages',
    loadComponent: () => import('./cmspage/allcmspage/allcmspage.component').then(m => m.AllCmsPageComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin CMS Pages | Cavero Fragrances' }
  },
  {
    path: 'support-tickets',
    loadComponent: () => import('./support-tickets/alltickets/alltickets.component').then(m => m.AllTicketsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Support Tickets | Cavero Fragrances' }
  },
  {
    path: 'influencer-reels',
    loadComponent: () => import('./influencer-reels/influencer-reels.component').then(m => m.AdminInfluencerReelsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Influencer Reels | Cavero Fragrances' }
  },
  {
    path: 'contact-settings',
    loadComponent: () => import('./contact-settings/contact-settings.component').then(m => m.ContactSettingsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Contact Settings | Cavero Fragrances' }
  },
  {
    path: 'logo',
    loadComponent: () => import('./logo-settings/logo-settings.component').then(m => m.LogoSettingsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Logo | Cavero Fragrances' }
  },
  {
    path: 'pdf',
    loadComponent: () => import('./product/allproduct/allproducts.component').then(m => m.AllProductsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Products | Cavero Fragrances' }
  },
  {
    path: 'excel',
    loadComponent: () => import('./product/allproduct/allproducts.component').then(m => m.AllProductsComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Products | Cavero Fragrances' }
  },
  {
    path: 'change-password',
    loadComponent: () => import('./change-password/change-password.component').then(m => m.ChangePasswordComponent),
    data: { robots: 'noindex,nofollow', seoTitle: 'Change Password | Cavero Fragrances' }
  },
  {
    path: '**',
    loadComponent: () => import('../authentication/page404/page404.component').then(m => m.Page404Component),
    data: { robots: 'noindex,nofollow', seoTitle: 'Admin Page Not Found | Cavero Fragrances' }
  },
];
