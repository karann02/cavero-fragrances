import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/service/auth.service';
import { FrontendNotificationService } from '../../../shared/services/frontend-notification.service';

@Injectable({
    providedIn: 'root'
})
export class WishlistService {
    private apiUrl = `${environment.authApiBaseUrl}/wishlist`;
    private wishlistSubject = new BehaviorSubject<any[]>([]);
    wishlist$ = this.wishlistSubject.asObservable();

    constructor(
        private http: HttpClient,
        private authService: AuthService,
        private notification: FrontendNotificationService
    ) {
        // Load wishlist immediately if user is logged in
        const user = this.authService.getDecodeToken();
        if (user) {
            this.loadWishlist();
        }
        
        // Also reload when user changes (login/logout)
        this.authService.currentUser$.subscribe((user: any) => {
            if (user) {
                this.loadWishlist();
            } else if (!this.authService.isAuthenticated()) {
                this.wishlistSubject.next([]);
            }
        });
    }

    loadWishlist(): void {
        const user = this.authService.getDecodeToken();
        if (!user) return;

        this.http.get<any>(`${this.apiUrl}/user/${user.id}`).subscribe({
            next: (res) => {
                const items = res.success ? res.data : [];
                this.wishlistSubject.next(items);
            },
            error: (err) => console.error('Error loading wishlist', err)
        });
    }

    addToWishlist(productId: string): void {
        const user = this.authService.getDecodeToken();
        if (!user) {
            this.notification.error('Please sign in to use wishlist.');
            return;
        }

        this.http.post<any>(this.apiUrl, { user_id: user.id, product_id: productId }).subscribe({
            next: (res) => {
                if (res.success) {
                    this.notification.success('Added to wishlist.');
                    this.loadWishlist(); // Reload
                } else {
                    this.notification.error(res.message || 'Failed to add to wishlist.');
                }
            },
            error: (err) => {
                this.notification.error('Error adding to wishlist.');
            }
        });
    }

    removeFromWishlist(id: string, showNotification: boolean = true): void {
        this.http.delete<any>(`${this.apiUrl}/${id}`).subscribe({
            next: (res) => {
                if (res.success) {
                    const current = this.wishlistSubject.value.filter(item => item.id !== id);
                    this.wishlistSubject.next(current);
                    if (showNotification) {
                        this.notification.success('Removed from wishlist.');
                    }
                }
            },
            error: () => {
                if (showNotification) {
                    this.notification.error('Error removing from wishlist.');
                }
            }
        });
    }

    isWishlisted(productId: string | number): boolean {
        return this.wishlistSubject.value.some(item => String(item.product_id) === String(productId));
    }

    getWishlistItemId(productId: string | number): string | null {
        const item = this.wishlistSubject.value.find(item => String(item.product_id) === String(productId));
        return item ? item.id : null;
    }

    toggleWishlist(productId: string | number): void {
        const user = this.authService.getDecodeToken();
        if (!user) {
            this.notification.error('Please sign in to use wishlist.');
            return;
        }
        const existingId = this.getWishlistItemId(productId);
        if (existingId) {
            this.removeFromWishlist(existingId);
        } else {
            this.addToWishlist(String(productId));
        }
    }
}
