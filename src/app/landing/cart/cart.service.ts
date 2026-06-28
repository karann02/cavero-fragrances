import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, throwError } from 'rxjs';
import { Cart, CartItem, AppliedCoupon, ComboBoxCartProduct } from '../models/cart.model';
import { environment } from '../../../environments/environment';
import { FrontendNotificationService } from '../../shared/services/frontend-notification.service';
import { AuthService } from '../../core/service/auth.service';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly GUEST_STORAGE_KEY = 'guest_cart_v2';
  private readonly USER_STORAGE_PREFIX = 'user_cart_v2_';
  private readonly LEGACY_GUEST_STORAGE_KEYS = ['guest_cart'];
  private readonly LEGACY_USER_STORAGE_PREFIXES = ['user_cart_'];
  private readonly DEFAULT_FREE_DELIVERY_THRESHOLD = 100;
  private readonly COMBO_BOX_ITEM_PREFIX = 'combo-box:';

  private cartSubject = new BehaviorSubject<Cart>(this.createEmptyCart());
  cart$ = this.cartSubject.asObservable();

  private authSub?: Subscription;
  private currentUserId: string | null = null;
  private activeStorageKey = this.GUEST_STORAGE_KEY;

  constructor(
    private notification: FrontendNotificationService,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.cleanupLegacyCartStorage();
    this.currentUserId = this.getAuthenticatedUserId();
    this.activeStorageKey = this.getStorageKeyForUser(this.currentUserId);
    this.loadCart();

    this.authSub = this.authService.currentUser$.subscribe(() => {
      this.handleAuthStateChange();
    });
  }

  getCartValue(): Cart {
    return this.cartSubject.value;
  }

  getAvailableCoupons(): Observable<any[]> {
    return this.http
      .get<any>(`${environment.authApiBaseUrl}/coupons/storefront`)
      .pipe(map((res) => (res?.success ? (res.data || []) : [])));
  }

  applyCouponCode(code: string): Observable<any> {
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      this.notification.error('Coupon not valid. Please enter a valid coupon code.');
      return throwError(() => new Error('Coupon code is required'));
    }

    if (!this.ensureAuthenticated('apply coupons')) {
      return throwError(() => new Error('Authentication required'));
    }

    const currentCart = this.getCartValue();
    if (currentCart.items.length === 0 || currentCart.subtotal <= 0) {
      this.notification.error('Add items to your cart before applying a coupon.');
      return throwError(() => new Error('Cart is empty'));
    }

    const previousCouponCode = currentCart.coupon_code || '';

    return this.http
      .post<any>(`${environment.authApiBaseUrl}/coupons/validate`, {
        code: normalizedCode,
        subtotal: currentCart.subtotal
      })
      .pipe(
        tap((res) => {
          const validatedCoupon = res?.data?.coupon;
          const discountAmount = Number(res?.data?.discount_amount || 0);

          if (!validatedCoupon) {
            throw new Error('Coupon validation failed.');
          }

          const updatedCart = { ...this.getCartValue() };
          updatedCart.coupon_discount = discountAmount;
          updatedCart.coupon_code = validatedCoupon.code;
          updatedCart.coupon_id = validatedCoupon.id;
          updatedCart.applied_coupon = this.normalizeCoupon(validatedCoupon);
          this.updateCartState(updatedCart);

          const savedAmount = Number(this.getCartValue().coupon_discount || 0);
          const isReplacing =
            !!previousCouponCode &&
            previousCouponCode !== validatedCoupon.code;

          this.notification.celebrate(
            isReplacing
              ? `Coupon switched to ${validatedCoupon.code}. You are now saving Rs. ${savedAmount}.`
              : `Coupon ${validatedCoupon.code} applied. You unlocked savings of Rs. ${savedAmount}.`
          );
        }),
        catchError((error) => {
          const rawMessage =
            error?.error?.message ||
            error?.message ||
            'Unable to apply this coupon right now.';
          const message = this.formatCouponErrorMessage(rawMessage);
          this.notification.error(message);
          return throwError(() => (error instanceof Error ? error : new Error(message)));
        })
      );
  }

  removeCoupon(showMessage = false): void {
    const currentCart = { ...this.getCartValue() };
    const removedCode = currentCart.coupon_code || currentCart.applied_coupon?.code || '';
    currentCart.coupon_discount = 0;
    currentCart.coupon_code = null;
    currentCart.coupon_id = null;
    currentCart.applied_coupon = null;
    this.updateCartState(currentCart);

    if (showMessage && removedCode) {
      this.notification.show(`Coupon ${removedCode} has been removed from your cart.`);
    }
  }

  addToCart(product: any, quantity: number = 1, showToast: boolean = true, selected_size?: string, variant_id?: number): boolean {
    const currentCart = this.cloneCart(this.getCartValue());

    // If no variant was explicitly chosen, auto-select a default one (first in-stock,
    // else first) so the cart always reflects a real variant + its price.
    if (!variant_id && Array.isArray(product.variants) && product.variants.length > 0) {
      const active = product.variants.filter((v: any) => v.is_active !== false);
      const def = active.find((v: any) => Number(v.stock) > 0) || active[0];
      if (def) {
        variant_id = Number(def.id);
        selected_size = selected_size || def.name || def.label;
      }
    }

    // Resolve price from variant if variant_id provided
    let effectivePrice = parseFloat(product.price);
    if (variant_id && Array.isArray(product.variants)) {
      const variant = product.variants.find((v: any) => Number(v.id) === Number(variant_id));
      if (variant) effectivePrice = parseFloat(variant.price);
    }

    // Match by variant_id when both sides have it; otherwise fall back to product+size match
    const existingItemIndex = currentCart.items.findIndex(item => {
      if (variant_id && item.variant_id) {
        return String(item.product_id) === String(product.id) && Number(item.variant_id) === Number(variant_id);
      }
      return String(item.product_id) === String(product.id) && (item.selected_size ?? '') === (selected_size ?? '');
    });

    const existingItem = existingItemIndex > -1 ? currentCart.items[existingItemIndex] : undefined;
    const stock = this.resolveStock(product, existingItem);
    const existingQuantity = existingItem?.quantity ?? 0;
    const nextQuantity = existingQuantity + quantity;

    if (stock !== null && stock === 0) {
      this.notification.error(`${product.name || existingItem?.product_name || 'This item'} is currently out of stock.`);
      return false;
    }

    if (stock !== null && nextQuantity > stock) {
      this.showStockWarning(product.name || existingItem?.product_name || 'This item', stock);
      return false;
    }

    if (existingItemIndex > -1) {
      currentCart.items[existingItemIndex].quantity = nextQuantity;
      currentCart.items[existingItemIndex].stock = stock ?? undefined;
      currentCart.items[existingItemIndex].total =
        currentCart.items[existingItemIndex].price * currentCart.items[existingItemIndex].quantity;
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        product_id: String(product.id),
        product_slug: product.slug ? String(product.slug) : undefined,
        product_name: selected_size ? `${product.name} (${selected_size})` : product.name,
        product_image: this.resolveImage(product),
        price: effectivePrice,
        quantity,
        stock: stock ?? undefined,
        total: effectivePrice * quantity,
        selected_size: selected_size ?? undefined,
        variant_id: variant_id ?? undefined
      };
      currentCart.items.push(newItem);
    }

    this.updateCartState(currentCart);

    if (this.isUserAuthenticated()) {
      this.syncAuthenticatedAdd(product.id, quantity, variant_id, selected_size);
    }

    if (showToast) {
      const itemName = product?.name || existingItem?.product_name || 'Item';
      if (quantity > 1) {
        this.notification.success(`${quantity} x ${itemName} added to cart.`);
      } else {
        this.notification.success(`${itemName} added to cart.`);
      }
    }

    return true;
  }

  addComboBoxToCart(payload: {
    comboId?: number;
    name: string;
    price: number;
    image?: string;
    quantity?: number;
    boxSize?: number;
    items: ComboBoxCartProduct[];
  }): boolean {
    const currentCart = this.cloneCart(this.getCartValue());
    const comboId = this.buildComboBoxItemId(payload.comboId, payload.name);
    const legacyComboId = this.buildLegacyComboBoxItemId(payload.name);
    const quantity = Math.max(1, Number(payload.quantity || 1));
    const price = Number(payload.price || 0);
    const existingItemIndex = currentCart.items.findIndex((item) =>
      item.product_id === comboId ||
      item.product_id === legacyComboId ||
      (
        Number.isInteger(Number(payload.comboId)) &&
        Number(item.combo_id || 0) === Number(payload.comboId)
      )
    );

    if (!Number.isFinite(price) || price < 0) {
      this.notification.error('Unable to add this combo box right now.');
      return false;
    }

    const comboItems = (payload.items || []).map((item) => ({
      product_id: String(item.product_id),
      product_name: String(item.product_name || 'Product'),
      product_image: item.product_image || '',
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: Number(item.price || 0)
    }));

    const nextItem: CartItem = {
      id: existingItemIndex > -1 ? currentCart.items[existingItemIndex].id : Date.now().toString(),
      product_id: comboId,
      product_name: payload.name || 'Build Your Own Box',
      product_image: payload.image || comboItems[0]?.product_image || 'assets/cavero/img/shop/grocery/01.png',
      combo_id: Number.isInteger(Number(payload.comboId)) ? Number(payload.comboId) : undefined,
      price,
      quantity,
      total: Number((price * quantity).toFixed(2)),
      item_type: 'combo_box',
      combo_box_items: comboItems,
      combo_box_size: Math.max(1, Number(payload.boxSize || comboItems.length || 1))
    };

    if (existingItemIndex > -1) {
      currentCart.items[existingItemIndex] = nextItem;
    } else {
      currentCart.items.push(nextItem);
    }

    this.updateCartState(currentCart);
    return true;
  }

  syncComboBoxCartItems(combos: Array<{ id?: number; name: string; image?: string }>): void {
    if (!Array.isArray(combos) || combos.length === 0) {
      return;
    }

    const currentCart = this.cloneCart(this.getCartValue());
    let hasChanges = false;

    currentCart.items = currentCart.items.map((item) => {
      if (!this.isComboBoxItem(item)) {
        return item;
      }

      const matchedCombo = combos.find((combo) => this.matchesPredefinedComboCartItem(item, combo));
      if (!matchedCombo) {
        return item;
      }

      const nextProductId = this.buildComboBoxItemId(matchedCombo.id, matchedCombo.name);
      const nextImage = matchedCombo.image || item.product_image;
      const nextComboId = Number.isInteger(Number(matchedCombo.id)) ? Number(matchedCombo.id) : item.combo_id;

      if (
        item.product_id === nextProductId &&
        item.product_image === nextImage &&
        Number(item.combo_id || 0) === Number(nextComboId || 0)
      ) {
        return item;
      }

      hasChanges = true;
      return {
        ...item,
        product_id: nextProductId,
        combo_id: nextComboId,
        product_image: nextImage
      };
    });

    if (hasChanges) {
      this.updateCartState(currentCart);
    }
  }

  removeFromCart(productId: string): void {
    const currentCart = this.cloneCart(this.getCartValue());
    const removedItem = currentCart.items.find(item => String(item.product_id) === String(productId));
    currentCart.items = currentCart.items.filter(item => String(item.product_id) !== String(productId));
    this.updateCartState(currentCart);

    if (this.isUserAuthenticated() && !this.isComboBoxItem(removedItem)) {
      this.syncAuthenticatedRemove(productId);
    }
  }

  updateQuantity(productId: string, quantity: number): boolean {
    const currentCart = this.cloneCart(this.getCartValue());
    const itemIndex = currentCart.items.findIndex(item => String(item.product_id) === String(productId));

    if (itemIndex === -1) return false;
    const item = currentCart.items[itemIndex];

    if (quantity <= 0) {
      this.removeFromCart(productId);
      return true;
    }

    if (this.isComboBoxItem(item)) {
      currentCart.items[itemIndex].quantity = quantity;
      currentCart.items[itemIndex].total = Number((currentCart.items[itemIndex].price * quantity).toFixed(2));
      this.updateCartState(currentCart);
      return true;
    }

    const stock = this.resolveStock(item, item);
    if (stock !== null && stock === 0) {
      this.notification.error(`${item.product_name} is currently out of stock.`);
      this.removeFromCart(productId);
      return false;
    }

    if (stock !== null && quantity > stock) {
      this.showStockWarning(item.product_name, stock);
      return false;
    }

    currentCart.items[itemIndex].quantity = quantity;
    currentCart.items[itemIndex].total = currentCart.items[itemIndex].price * quantity;
    this.updateCartState(currentCart);

    if (this.isUserAuthenticated()) {
      this.syncAuthenticatedUpdate(productId, quantity);
    }

    return true;
  }

  syncItemStock(productId: string | number, stock?: number): void {
    const normalizedStock = Number(stock);
    if (!Number.isFinite(normalizedStock) || normalizedStock < 0) return;

    const currentCart = this.cloneCart(this.getCartValue());
    const itemIndex = currentCart.items.findIndex(item => String(item.product_id) === String(productId));
    if (itemIndex === -1) return;

    const currentItem = currentCart.items[itemIndex];
    const quantityChanged = currentItem.quantity > normalizedStock;
    const stockChanged = currentItem.stock !== normalizedStock;
    if (!quantityChanged && !stockChanged) return;

    if (normalizedStock === 0) {
      currentCart.items = currentCart.items.filter(item => String(item.product_id) !== String(productId));
      this.updateCartState(currentCart);
      return;
    }

    currentCart.items[itemIndex].stock = normalizedStock;
    if (currentCart.items[itemIndex].quantity > normalizedStock) {
      currentCart.items[itemIndex].quantity = normalizedStock;
      currentCart.items[itemIndex].total = currentCart.items[itemIndex].price * normalizedStock;
    }
    this.updateCartState(currentCart);
  }

  clearCart(): void {
    this.updateCartState(this.createEmptyCart());

    if (this.isUserAuthenticated()) {
      this.syncAuthenticatedClear();
    }
  }

  private handleAuthStateChange(): void {
    const nextUserId = this.getAuthenticatedUserId();
    if (nextUserId === this.currentUserId) return;

    this.currentUserId = nextUserId;
    this.activeStorageKey = this.getStorageKeyForUser(this.currentUserId);

    if (this.currentUserId) {
      this.loadCachedCartForActiveKey();
      this.mergeGuestCartIntoAccount();
      return;
    }

    this.loadGuestCart();
  }

  private loadCart(): void {
    if (this.isUserAuthenticated()) {
      this.loadCachedCartForActiveKey();
      if (this.hasGuestItems()) {
        this.mergeGuestCartIntoAccount();
      } else {
        this.fetchServerCart();
      }
      return;
    }

    this.loadGuestCart();
  }

  private loadGuestCart(): void {
    this.activeStorageKey = this.getStorageKeyForUser(null);
    const guestCart = this.readStoredCart(this.activeStorageKey);
    this.updateCartState(guestCart, false);
    this.hydrateMissingStocks(guestCart.items);
  }

  private loadCachedCartForActiveKey(): void {
    const cachedCart = this.readStoredCart(this.activeStorageKey);
    this.updateCartState(cachedCart, false);
    this.hydrateMissingStocks(cachedCart.items);
  }

  private fetchServerCart(): void {
    this.http.get<any>(`${environment.authApiBaseUrl}/cart`).subscribe({
      next: (res) => {
        const current = this.getCartValue();
        const serverCart = this.normalizeServerCart(res?.data);
        // The server cart doesn't persist coupons — carry over any client-applied
        // coupon so it survives a refresh / navigation. updateCartState ->
        // syncCouponState re-validates and recomputes the discount on the new subtotal.
        if (current.applied_coupon) {
          serverCart.applied_coupon = current.applied_coupon;
          serverCart.coupon_code = current.coupon_code;
          serverCart.coupon_id = current.coupon_id;
        }
        this.updateCartState(this.mergeServerCartWithLocalComboItems(serverCart), false);
      },
      error: (error) => {
        console.error('Failed to load server cart', error);
      }
    });
  }

  private mergeGuestCartIntoAccount(): void {
    const guestCart = this.readStoredCart(this.GUEST_STORAGE_KEY);
    if (!guestCart.items.length) {
      this.fetchServerCart();
      return;
    }

    const payload = {
      items: guestCart.items
        .filter((item) => !this.isComboBoxItem(item))
        .map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity || 1),
        variant_id: item.variant_id ?? null,
        selected_size: item.selected_size ?? null
      }))
    };

    this.http.post<any>(`${environment.authApiBaseUrl}/cart/merge`, payload).subscribe({
      next: (res) => {
        localStorage.removeItem(this.GUEST_STORAGE_KEY);
        const mergedCart = this.mergeServerCartWithLocalComboItems(this.normalizeServerCart(res?.data), guestCart);
        this.updateCartState(mergedCart, false);
      },
      error: (error) => {
        console.error('Failed to merge guest cart', error);
        this.fetchServerCart();
      }
    });
  }

  private syncAuthenticatedAdd(productId: string | number, quantity: number, variantId?: number, selectedSize?: string): void {
    this.http.post<any>(`${environment.authApiBaseUrl}/cart/add`, {
      product_id: Number(productId),
      quantity,
      variant_id: variantId ?? null,
      selected_size: selectedSize ?? null
    }).subscribe({
      next: (res) => this.reconcileServerCart(res?.data),
      error: (error) => this.handleSyncError('Failed to sync cart add', error)
    });
  }

  private syncAuthenticatedUpdate(productId: string | number, quantity: number): void {
    this.http.put<any>(`${environment.authApiBaseUrl}/cart/update`, {
      product_id: Number(productId),
      quantity
    }).subscribe({
      next: (res) => this.reconcileServerCart(res?.data),
      error: (error) => this.handleSyncError('Failed to sync cart update', error)
    });
  }

  private syncAuthenticatedRemove(productId: string | number): void {
    this.http.delete<any>(`${environment.authApiBaseUrl}/cart/${Number(productId)}`).subscribe({
      next: (res) => this.reconcileServerCart(res?.data),
      error: (error) => this.handleSyncError('Failed to sync cart remove', error)
    });
  }

  private syncAuthenticatedClear(): void {
    this.http.delete<any>(`${environment.authApiBaseUrl}/cart`).subscribe({
      next: (res) => this.reconcileServerCart(res?.data),
      error: (error) => this.handleSyncError('Failed to sync cart clear', error)
    });
  }

  private reconcileServerCart(serverData: any): void {
    if (!this.isUserAuthenticated()) return;
    if (!serverData) {
      this.fetchServerCart();
      return;
    }
    this.updateCartState(this.mergeServerCartWithLocalComboItems(this.normalizeServerCart(serverData)), false);
  }

  private handleSyncError(context: string, error: any): void {
    console.error(context, error);
    const backendMessage = String(
      error?.error?.message ||
      error?.message ||
      ''
    ).trim();
    if (backendMessage) {
      this.notification.error(backendMessage);
    }
    if (this.isUserAuthenticated()) {
      this.fetchServerCart();
    }
  }

  private updateCartState(cart: Cart, persist = true): void {
    const normalizedCart = this.cloneCart(cart);
    normalizedCart.subtotal = this.roundMoney(
      normalizedCart.items.reduce((sum, item) => sum + Number(item.total || 0), 0)
    );
    normalizedCart.total_items = normalizedCart.items.reduce((count, item) => count + Number(item.quantity || 0), 0);
    normalizedCart.free_delivery_threshold = Number(normalizedCart.free_delivery_threshold || this.DEFAULT_FREE_DELIVERY_THRESHOLD);
    normalizedCart.delivery_fee =
      normalizedCart.subtotal > 0 && normalizedCart.subtotal <= normalizedCart.free_delivery_threshold ? 10 : 0;
    this.syncCouponState(normalizedCart);
    normalizedCart.total = this.roundMoney(
      Math.max(normalizedCart.subtotal - (normalizedCart.coupon_discount || 0), 0) + normalizedCart.delivery_fee
    );

    this.cartSubject.next({ ...normalizedCart, items: [...normalizedCart.items] });
    if (persist) {
      this.saveCart(normalizedCart);
    }
  }

  private saveCart(cart: Cart): void {
    localStorage.setItem(this.activeStorageKey, JSON.stringify(cart));
  }

  private cleanupLegacyCartStorage(): void {
    try {
      this.LEGACY_GUEST_STORAGE_KEYS.forEach((legacyKey) => {
        if (legacyKey !== this.GUEST_STORAGE_KEY) {
          localStorage.removeItem(legacyKey);
        }
      });

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;

        const isLegacyUserCart = this.LEGACY_USER_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
          && !key.startsWith(this.USER_STORAGE_PREFIX);

        if (isLegacyUserCart) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup legacy cart storage', error);
    }
  }

  private readStoredCart(storageKey: string): Cart {
    const savedCart = localStorage.getItem(storageKey);
    if (!savedCart) return this.createEmptyCart();

    try {
      return this.normalizeServerCart(JSON.parse(savedCart));
    } catch (error) {
      console.error('Failed to parse cart from storage', error);
      return this.createEmptyCart();
    }
  }

  private createEmptyCart(): Cart {
    return {
      items: [],
      subtotal: 0,
      total_items: 0,
      delivery_fee: 0,
      total: 0,
      free_delivery_threshold: this.DEFAULT_FREE_DELIVERY_THRESHOLD,
      coupon_discount: 0,
      coupon_code: null,
      coupon_id: null,
      applied_coupon: null
    };
  }

  private cloneCart(cart: Cart): Cart {
    return {
      ...cart,
      items: (cart.items || []).map((item) => ({ ...item }))
    };
  }

  private normalizeServerCart(raw: any): Cart {
    const base = this.createEmptyCart();
    const items = Array.isArray(raw?.items)
      ? raw.items.map((item: any) => ({
          id: String(item.id ?? Date.now()),
          product_id: String(item.product_id ?? ''),
          product_name: String(item.product_name || ''),
          product_image: this.normalizeImageUrl(item.product_image),
          selected_size: item.selected_size ? String(item.selected_size) : undefined,
          variant_id: item.variant_id !== undefined && item.variant_id !== null ? Number(item.variant_id) : undefined,
          combo_id: item.combo_id !== undefined && item.combo_id !== null ? Number(item.combo_id) : undefined,
          price: Number(item.price || 0),
          quantity: Math.max(1, Number(item.quantity || 1)),
          stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : undefined,
          total: Number(item.total || (Number(item.price || 0) * Number(item.quantity || 1))),
          item_type: item.item_type === 'combo_box' ? 'combo_box' : 'product',
          combo_box_items: Array.isArray(item.combo_box_items)
            ? item.combo_box_items.map((comboItem: any) => ({
                product_id: String(comboItem.product_id ?? ''),
                product_name: String(comboItem.product_name || 'Product'),
                product_image: comboItem.product_image ? this.normalizeImageUrl(comboItem.product_image) : '',
                quantity: Math.max(1, Number(comboItem.quantity || 1)),
                price: Number(comboItem.price || 0)
              }))
            : undefined,
          combo_box_size: item.combo_box_size !== undefined && item.combo_box_size !== null
            ? Math.max(1, Number(item.combo_box_size || 1))
            : undefined
        }))
      : [];

    return {
      ...base,
      ...raw,
      items,
      subtotal: Number(raw?.subtotal || items.reduce((sum: number, item: CartItem) => sum + item.total, 0)),
      total_items: Number(raw?.total_items || items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)),
      delivery_fee: Number(raw?.delivery_fee ?? base.delivery_fee),
      total: Number(raw?.total ?? 0),
      free_delivery_threshold: Number(raw?.free_delivery_threshold || base.free_delivery_threshold),
      coupon_discount: Number(raw?.coupon_discount || 0),
      coupon_code: raw?.coupon_code || null,
      coupon_id: raw?.coupon_id || null,
      applied_coupon: raw?.applied_coupon || null
    };
  }

  private getStorageKeyForUser(userId: string | null): string {
    return userId ? `${this.USER_STORAGE_PREFIX}${userId}` : this.GUEST_STORAGE_KEY;
  }

  private getAuthenticatedUserId(): string | null {
    if (!this.authService.isAuthenticated()) return null;
    const user = this.authService.getCurrentUser() || this.authService.getDecodeToken();
    return user?.id ? String(user.id) : null;
  }

  private isUserAuthenticated(): boolean {
    return !!this.getAuthenticatedUserId();
  }

  private hasGuestItems(): boolean {
    return this.readStoredCart(this.GUEST_STORAGE_KEY).items.length > 0;
  }

  private hydrateMissingStocks(items: CartItem[]): void {
    items
      .filter(item => !this.isComboBoxItem(item))
      .filter(item => item.stock === undefined || item.stock === null)
      .forEach(item => {
        this.http
          .get<any>(`${environment.authApiBaseUrl}/products/${item.product_id}`)
          .subscribe({
            next: (res) => {
              if (!res?.success || !res?.data) return;
              const stock = Number(res.data.stock ?? res.data.quantity ?? 0);
              if (!Number.isFinite(stock)) return;
              this.syncItemStock(item.product_id, stock);
            },
            error: () => {}
          });
      });
  }

  /**
   * Normalize an image URL coming from the server cart (which returns relative
   * paths like "/uploads/products/x.jpg"). Prepend the API base so the image
   * loads from the backend instead of 404-ing against the frontend origin.
   */
  private normalizeImageUrl(value: any): string {
    const raw = String(value ?? '').trim();
    if (!raw) return 'assets/images/cavero-logo.png';
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) return raw;
    if (raw.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${raw}`;
    if (raw.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${raw}`;
    // leave frontend asset paths (assets/...) and anything else untouched
    return raw;
  }

  private resolveImage(product: any): string {
    let image = 'assets/img/no-image.png';
    if (product.product_image) return product.product_image;
    if (!product.images || product.images.length === 0) return product.image || image;

    const firstImage = product.images[0];
    if (typeof firstImage === 'string') {
      if (firstImage.startsWith('/uploads/')) {
        return `${environment.apiGatewayBaseUrl}${firstImage}`;
      }
      if (firstImage.startsWith('uploads/')) {
        return `${environment.apiGatewayBaseUrl}/${firstImage}`;
      }
      return firstImage;
    }
    if (firstImage?.filename) {
      return `${environment.apiGatewayBaseUrl}/uploads/products/${firstImage.filename}`;
    }
    return product.image || image;
  }

  private resolveStock(product: any, fallback?: { stock?: number }): number | null {
    const raw =
      product?.stock ??
      product?.inventory_quantity ??
      product?.available_stock ??
      fallback?.stock;
    const stock = Number(raw);
    if (!Number.isFinite(stock) || stock < 0) return null;
    return stock;
  }

  private showStockWarning(name: string, stock: number): void {
    this.notification.error(`Only ${stock} left in stock for ${name}.`);
  }

  private normalizeCoupon(coupon: any): AppliedCoupon {
    return {
      id: Number(coupon.id),
      code: String(coupon.code || '').trim().toUpperCase(),
      type: coupon.type === 'fixed' ? 'fixed' : 'percentage',
      value: Number(coupon.value || 0),
      min_order_amount: Number(coupon.min_order_amount || 0),
      max_discount: coupon.max_discount !== null && coupon.max_discount !== undefined
        ? Number(coupon.max_discount)
        : null,
      valid_until: coupon.valid_until || null
    };
  }

  private calculateCouponDiscount(subtotal: number, coupon: AppliedCoupon | null | undefined): number {
    if (!coupon || subtotal <= 0) return 0;

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = subtotal * (Number(coupon.value || 0) / 100);
      if (coupon.max_discount !== null && coupon.max_discount !== undefined) {
        discount = Math.min(discount, Number(coupon.max_discount));
      }
    } else {
      discount = Number(coupon.value || 0);
    }

    if (!Number.isFinite(discount) || discount < 0) return 0;
    return this.roundMoney(Math.min(discount, subtotal));
  }

  private syncCouponState(cart: Cart): void {
    const coupon = cart.applied_coupon;
    if (!coupon) {
      cart.coupon_discount = 0;
      cart.coupon_code = null;
      cart.coupon_id = null;
      return;
    }

    const minOrderAmount = Number(coupon.min_order_amount || 0);
    if (cart.subtotal < minOrderAmount) {
      cart.coupon_discount = 0;
      cart.coupon_code = null;
      cart.coupon_id = null;
      cart.applied_coupon = null;
      this.notification.show(
        `Your previous coupon was removed because the cart total is now below Rs. ${this.roundMoney(minOrderAmount)}.`
      );
      return;
    }

    cart.coupon_discount = this.calculateCouponDiscount(cart.subtotal, coupon);
    cart.coupon_code = coupon.code;
    cart.coupon_id = coupon.id;
  }

  private ensureAuthenticated(actionText: string): boolean {
    if (this.authService.isAuthenticated()) return true;
    this.notification.error(`Please login first to ${actionText}.`);
    return false;
  }

  private formatCouponErrorMessage(message: string): string {
    const normalized = String(message || '').trim();
    const lowered = normalized.toLowerCase();

    if (!normalized) {
      return 'Coupon not valid. Please try another coupon code.';
    }

    if (lowered.includes('coupon code is required') || lowered.includes('please enter a coupon code')) {
      return 'Coupon not valid. Please enter a valid coupon code.';
    }

    if (
      lowered.includes('coupon not found') ||
      lowered.includes('could not be found') ||
      lowered.includes('invalid coupon')
    ) {
      return 'Coupon not valid. Please check the coupon code and try again.';
    }

    return normalized;
  }

  private roundMoney(value: number): number {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric);
  }

  private buildLegacyComboBoxItemId(name: string): string {
    return `${this.COMBO_BOX_ITEM_PREFIX}${String(name || 'build-your-own-box')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')}`;
  }

  private buildComboBoxItemId(comboId?: number, name?: string): string {
    const normalizedComboId = Number(comboId);
    if (Number.isInteger(normalizedComboId) && normalizedComboId > 0) {
      return `${this.COMBO_BOX_ITEM_PREFIX}${normalizedComboId}`;
    }

    return this.buildLegacyComboBoxItemId(String(name || 'build-your-own-box'));
  }

  private matchesPredefinedComboCartItem(
    item: CartItem,
    combo: { id?: number; name: string; image?: string }
  ): boolean {
    const normalizedComboId = Number(combo.id);
    if (Number.isInteger(normalizedComboId) && normalizedComboId > 0) {
      if (Number(item.combo_id || 0) === normalizedComboId) {
        return true;
      }

      if (item.product_id === this.buildComboBoxItemId(normalizedComboId, combo.name)) {
        return true;
      }
    }

    if (item.product_id === this.buildLegacyComboBoxItemId(combo.name)) {
      return true;
    }

    return String(item.product_name || '').trim().toLowerCase() === String(combo.name || '').trim().toLowerCase();
  }

  private isComboBoxItem(item: CartItem | undefined | null): boolean {
    return !!item && (item.item_type === 'combo_box' || String(item.product_id || '').startsWith(this.COMBO_BOX_ITEM_PREFIX));
  }

  private mergeServerCartWithLocalComboItems(serverCart: Cart, sourceCart?: Cart): Cart {
    const localCart = sourceCart || this.readStoredCart(this.activeStorageKey);
    const comboItems = (localCart.items || []).filter((item) => this.isComboBoxItem(item));

    return {
      ...serverCart,
      items: [...serverCart.items, ...comboItems]
    };
  }
}
