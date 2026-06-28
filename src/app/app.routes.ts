import { Route } from '@angular/router';
import { MainLayoutComponent } from './layout/app-layout/main-layout/main-layout.component';
import { AuthGuard } from '@core/guard/auth.guard';
import { CustomerAuthGuard } from '@core/guard/customer-auth.guard';
import { AuthLayoutComponent } from './layout/app-layout/auth-layout/auth-layout.component';
import { Page404Component } from './authentication/page404/page404.component';
import { Role } from '@core';
import { LandingComponent } from './landing/landing.component';
import { CatalogComponent } from './landing/catalog/catalog.component';
import { ProductDetailComponent } from './landing/product-detail/product-detail.component';
import { CmsComponent } from './landing/cms/cms.component';
import { SignInComponent } from './landing/customer/signin/signin.component';
import { SignUpComponent } from './landing/customer/signup/signup.component';
import { CartComponent } from './landing/cart/cart.component';
import { CheckoutComponent } from './landing/checkout/checkout.component';
import { OrderDetailComponent } from './landing/customer/order-history/order-detail.component';
import { ProfileComponent } from './landing/customer/profile/profile.component';
import { ForgotPasswordComponent } from './authentication/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './authentication/reset-password/reset-password.component';
import { ComboComponent } from './landing/combo/combo.component';
import { OrderSuccessComponent } from './landing/order-success/order-success.component';

