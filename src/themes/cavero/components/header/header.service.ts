import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Category } from '../../../../app/siteadmin/categories/allcategories/category.model';
import { environment } from '../../../../environments/environment';
import { CartService } from '../../../../app/landing/cart/cart.service';

import { AuthService } from '../../../../app/core/service/auth.service';

@Injectable({
  providedIn: 'root'
})
export class HeaderService {
  private readonly apiUrl = environment.authApiBaseUrl;

  private cartSubject = new BehaviorSubject<any>(this.getEmptyCart());
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  private userSubject = new BehaviorSubject<any>(this.getDefaultUser());
  private addressBookChangedSubject = new Subject<void>();
  private orderHistoryChangedSubject = new Subject<void>();

  cart$ = this.cartSubject.asObservable();
  categories$ = this.categoriesSubject.asObservable();
  user$ = this.userSubject.asObservable();
  addressBookChanged$ = this.addressBookChangedSubject.asObservable();
  orderHistoryChanged$ = this.orderHistoryChangedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    private authService: AuthService
  ) {
    this.loadInitialData();
  }

  // Load all initial data for header
  private loadInitialData(): void {
    this.loadCategories();
    this.loadCart();
    this.loadUser();
  }

  // ... (categories and cart methods remain the same) ...

  loadCategories(): void {
    this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/auth/categories/menu`).subscribe({
      next: (res) => {
        if (res.success) {
          const categories = Array.isArray(res.data) ? res.data : [];
          const visibleCategories = categories.filter((cat: any) => {
            const isActive = cat?.status === true || cat?.status === 1 || cat?.status === '1' || cat?.status === 'true';
            const sortOrder = Number(cat?.sort_order ?? 0);
            return isActive && sortOrder !== 0;
          });
          this.categoriesSubject.next(visibleCategories);
        }
      },
      error: (err) => console.error('Error loading categories:', err)
    });
  }

  getCategoriesForDropdown(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/categories/dropdown`);
  }

  loadCart(): void {
    this.cartService.cart$.subscribe(cart => {
      this.cartSubject.next(cart);
    });
  }

  updateCartItemQuantity(itemId: string, quantity: number): void {
    const cart = this.cartService.getCartValue();
    const item = cart.items.find(i => i.id === itemId);
    if (item) {
      this.cartService.updateQuantity(item.product_id, quantity);
    }
  }

  removeCartItem(itemId: string): void {
    const cart = this.cartService.getCartValue();
    const item = cart.items.find(i => i.id === itemId);
    if (item) {
      this.cartService.removeFromCart(item.product_id);
    }
  }

  // User API calls
  loadUser(): void {
    const isFrontendRestrictedRole = (roleValue: unknown): boolean => {
      const normalizedRole = String(roleValue || '').toLowerCase();
      return normalizedRole === 'superuser' || normalizedRole === 'admin';
    };

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        if (isFrontendRestrictedRole((user as any).role)) {
          this.userSubject.next(this.getDefaultUser());
          return;
        }
        this.userSubject.next({
          id: user.id || '',
          name: user.name || 'User',
          email: user.email || '',
          is_logged_in: true
        });
      } else {
        // Check if token exists in localStorage (auto-login scenario)
        const tokenUser = this.authService.getDecodeToken();
        if (tokenUser) {
          if (isFrontendRestrictedRole(tokenUser.role)) {
            this.userSubject.next(this.getDefaultUser());
            return;
          }
          this.userSubject.next({
            id: tokenUser.id,
            name: tokenUser.name || tokenUser.username,
            email: tokenUser.email,
            is_logged_in: true
          });
        } else {
          this.userSubject.next(this.getDefaultUser());
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.cartService.clearCart();
    this.userSubject.next(this.getDefaultUser());
    window.location.reload(); // Simple reload to clear state and redirect if needed
  }

  getDeliveryAddresses(): Observable<any> {
    const tokenUser = this.authService.getDecodeToken();
    if (!tokenUser) {
      return new Observable(observer => observer.next({ success: true, data: [] }));
    }
    return this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/addresses/user/${tokenUser.id}`);
  }

  notifyAddressBookChanged(): void {
    this.addressBookChangedSubject.next();
  }

  notifyOrderHistoryChanged(): void {
    this.orderHistoryChangedSubject.next();
  }

  getEmptyCart(): any {
    return {
      items: [],
      subtotal: 0,
      total_items: 0,
      delivery_fee: 0,
      total: 0,
      free_delivery_threshold: 100,
      coupon_discount: 0,
      coupon_code: null,
      coupon_id: null,
      applied_coupon: null
    };
  }

  getDefaultUser(): any {
    return {
      id: '',
      name: '',
      email: '',
      is_logged_in: false
    };
  }
}