export const APP_ROUTE: Route[] = [
    {
        path: '',
        component: LandingComponent,
        data: {
            seoTitle: 'Cavero Fragrances — Luxury Arabian Perfumes & Oud',
            seoDescription: 'Shop premium Oud, Attar and Arabian fragrances at Cavero Fragrances. Handpicked luxury scents delivered across India.',
            seoKeywords: 'cavero fragrances, oud perfume, attar, arabian perfume, luxury fragrance india',
            robots: 'index,follow'
        }
    },
    {
        path: 'combo',
        component: ComboComponent,
        data: {
            seoTitle: 'Combo Offers | Cavero Fragrances',
            seoDescription: 'Discover curated fragrance combo offers and gift value packs at Cavero Fragrances.',
            seoKeywords: 'perfume combo, fragrance gift set, cavero combo offers, oud combo',
            robots: 'index,follow'
        }
    },
    {
        path: 'faq',
        redirectTo: 'cms/faq',
        pathMatch: 'full'
    },
    {
        path: 'categories',
        component: CatalogComponent,
        data: {
            seoTitle: 'Shop Categories | Cavero Fragrances',
            seoDescription: 'Browse Oud, Attar, EDP, EDT and Arabian fragrance categories to find your perfect scent.',
            seoKeywords: 'shop categories, oud category, attar category, fragrance collections',
            robots: 'index,follow'
        }
    },
    {
        path: 'shop',
        component: CatalogComponent,
        data: {
            seoTitle: 'Shop Perfumes Online | Cavero Fragrances',
            seoDescription: 'Explore and shop luxury Oud, Attar and Arabian fragrances from Cavero Fragrances.',
            seoKeywords: 'buy perfume online, oud online, arabian fragrance, cavero shop',
            robots: 'index,follow'
        }
    },
    {
        path: 'shop-category',
        redirectTo: 'shop',
        pathMatch: 'full'
    },
    {
        path: 'shop-category/:slug',
        component: CatalogComponent,
        data: {
            seoTitle: 'Fragrances | Cavero Fragrances',
            seoDescription: 'Explore fragrances in this category and discover your perfect scent match.',
            seoKeywords: 'fragrance category, oud, attar, cavero',
            robots: 'index,follow'
        }
    },
    {
        path: 'product/:slug',
        component: ProductDetailComponent,
        data: {
            seoTitle: 'Fragrance Details | Cavero Fragrances',
            seoDescription: 'View fragrance details, notes, concentration, and reviews at Cavero Fragrances.',
            seoKeywords: 'perfume details, oud fragrance, attar, cavero product',
            robots: 'index,follow'
        }
    },
    {
        path: 'signin',
        component: SignInComponent,
        data: {
            seoTitle: 'Sign In | Cavero Fragrances',
            seoDescription: 'Sign in to your Cavero account to manage orders and checkout faster.',
            seoKeywords: 'cavero sign in, customer login',
            robots: 'noindex,nofollow'
        }
    },
    {
        path: 'signup',
        component: SignUpComponent,
        data: {
            seoTitle: 'Create Account | Cavero Fragrances',
            seoDescription: 'Create your Cavero account for faster checkout, order tracking, and wishlist access.',
            seoKeywords: 'cavero signup, create account',
            robots: 'noindex,nofollow'
        }
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
        data: {
            seoTitle: 'Forgot Password | Cavero Fragrances',
            seoDescription: 'Reset your Cavero account password securely.',
            seoKeywords: 'forgot password, reset password',
            robots: 'noindex,nofollow'
        }
    },
    {
        path: 'reset-password',
        component: ResetPasswordComponent,
        data: {
            seoTitle: 'Reset Password | Cavero Fragrances',
            seoDescription: 'Create a new password for your Cavero Fragrances account securely.',
            seoKeywords: 'reset password, new password',
            robots: 'noindex,nofollow'
        }
    },
    {
        path: 'cart',
        component: CartComponent,
        data: {
            seoTitle: 'Shopping Cart | Cavero Fragrances',
            seoDescription: 'Review selected fragrances before checkout.',
            seoKeywords: 'shopping cart, cavero cart',
            robots: 'noindex,nofollow'
        }
    },
    {
        path: 'checkout',
        component: CheckoutComponent,
        canActivate: [CustomerAuthGuard],
        data: {
            seoTitle: 'Checkout | Cavero Fragrances',
            seoDescription: 'Secure checkout for your Cavero Fragrances order.',
            seoKeywords: 'checkout, secure payment',
            robots: 'noindex,nofollow'
        }
    },
    {
        path: 'order-success/:id',
        component: OrderSuccessComponent,
        canActivate: [CustomerAuthGuard],
        data: {
            seoTitle: 'Order Confirmed | Cavero Fragrances',
            seoDescription: 'Your Cavero Fragrances order has been placed successfully.',
            seoKeywords: 'order confirmed, order success',
            robots: 'noindex,nofollow'
        }
    },
    {
        // Old account page removed — unified into /profile (orders section).
        path: 'my-orders',
        redirectTo: 'profile',
        pathMatch: 'full'
    },
    {
        path: 'orders/:id',
        component: OrderDetailComponent,
        canActivate: [CustomerAuthGuard],
        data: {
            seoTitle: 'Order Details | Cavero Fragrances',
            seoDescription: 'View your order details and status.',
            seoKeywords: 'order details, order status',
            robots: 'noindex,nofollow'
        }
    },
    {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [CustomerAuthGuard],
        data: {
            seoTitle: 'My Profile | Cavero Fragrances',
            seoDescription: 'Manage your Cavero account profile and preferences.',
            seoKeywords: 'profile, account settings',
            robots: 'noindex,nofollow'
        }
    },
    {
        // Old account page removed — unified into /profile (wishlist section).
        path: 'wishlist',
        redirectTo: 'profile',
        pathMatch: 'full'
    },
    {
        // Old account page removed — Support Tickets unified into /profile (support section).
        path: 'my-tickets',
        redirectTo: 'profile',
        pathMatch: 'full'
    },
    {
        // Old account page removed — Razorpay handles payment at checkout; no saved-cards page.
        path: 'payment-methods',
        redirectTo: 'profile',
        pathMatch: 'full'
    },
    {
        path: 'help',
        redirectTo: 'cms/faq',
        pathMatch: 'full'
    },
    {
        path: 'cms/:slug',
        component: CmsComponent,
        data: {
            seoTitle: 'Information | Cavero Fragrances',
            seoDescription: 'Read updates and informational content from Cavero Fragrances.',
            seoKeywords: 'cms page, cavero content',
            robots: 'index,follow'
        }
    },
    {
        path: 'authentication',
        component: AuthLayoutComponent,
        data: {
            seoTitle: 'Admin Login | Cavero Fragrances',
            seoDescription: 'Admin authentication for Cavero Fragrances.',
            seoKeywords: 'admin signin, authentication',
            robots: 'noindex,nofollow'
        },
        loadChildren: () =>
            import('./authentication/auth.routes').then((m) => m.AUTH_ROUTE),
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [AuthGuard],
        data: {
            seoTitle: 'Admin Panel | Cavero Fragrances',
            seoDescription: 'Cavero Fragrances administrative dashboard.',
            seoKeywords: 'admin panel',
            robots: 'noindex,nofollow'
        },
        children: [
            {
                path: 'siteadmin',
                canActivate: [AuthGuard],
                data: { role: [Role.Superuser] },
                loadChildren: () =>
                    import('./siteadmin/siteadmin.routes').then((m) => m.SITEADMIN_ROUTE),
            },
        ],
    },
    {
        path: '**',
        component: Page404Component,
        data: {
            seoTitle: 'Page Not Found | Cavero Fragrances',
            seoDescription: 'The page you are looking for could not be found.',
            seoKeywords: '404, page not found',
            robots: 'noindex,nofollow'
        }
    },
];
