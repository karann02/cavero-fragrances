import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/service/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CaveroNavbarComponent } from '../../../../themes/cavero/components/navbar/navbar.component';
import { CaveroFooterComponent } from '../../../../themes/cavero/components/footer/footer.component';
import { WishlistService } from '../wishlist/wishlist.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../cart/cart.service';
import { CartAnimationService } from '../../../shared/services/cart-animation.service';
import { FrontendNotificationService } from '../../../shared/services/frontend-notification.service';
import { HeaderService } from '../../../../themes/cavero/components/header/header.service';
import { getSeoRouteParam } from '../../../shared/utils/seo-url.util';
import { InvoiceService } from '../../../shared/services/invoice.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, CaveroNavbarComponent, CaveroFooterComponent],
  template: `
<app-cavero-navbar variant="solid"></app-cavero-navbar>

<main class="content-wrapper">
  <div class="container py-5">
    <div class="row g-4 g-xl-5">

      <!-- Sidebar -->
      <aside class="account-sidebar col-lg-3">
        <!-- User info header -->
        <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
          <div class="user-avatar">{{ getInitial() }}</div>
          <div class="min-w-0">
            <div class="fw-semibold text-body mb-1">{{ user?.name || 'User' }}</div>
          </div>
        </div>

        <!-- Navigation menu -->
        <nav class="nav flex-column sidebar-nav">
          <button class="nav-link sidebar-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent w-100 text-start"
                  (click)="setActiveSection('personal-info')"
                  [class.active-nav-item]="activeSection === 'personal-info'">
            <i class="ci-user fs-5 text-body-secondary"></i>
            <span>Personal info</span>
          </button>

          <button class="nav-link sidebar-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent w-100 text-start"
                  (click)="setActiveSection('addresses')"
                  [class.active-nav-item]="activeSection === 'addresses'">
            <i class="ci-map-pin fs-5 text-body-secondary"></i>
            <span>Addresses</span>
          </button>

          <button class="nav-link sidebar-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent w-100 text-start"
                  (click)="setActiveSection('orders')"
                  [class.active-nav-item]="activeSection === 'orders'">
            <i class="ci-shopping-bag fs-5 text-body-secondary"></i>
            <span class="flex-grow-1">Orders</span>
            <span class="nav-count-badge" *ngIf="orderCount > 0">{{ orderCount }}</span>
          </button>

          <button class="nav-link sidebar-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent w-100 text-start"
                  (click)="setActiveSection('wishlist')"
                  [class.active-nav-item]="activeSection === 'wishlist'">
            <i class="ci-heart fs-5 text-body-secondary"></i>
            <span>Wishlist</span>
          </button>

          <button class="nav-link sidebar-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent w-100 text-start"
                  (click)="setActiveSection('referrals')"
                  [class.active-nav-item]="activeSection === 'referrals'">
            <i class="ci-share fs-5 text-body-secondary"></i>
            <span>Refer &amp; Earn</span>
          </button>

          <button class="nav-link sidebar-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent w-100 text-start"
                  (click)="setActiveSection('support')"
                  [class.active-nav-item]="activeSection === 'support'">
            <i class="ci-help-circle fs-5 text-body-secondary"></i>
            <span class="flex-grow-1">Support Tickets</span>
            <span class="nav-count-badge" *ngIf="supportTickets.length > 0">{{ supportTickets.length }}</span>
          </button>

          <a class="nav-link sidebar-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent"
             routerLink="/cms/contact">
            <i class="ci-help-circle fs-5 text-body-secondary"></i>
            <span>Contact</span>
          </a>

          <a class="nav-link sidebar-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent"
             routerLink="/cms/terms-and-conditions">
            <i class="ci-file-text fs-5 text-body-secondary"></i>
            <span>Terms and conditions</span>
          </a>

          <button class="nav-link sidebar-link logout-link d-flex align-items-center gap-3 px-3 py-3 text-body border-0 bg-transparent w-100 text-start mt-2"
                  (click)="logout()">
            <i class="ci-log-out fs-5 text-body-secondary"></i>
            <span>Log out</span>
          </button>
        </nav>
      </aside>

      <!-- Main content -->
      <div class="col-lg-9">
        
        <!-- Personal Info Section -->
        <div *ngIf="activeSection === 'personal-info'">
          <h1 class="h3 mb-4">Personal info</h1>

          <!-- Basic info -->
          <div class="border-bottom pb-4 mb-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h2 class="h6 mb-0">Basic info</h2>
              <button *ngIf="!editingBasic" class="btn btn-sm btn-link p-0 text-decoration-none"
                      (click)="editingBasic = true">Edit</button>
            </div>

            <!-- View mode -->
            <ng-container *ngIf="!editingBasic">
              <div class="mb-2">{{ user?.name || 'User' }}</div>
            </ng-container>

            <!-- Edit mode -->
            <ng-container *ngIf="editingBasic">
              <form [formGroup]="profileForm" (ngSubmit)="saveBasicInfo()">
                <div class="row g-3">
                  <div class="col-sm-6">
                    <label class="form-label">Full name</label>
                    <input type="text" class="form-control" formControlName="name" placeholder="Your name">
                  </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                  <button type="submit" class="btn btn-primary btn-sm"
                          [disabled]="isSubmitting">
                    {{ isSubmitting ? 'Saving...' : 'Save changes' }}
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm"
                          (click)="cancelBasic()">Cancel</button>
                </div>
              </form>
            </ng-container>
          </div>

          <!-- Contact -->
          <div class="border-bottom pb-4 mb-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h2 class="h6 mb-0">Contact</h2>
              <button *ngIf="!editingContact" class="btn btn-sm btn-link p-0 text-decoration-none"
                      (click)="editingContact = true">Edit</button>
            </div>

            <!-- View mode -->
            <ng-container *ngIf="!editingContact">
              <div class="mb-2">{{ user?.email || 'susan.gardner@email.com' }}</div>
              <div class="text-body-secondary" *ngIf="user?.phone; else noPhoneValue">
                {{ user?.phone }}
              </div>
              <ng-template #noPhoneValue>
                <div class="text-body-secondary">No phone number added</div>
              </ng-template>
            </ng-container>

            <!-- Edit mode -->
            <ng-container *ngIf="editingContact">
              <form [formGroup]="profileForm" (ngSubmit)="saveContact()">
                <div class="row g-3">
                  <div class="col-sm-6">
                    <label class="form-label">Email address</label>
                    <input type="email" class="form-control" formControlName="email" readonly>
                    <div class="form-text">Email cannot be changed.</div>
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label">Phone number</label>
                    <input type="tel" class="form-control" formControlName="phone" placeholder="Enter phone number">
                  </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                  <button type="submit" class="btn btn-primary btn-sm"
                          [disabled]="isSubmitting">
                    {{ isSubmitting ? 'Saving...' : 'Save changes' }}
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm"
                          (click)="cancelContact()">Cancel</button>
                </div>
              </form>
            </ng-container>
          </div>

          <!-- Password -->
          <div class="border-bottom pb-4 mb-4">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h2 class="h6 mb-0">Password</h2>
              <button *ngIf="!editingPassword" class="btn btn-sm btn-link p-0 text-decoration-none"
                      (click)="editingPassword = true">Edit</button>
            </div>

            <ng-container *ngIf="!editingPassword">
              <div class="text-body-secondary fs-sm " style="letter-spacing:0.15em;font-size:1.1rem;">&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;</div>
            </ng-container>

            <ng-container *ngIf="editingPassword">
              <form [formGroup]="passwordForm">
                <div class="row g-3">
                  <div class="col-sm-6">
                    <label class="form-label">Current password</label>
                    <input type="password" class="form-control" formControlName="currentPassword">
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label">New password</label>
                    <input type="password" class="form-control" formControlName="newPassword">
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label">Confirm new password</label>
                    <input type="password" class="form-control" formControlName="confirmPassword">
                  </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                  <button type="button" class="btn btn-primary btn-sm"
                          (click)="updatePassword()"
                          [disabled]="isChangingPassword">
                    {{ isChangingPassword ? 'Updating...' : 'Update password' }}
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm"
                          (click)="cancelPassword()">Cancel</button>
                </div>
              </form>
            </ng-container>
          </div>

          <!-- Delete account -->
          <div class="pb-2">
            <h2 class="h6 mb-2">Delete account</h2>
            <p class="text-body-secondary fs-sm mb-3">
              When you delete your account, your public profile will be deactivated immediately. 
              If you change your mind before the 14 days are up, sign in with your email and password, 
              and we'll send you a link to reactivate your account.
            </p>
            <button type="button" class="btn btn-sm btn-link text-danger p-0 text-decoration-none"
                    (click)="deleteAccount()">
              Delete account
            </button>
          </div>
        </div>

        <!-- Wishlist Section -->
        <div *ngIf="activeSection === 'wishlist'">
          <!-- Header -->
          <div class="d-flex align-items-center justify-content-between mb-4">
            <h1 class="h3 mb-0">Wishlist</h1>
            <button class="btn btn-primary" routerLink="/shop">
              <i class="ci-shopping-bag me-2"></i>
              Continue Shopping
            </button>
          </div>

          <!-- Products grid -->
          <div class="row row-cols-2 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 g-3 g-sm-4 profile-wishlist-grid" *ngIf="wishlistItems.length > 0; else emptyWishlist">
            <div class="col" *ngFor="let item of wishlistItems; trackBy: trackByFn">
              <div class="card product-card h-100 bg-transparent border-0 shadow-none">
                <div class="position-relative z-2">
                  <button
                    type="button"
                    class="btn btn-icon btn-sm wishlist-btn animate-pulse fs-sm position-absolute top-0 end-0 z-2 mt-1 mt-sm-2 me-1 me-sm-2"
                    (click)="removeWishlistItem(item.id)"
                    aria-label="Remove from wishlist">
                    <i class="ci-heart-filled text-danger animate-target"></i>
                  </button>

                  <a class="d-block" [routerLink]="['/product', getProductRouteParam(item)]">
                    <div class="ratio" style="--cz-aspect-ratio: calc(160 / 191 * 100%); border-radius: .75rem; overflow: hidden;">
                      <img
                        [src]="getProductImage(item.product)"
                        [alt]="item.product?.name"
                        (error)="$any($event.target).src='assets/cavero/img/shop/grocery/01.png'">
                    </div>
                  </a>

                  <div class="position-absolute w-100 start-0 bottom-0">
                    <div class="d-flex justify-content-end px-2 px-lg-3 pb-2 pb-lg-3">
                      <ng-container *ngIf="getStockCount(item.product) > 0">
                        <ng-container *ngIf="getItemQuantity(item) === 0">
                          <button
                            type="button"
                            class="add-btn btn btn-icon btn-sm rounded-3"
                            (click)="incrementQuantity(item, $event)"
                            aria-label="Add to cart">
                            <i class="ci-plus fs-sm"></i>
                          </button>
                        </ng-container>
                        <ng-container *ngIf="getItemQuantity(item) > 0">
                          <div class="count-input d-flex align-items-center justify-content-between w-100 rounded-3 px-1">
                            <button
                              type="button"
                              class="btn btn-icon btn-sm text-white border-0 bg-transparent"
                              (click)="decrementQuantity(item)"
                              aria-label="Decrease quantity">
                              <i class="ci-minus fs-sm"></i>
                            </button>
                            <span class="text-white fw-semibold fs-sm">{{ getItemQuantity(item) }}</span>
                            <button
                              type="button"
                              class="btn btn-icon btn-sm text-white border-0 bg-transparent"
                              (click)="incrementQuantity(item, $event)"
                              aria-label="Increase quantity">
                              <i class="ci-plus fs-sm"></i>
                            </button>
                          </div>
                        </ng-container>
                      </ng-container>
                    </div>
                  </div>
                </div>

                <div class="card-body pt-0 px-1 px-md-2 px-lg-3 pb-2">
                  <h3 class="product-card-name fs-sm lh-base mb-1">
                    <a class="hover-effect-underline fw-normal" [routerLink]="['/product', getProductRouteParam(item)]">
                      {{ item.product?.name }}
                    </a>
                  </h3>

                  <div class="product-card-price h6 mb-2">
                    &#8377;{{ (item.product?.price || 0) | number:'1.0-2' }}
                    <del *ngIf="(item.product?.compare_price ?? 0) > (item.product?.price ?? 0)" class="product-card-original-price fs-sm fw-normal text-body-tertiary ms-1">
                      &#8377;{{ item.product?.compare_price | number:'1.0-2' }}
                    </del>
                  </div>
                  <div *ngIf="item.product?.short_description" class="fs-xs text-body-secondary mb-1">
                    {{ item.product?.short_description }}
                  </div>
                  <div *ngIf="getProductWeightLabel(item.product)" class="fs-xs text-body-secondary mb-1">
                    {{ getProductWeightLabel(item.product) }}
                  </div>
                  <div
                    *ngIf="getStockLabel(item.product)"
                    class="fs-xs fw-bold mt-1"
                    [class.text-danger]="getStockLabel(item.product) === 'Out of stock'"
                    [class.text-warning]="getStockLabel(item.product) !== 'Out of stock'">
                    {{ getStockLabel(item.product) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ng-template #emptyWishlist>
            <div class="text-center py-5">
              <div class="mb-4">
                <i class="ci-heart display-4 text-body-tertiary"></i>
              </div>
              <h4 class="mb-2">Your wishlist is empty</h4>
              <p class="text-body-secondary mb-4">Save items you like to your wishlist and review them anytime.</p>
              <button class="btn btn-primary" routerLink="/shop">Continue Shopping</button>
            </div>
          </ng-template>
        </div>

        <!-- Orders Section -->
        <div *ngIf="activeSection === 'orders'" class="orders-panel">
          <div class="orders-panel-header d-flex align-items-center justify-content-between mb-4">
            <h1 class="h3 mb-0">Orders</h1>
            <div class="orders-panel-actions d-flex align-items-center gap-2">
              <button class="btn btn-outline-secondary orders-action-btn"
                      type="button"
                      (click)="refreshOrders()"
                      [disabled]="ordersLoading">
                <i class="ci-refresh-cw me-2"></i>
                {{ ordersLoading ? 'Refreshing...' : 'Refresh status' }}
              </button>
              <button class="btn btn-primary orders-action-btn" routerLink="/">
                <i class="ci-shopping-bag me-2"></i>
                Continue shopping
              </button>
            </div>
          </div>

          <div *ngIf="ordersLoading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
            <p class="text-body-secondary mt-3 mb-0">Loading your orders...</p>
          </div>

          <div *ngIf="!ordersLoading && orders.length > 0" class="order-card-list vstack gap-3">
            <article class="card border-0 shadow-sm order-card" *ngFor="let order of orders; trackBy: trackByFn">
              <div class="card-body">
                <div class="order-card-top d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                  <div class="order-card-title-wrap">
                    <h5 class="order-card-number mb-1">{{ order.order_number }}</h5>
                    <div class="text-body-secondary fs-sm">{{ getOrderDate(order) | date:'MMM d, y, h:mm a' }}</div>
                  </div>
                  <div class="order-card-summary d-flex align-items-start gap-2 ms-auto">
                    <button class="btn btn-outline-secondary btn-sm invoice-download-btn"
                            type="button"
                            (click)="downloadInvoice(order)"
                            [disabled]="invoiceDownloadingId === order.id"
                            title="Download invoice"
                            aria-label="Download invoice">
                      <i class="ci-file-text me-1"></i>
                      {{ invoiceDownloadingId === order.id ? 'Downloading...' : 'Invoice' }}
                    </button>
                    <div class="text-end order-total-block">
                      <div class="fw-semibold order-total">&#8377;{{ order.final_amount }}</div>
                      <span class="badge rounded-pill mt-1"
                            [ngClass]="{
                              'text-bg-success': order.payment_status === 'paid',
                              'text-bg-warning': order.payment_status !== 'paid'
                            }">
                        {{ order.payment_status | titlecase }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="row g-2 order-items-grid" *ngIf="(order.order_items || []).length > 0">
                  <div class="col-md-6" *ngFor="let item of order.order_items; trackBy: trackByFn">
                    <div class="order-item-card d-flex align-items-center gap-3 border rounded-3 p-2 h-100">
                      <a *ngIf="getOrderProductId(item) as productId; else staticOrderProductImage"
                         [routerLink]="['/product', getOrderProductRouteParam(item)]"
                         class="d-inline-flex flex-shrink-0"
                         [attr.aria-label]="'Open ' + (item.product?.name || 'product')">
                        <img [src]="getOrderProductImage(item.product)"
                             [alt]="item.product?.name || 'Product image'"
                             width="56" height="56"
                             class="rounded object-fit-cover"
                             style="cursor: pointer;"
                             (error)="$any($event.target).src='assets/cavero/img/shop/grocery/01.png'">
                      </a>
                      <ng-template #staticOrderProductImage>
                        <img [src]="getOrderProductImage(item.product)"
                             [alt]="item.product?.name || 'Product image'"
                             width="56" height="56"
                             class="rounded object-fit-cover"
                             (error)="$any($event.target).src='assets/cavero/img/shop/grocery/01.png'">
                      </ng-template>
                      <div class="min-w-0 order-item-copy">
                        <a *ngIf="getOrderProductId(item) as productId; else staticOrderProductName"
                           [routerLink]="['/product', getOrderProductRouteParam(item)]"
                           class="fw-medium text-truncate d-inline-block text-decoration-none text-body"
                           [attr.aria-label]="'Open ' + (item.product?.name || 'product')">
                          {{ item.product?.name || 'Product' }}
                        </a>
                        <ng-template #staticOrderProductName>
                          <div class="fw-medium text-truncate">{{ item.product?.name || 'Product' }}</div>
                        </ng-template>
                        <div class="fs-sm text-body-secondary">Qty: {{ item.quantity }} &bull; &#8377;{{ item.total_price || (item.price * item.quantity) }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="tracking-card mt-3">
                  <div class="tracking-header-row">
                    <div class="tracking-order-id">
                      <i class="ci-shopping-bag me-1"></i> Order ID: <strong>#{{ order.order_number }}</strong>
                    </div>
                    <span class="tracking-status-chip" [ngClass]="'status-' + (order.order_status || 'pending')">
                      {{ getTrackingStatus(order) }}
                    </span>
                  </div>

                  <div class="tracking-timeline">
                    <div class="tracking-progress-line">
                      <span class="tracking-progress-fill" [style.width.%]="getTrackingProgressPercent(order)"></span>
                    </div>
                    <div class="tracking-steps">
                      <div class="tracking-step"
                           *ngFor="let step of trackingSteps; trackBy: trackByKey"
                           [ngClass]="['state-' + getTrackingStepState(order, step.key), 'step-' + step.key]">
                        <div class="step-icon">
                          <i [class]="step.icon"></i>
                        </div>
                        <div class="step-label">{{ step.label }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div *ngIf="!ordersLoading && orders.length === 0" class="text-center py-5">
            <div class="mb-4">
              <i class="ci-shopping-bag display-4 text-body-tertiary"></i>
            </div>
            <h4 class="mb-2">No orders yet</h4>
            <p class="text-body-secondary mb-4">Your placed orders will appear here.</p>
          </div>
        </div>

        <!-- Referrals Section -->
        <div *ngIf="activeSection === 'referrals'">
          <h1 class="h3 mb-1">Refer &amp; Earn</h1>
          <p class="text-body-secondary mb-4">Share your code with friends. Earn rewards when they join Cavero Fragrances.</p>

          <div *ngIf="referralLoading" class="text-center py-5">
            <div class="spinner-border" role="status" style="color:#418576;"></div>
          </div>

          <ng-container *ngIf="!referralLoading">
            <!-- Code card -->
            <div class="border rounded-3 p-4 mb-4" style="background:linear-gradient(135deg,#FFF7E4 0%,#fff 100%);border-color:#418576!important;">
              <div class="mb-2 fw-semibold" style="color:#1A322D;">Your Referral Code</div>
              <div class="d-flex align-items-center gap-3 flex-wrap">
                <span class="referral-code-display" style="font-size:2rem;font-weight:700;letter-spacing:.35em;color:#418576;">
                  {{ referralCode || '——' }}
                </span>
                <button class="btn btn-sm btn-outline-secondary" (click)="copyReferralCode()" style="border-color:#418576;color:#1A322D;" title="Copy code">
                  <i class="ci-copy me-1"></i>{{ codeCopied ? 'Copied!' : 'Copy' }}
                </button>
              </div>
            </div>

            <!-- Share -->
            <div class="border rounded-3 p-4 mb-4">
              <div class="mb-3 fw-semibold">Share your link</div>
              <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <input type="text" class="form-control form-control-sm flex-grow-1" [value]="referralLink" readonly style="font-size:.85rem;max-width:360px;">
                <button class="btn btn-sm btn-primary" (click)="copyReferralLink()" style="background:#418576;border-color:#418576;">
                  {{ linkCopied ? 'Copied!' : 'Copy Link' }}
                </button>
              </div>
              <a [href]="whatsappLink" target="_blank" rel="noopener" class="btn btn-sm btn-success d-inline-flex align-items-center gap-2">
                <i class="ci-whatsapp"></i> Share on WhatsApp
              </a>
            </div>

            <!-- Stats -->
            <div class="row g-3">
              <div class="col-4">
                <div class="border rounded-3 p-3 text-center">
                  <div class="h3 mb-1" style="color:#418576;">{{ referralStats.total }}</div>
                  <div class="fs-sm text-body-secondary">Total Referrals</div>
                </div>
              </div>
              <div class="col-4">
                <div class="border rounded-3 p-3 text-center">
                  <div class="h3 mb-1 text-success">{{ referralStats.credited }}</div>
                  <div class="fs-sm text-body-secondary">Credited</div>
                </div>
              </div>
              <div class="col-4">
                <div class="border rounded-3 p-3 text-center">
                  <div class="h3 mb-1 text-warning">{{ referralStats.pending }}</div>
                  <div class="fs-sm text-body-secondary">Pending</div>
                </div>
              </div>
            </div>

            <p class="text-body-secondary fs-sm mt-4 mb-0">
              <i class="ci-info-circle me-1"></i>
              Each friend who signs up using your code earns you 10 reward points. Rewards are credited once verified.
            </p>
          </ng-container>
        </div>

        <!-- Support Tickets Section -->
        <div *ngIf="activeSection === 'support'">
          <div class="d-flex align-items-center justify-content-between mb-4">
            <h1 class="h3 mb-0">Support Tickets</h1>
            <button class="btn btn-primary rounded-pill px-3" (click)="showTicketForm = !showTicketForm">
              <i class="ci-{{ showTicketForm ? 'close' : 'add' }} me-1"></i>{{ showTicketForm ? 'Close' : 'New ticket' }}
            </button>
          </div>

          <!-- New ticket form -->
          <div class="card border-0 shadow-sm mb-4 ticket-form-card" *ngIf="showTicketForm">
            <div class="card-body p-4">
              <form [formGroup]="ticketForm" (ngSubmit)="submitTicket()">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Subject</label>
                  <input class="form-control" formControlName="subject" placeholder="e.g. Question about my order">
                  <div class="text-danger small mt-1" *ngIf="ticketSubmitted && ticketForm.get('subject')?.invalid">Subject is required</div>
                </div>
                <div class="mb-3">
                  <label class="form-label fw-semibold">Message</label>
                  <textarea class="form-control" rows="4" formControlName="message" placeholder="Describe your issue (at least 10 characters)..."></textarea>
                  <div class="text-danger small mt-1" *ngIf="ticketSubmitted && ticketForm.get('message')?.invalid">Please enter at least 10 characters</div>
                </div>
                <button type="submit" class="btn btn-primary rounded-pill px-4" [disabled]="submittingTicket">
                  {{ submittingTicket ? 'Submitting…' : 'Submit ticket' }}
                </button>
              </form>
            </div>
          </div>

          <!-- Loading -->
          <div *ngIf="ticketsLoading" class="text-center py-5">
            <div class="spinner-border text-secondary" role="status"></div>
          </div>

          <!-- Empty -->
          <div *ngIf="!ticketsLoading && supportTickets.length === 0" class="text-center py-5">
            <i class="ci-help-circle text-body-secondary" style="font-size:3rem;opacity:.35"></i>
            <h4 class="h5 mt-3 mb-1">No support tickets yet</h4>
            <p class="text-body-secondary mb-3">Raise a ticket and our team will get back to you.</p>
            <button class="btn btn-primary rounded-pill px-4" *ngIf="!showTicketForm" (click)="showTicketForm = true">Raise a ticket</button>
          </div>

          <!-- Ticket list -->
          <div class="vstack gap-3" *ngIf="!ticketsLoading && supportTickets.length > 0">
            <div class="card border-0 shadow-sm ticket-card" *ngFor="let t of supportTickets">
              <div class="card-body p-3 p-sm-4">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <h6 class="mb-0 fw-bold">{{ t.subject }}</h6>
                  <span class="badge rounded-pill ticket-badge"
                        [style.background]="ticketStatusColor(t.status) + '22'"
                        [style.color]="ticketStatusColor(t.status)">
                    {{ ticketStatusLabel(t.status) }}
                  </span>
                </div>
                <p class="text-body-secondary small mb-2">{{ t.message }}</p>
                <span class="text-body-secondary" style="font-size:.78rem">
                  <i class="ci-time me-1"></i>{{ t.createdAt | date:'medium' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Addresses Section -->
        <div *ngIf="activeSection === 'addresses'">
          <div class="d-flex align-items-center justify-content-between mb-4">
            <h1 class="h3 mb-0">Addresses</h1>
            <button class="btn btn-primary" (click)="addNewAddress()">
              <i class="ci-plus me-2"></i>
              Add address
            </button>
          </div>

          <!-- Addresses List -->
          <div class="row g-4 cvr-addr-row" *ngIf="addresses.length > 0; else noAddresses">
            <div class="col-md-6" *ngFor="let address of addresses; trackBy: trackByFn">
              <div class="card h-100 border-0 cvr-addr-card" [class.cvr-addr-card--default]="address.isDefault">
                <div class="card-body">
                  <div class="d-flex align-items-start justify-content-between mb-3">
                    <div class="d-flex align-items-center gap-2 min-w-0">
                      <span class="cvr-addr-pin"><i class="ci-map-pin"></i></span>
                      <h5 class="card-title mb-0 fs-6 fw-semibold text-truncate">{{ address.label }}</h5>
                      <span *ngIf="address.isDefault" class="cvr-addr-badge">Default</span>
                    </div>
                    <button class="btn btn-link p-0 addr-edit-link flex-shrink-0" (click)="editAddress(address)">Edit</button>
                  </div>
                  <div class="cvr-addr-lines">
                    <div>{{ address.street }}</div>
                    <div>{{ address.city }}{{ address.state ? ', ' + address.state : '' }}{{ address.zipCode ? ' ' + address.zipCode : '' }}</div>
                    <div>{{ address.country }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ng-template #noAddresses>
            <div class="text-center py-5">
              <div class="mb-4">
                <i class="ci-map-pin display-4 text-body-tertiary"></i>
              </div>
              <h4 class="mb-2">No addresses found</h4>
              <p class="text-body-secondary mb-4">Add your shipping and billing addresses for faster checkout.</p>
              <button class="btn btn-primary" (click)="addNewAddress()">
                <i class="ci-plus me-2"></i>
                Add your first address
              </button>
            </div>
          </ng-template>

          <!-- Add/Edit Address Modal Content -->
          <div *ngIf="editingAddress" class="modal d-block" style="background-color: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">{{ addingNewAddress ? 'Add New Address' : 'Edit Address' }}</h5>
                  <button type="button" class="btn-close" (click)="cancelEditAddress()"></button>
                </div>
                <div class="modal-body">
                  <!-- Use current location -->
                  <button type="button" class="btn btn-sm btn-outline-secondary mb-3 d-flex align-items-center gap-2"
                          (click)="useCurrentLocation()" [disabled]="locating">
                    <i class="ci-map-pin"></i>
                    {{ locating ? 'Detecting location...' : 'Use current location' }}
                  </button>
                  <form autocomplete="off">
                    <div class="row g-3">
                      <div class="col-12">
                        <label class="form-label">Address Label</label>
                        <input type="text"
                               class="form-control"
                               [(ngModel)]="editingAddress.label"
                               name="address_label"
                               placeholder="e.g., Home, Office"
                               autocomplete="off"
                               autocorrect="off"
                               spellcheck="false"
                               data-form-type="other"
                               data-lpignore="true">
                      </div>
                      <div class="col-12">
                        <label class="form-label">Street Address</label>
                        <input type="text" class="form-control" [(ngModel)]="editingAddress.street" name="street" placeholder="123 Main Street" autocomplete="street-address">
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">City</label>
                        <input type="text" class="form-control" [(ngModel)]="editingAddress.city" name="city" placeholder="New York" autocomplete="address-level2">
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">State/Province</label>
                        <input type="text" class="form-control" [(ngModel)]="editingAddress.state" name="state" placeholder="NY" autocomplete="address-level1">
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">ZIP/Postal Code</label>
                        <input type="text" class="form-control" [(ngModel)]="editingAddress.zipCode" name="zipCode" placeholder="10001" autocomplete="postal-code">
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Country</label>
                        <input type="text" class="form-control" [(ngModel)]="editingAddress.country" name="country" placeholder="e.g., India" autocomplete="country-name">
                      </div>
                      <div class="col-12">
                        <div class="d-flex align-items-center gap-2 mt-2 pt-2">
                          <input type="checkbox"
                                 [(ngModel)]="editingAddress.isDefault" name="isDefault" id="defaultAddress"
                                 style="width:18px;height:18px;min-width:18px;cursor:pointer;opacity:1;position:relative;appearance:auto;-webkit-appearance:checkbox;border:2px solid #aaa;border-radius:3px;">
                          <label for="defaultAddress" style="cursor:pointer;margin:0;font-size:14px;user-select:none;">
                            Set as default address
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div class="modal-footer">
                  <button *ngIf="!addingNewAddress" type="button" class="btn btn-danger me-auto" (click)="deleteAddress(editingAddress.id)">Delete Address</button>
                  <button type="button" class="btn btn-secondary" (click)="cancelEditAddress()">Cancel</button>
                  <button type="button" class="btn btn-primary" (click)="saveAddress()">
                    {{ addingNewAddress ? 'Add Address' : 'Save Changes' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</main>

<app-cavero-footer></app-cavero-footer>

<!-- Custom Confirm Dialog -->
<div *ngIf="confirmDialog.show" class="custom-confirm-overlay" (click).self="cancelConfirm()">
  <div class="custom-confirm-box">
    <div class="custom-confirm-icon" [ngClass]="confirmDialog.type">
      <i [class]="confirmDialog.type === 'danger' ? 'ci-trash' : 'ci-alert-circle'"></i>
    </div>
    <h5 class="custom-confirm-title">{{ confirmDialog.title }}</h5>
    <p class="custom-confirm-msg">{{ confirmDialog.message }}</p>
    <div class="custom-confirm-actions">
      <button class="btn btn-outline-secondary" (click)="cancelConfirm()">Cancel</button>
      <button class="btn" [ngClass]="confirmDialog.type === 'danger' ? 'btn-danger' : 'btn-primary'" (click)="okConfirm()">{{ confirmDialog.okLabel }}</button>
    </div>
  </div>
</div>
  `,
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  isSubmitting = false;
  isChangingPassword = false;
  user: any = {};
  orderCount = 0;

  // Which section is being edited
  editingBasic = false;
  editingContact = false;
  editingPassword = false;

  // Active section tracking
  activeSection = 'personal-info'; // 'personal-info', 'wishlist', 'orders', 'addresses', 'support'

  // Support tickets
  supportTickets: any[] = [];
  ticketsLoading = false;
  submittingTicket = false;
  ticketSubmitted = false;
  showTicketForm = false;
  ticketForm!: FormGroup;

  // Wishlist data
  wishlistItems: any[] = [];
  allSelected = false;
  orders: any[] = [];
  ordersLoading = false;
  invoiceDownloadingId: number | string | null = null;
  readonly trackingSteps = [
    { key: 'payment_completed', label: 'Payment completed', icon: 'ci-credit-card' },
    { key: 'pending', label: 'Pending approval', icon: 'ci-clock' },
    { key: 'confirmed', label: 'Payment approved', icon: 'ci-check-circle' },
    { key: 'processing', label: 'Out of warehouse', icon: 'ci-box' },
    { key: 'shipped', label: 'Out for delivery', icon: 'ci-truck' },
    { key: 'delivered', label: 'Delivered', icon: 'ci-home' },
  ];

  // Addresses data
  addresses: any[] = [];
  editingAddress: any = null;
  addingNewAddress = false;

  // Referral data
  referralCode = '';
  referralLink = '';
  whatsappLink = '';
  referralStats = { total: 0, credited: 0, pending: 0 };
  referralLoading = false;
  codeCopied = false;
  linkCopied = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    public router: Router,
    private route: ActivatedRoute,
    private wishlistService: WishlistService,
    private http: HttpClient,
    private cartService: CartService,
    private cartAnim: CartAnimationService,
    private notification: FrontendNotificationService,
    private headerService: HeaderService,
    private invoiceService: InvoiceService
  ) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: [''],
      phone: [''],
      address: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    });

    this.ticketForm = this.fb.group({
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.fetchProfile();
    this.loadWishlist();
    this.loadAddresses();
    this.loadOrders();
    this.loadOrderCount();

    this.headerService.orderHistoryChanged$.subscribe(() => {
      this.refreshOrders();
      this.activeSection = 'orders';
    });
    
    // Check for fragment to determine initial section
    this.route.fragment.subscribe(fragment => {
      if (fragment === 'wishlist') {
        this.activeSection = 'wishlist';
      } else if (fragment === 'addresses') {
        this.activeSection = 'addresses';
      } else if (fragment === 'orders') {
        this.activeSection = 'orders';
        this.refreshOrders();
      } else if (fragment === 'personal-info') {
        this.activeSection = 'personal-info';
      } else if (fragment === 'referrals') {
        this.activeSection = 'referrals';
        this.loadReferralData();
      } else if (fragment === 'support' || fragment === 'tickets') {
        this.activeSection = 'support';
        this.loadTickets();
      }
    });
  }

  fetchProfile(): void {
    const localUser = this.authService.getDecodeToken();
    if (!localUser) { this.router.navigate(['/signin']); return; }

    this.authService.getProfile({ id: localUser.id }).subscribe({
      next: (res) => {
        if (res.success) {
          this.user = this.normalizeProfilePayload(res.data);
          this.profileForm.patchValue({
            name: this.user.name,
            email: this.user.email,
            phone: this.user.phone,
            address: this.user.address
          });
        }
      },
      error: (err) => console.error('Failed to load profile', err)
    });
  }

  saveBasicInfo(): void {
    if (!this.profileForm.get('name')?.valid) return;
    this.submitProfile(() => { this.editingBasic = false; });
  }

  saveContact(): void {
    this.submitProfile(() => { this.editingContact = false; });
  }

  private submitProfile(onSuccess: () => void): void {
    this.isSubmitting = true;
    const localUser = this.authService.getDecodeToken();
    const normalizedPhone = this.normalizePhone(this.profileForm.value.phone);
    const normalizedName = this.normalizeText(this.profileForm.value.name);
    const payload = {
      ...this.profileForm.value,
      id: this.user.id || localUser?.id,
      phone: normalizedPhone,
      mobile: normalizedPhone,
      contact: normalizedPhone,
      phone_number: normalizedPhone
    };
    this.authService.editProfile(payload).subscribe({
      next: (res) => {
        if (res.success) {
          const serverUser = this.normalizeProfilePayload(res.data || {});
          const phoneSaved = normalizedPhone === this.normalizePhone(serverUser.phone);
          const nameSaved = normalizedName === this.normalizeText(serverUser.name);

          if (!phoneSaved || !nameSaved) {
            this.isSubmitting = false;
            this.notification.error('Hmm, your profile did not sync yet. Please try once more.');
            return;
          }

          const mergedLocalUser = this.normalizeProfilePayload({
            ...this.user,
            ...this.profileForm.value,
            ...serverUser
          });
          this.user = mergedLocalUser;
          this.profileForm.patchValue({
            name: mergedLocalUser.name,
            email: mergedLocalUser.email,
            phone: mergedLocalUser.phone,
            address: mergedLocalUser.address
          });
          // Store fresh token so getDecodeToken() stays in sync
          if (res.token) { this.authService.storeToken(res.token); }
          // Re-sync from API so re-login and current session stay consistent.
          this.fetchProfile();
          this.isSubmitting = false;
          this.notification.success('All set. Your profile is now fresh and updated.');
          onSuccess();
        } else {
          this.isSubmitting = false;
          this.notification.error(res.message || 'Profile update failed. Please try again.');
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.notification.error('We hit a quick snag while saving. Please try again.');
      }
    });
  }

  cancelBasic(): void { this.profileForm.patchValue({ name: this.user.name }); this.editingBasic = false; }
  cancelContact(): void { this.profileForm.patchValue({ phone: this.user.phone, address: this.user.address }); this.editingContact = false; }
  cancelPassword(): void { this.passwordForm.reset(); this.editingPassword = false; }

  private normalizePhone(value: any): string {
    return String(value ?? '').trim();
  }

  private normalizeText(value: any): string {
    return String(value ?? '').trim();
  }

  private normalizeProfilePayload(raw: any): any {
    const source = raw || {};
    const normalizedPhone = this.normalizePhone(
      source.phone ?? source.mobile ?? source.contact ?? source.phone_number ?? source.phonenumber
    );
    const normalizedAddress = source.address ?? source.full_address ?? source.street ?? '';

    return {
      ...source,
      phone: normalizedPhone,
      address: normalizedAddress
    };
  }

  getInitial(): string {
    return this.user?.name ? this.user.name.charAt(0).toUpperCase() : 'S';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/signin']);
  }

  // Section navigation methods
  setActiveSection(section: string): void {
    this.activeSection = section;
    this.router.navigate([], {
      relativeTo: this.route,
      fragment: section,
      replaceUrl: false
    });
    // Reset editing states when switching sections
    this.editingBasic = false;
    this.editingContact = false;
    this.editingPassword = false;
    this.editingAddress = null;
    this.addingNewAddress = false;

    if (section === 'referrals') this.loadReferralData();
    if (section === 'support') this.loadTickets();
  }

  // ── Support tickets ─────────────────────────────────────────────────────────
  loadTickets(): void {
    this.ticketsLoading = true;
    this.http.get<any>(`${environment.supportTicketsApiBaseUrl}/user`).subscribe({
      next: (res) => { this.supportTickets = res?.data || []; this.ticketsLoading = false; },
      error: () => { this.supportTickets = []; this.ticketsLoading = false; }
    });
  }

  submitTicket(): void {
    this.ticketSubmitted = true;
    if (this.ticketForm.invalid) return;

    const user = this.authService.getDecodeToken() || {};
    this.submittingTicket = true;
    const payload = {
      name: user.name || 'Customer',
      mobile: user.phone || '0000000000',
      email: user.email || '',
      subject: this.ticketForm.value.subject,
      message: this.ticketForm.value.message
    };

    this.http.post<any>(`${environment.supportTicketsApiBaseUrl}`, payload).subscribe({
      next: () => {
        this.snackBar.open('Ticket submitted! We will get back to you shortly.', 'Close', { duration: 4000 });
        this.ticketForm.reset();
        this.ticketSubmitted = false;
        this.showTicketForm = false;
        this.submittingTicket = false;
        this.loadTickets();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Failed to submit ticket', 'Close', { duration: 3000 });
        this.submittingTicket = false;
      }
    });
  }

  ticketStatusColor(status: string): string {
    switch (String(status || '').toLowerCase()) {
      case 'open': return '#E8A33D';
      case 'in_progress': return '#418576';
      case 'resolved': case 'closed': return '#1f9d57';
      default: return '#8a8d86';
    }
  }

  ticketStatusLabel(status: string): string {
    switch (String(status || '').toLowerCase()) {
      case 'open': return 'Open';
      case 'in_progress': return 'In progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status || 'Open';
    }
  }

  loadReferralData(): void {
    if (this.referralCode) return; // already loaded
    this.referralLoading = true;
    const token = localStorage.getItem('token') || '';
    const headers = { Authorization: `Bearer ${token}` };

    this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/referrals/my-code`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.referralCode = res.data.referral_code;
          this.referralLink = res.data.referral_link;
          this.whatsappLink = res.data.whatsapp_link;
        }
      },
      error: (err) => console.error('Failed to load referral code', err)
    });

    this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/referrals/my-stats`, { headers }).subscribe({
      next: (res) => {
        if (res.success) this.referralStats = res.data;
        this.referralLoading = false;
      },
      error: (err) => {
        console.error('Failed to load referral stats', err);
        this.referralLoading = false;
      }
    });
  }

  copyReferralCode(): void {
    navigator.clipboard.writeText(this.referralCode).then(() => {
      this.codeCopied = true;
      setTimeout(() => this.codeCopied = false, 2000);
    });
  }

  copyReferralLink(): void {
    navigator.clipboard.writeText(this.referralLink).then(() => {
      this.linkCopied = true;
      setTimeout(() => this.linkCopied = false, 2000);
    });
  }

  // Wishlist methods
  loadWishlist(): void {
    this.wishlistService.wishlist$.subscribe(items => {
      this.wishlistItems = items.map(item => ({ ...item, selected: false }));
    });
  }

  removeWishlistItem(id: string): void {
    this.wishlistService.removeFromWishlist(id);
  }

  addToCart(item: any, event?: MouseEvent): void {
    const product = this.buildCartProductFromWishlistItem(item);
    if (!product) {
      this.notification.error('Unable to add this item to cart right now.');
      return;
    }

    if (event) {
      const btn = event.currentTarget as HTMLElement;
      const img = btn.closest('.product-card')?.querySelector('img') as HTMLElement | null;
      this.cartAnim.flyToCart(this.getProductImage(item.product), img);
    }

    this.cartService.addToCart(product, 1);
  }

  decrementQuantity(item: any): void {
    const productId = String(item?.product?.id || item?.product_id || '');
    if (!productId) return;
    const quantity = this.getItemQuantity(item);
    if (quantity <= 0) return;
    this.cartService.updateQuantity(productId, quantity - 1);
  }

  incrementQuantity(item: any, event?: MouseEvent): void {
    this.addToCart(item, event);
  }

  toggleSelectAll(event: any): void {
    const isChecked = event.target.checked;
    this.allSelected = isChecked;
    this.wishlistItems.forEach(item => item.selected = isChecked);
  }

  updateSelectAll(): void {
    this.allSelected = this.wishlistItems.length > 0 && this.wishlistItems.every(item => item.selected);
  }

  unselectAll(): void {
    this.wishlistItems.forEach(item => item.selected = false);
    this.allSelected = false;
  }

  addSelectedToCart(): void {
    const selectedItems = this.wishlistItems.filter(item => item.selected);
    if (selectedItems.length > 0) {
      let addedCount = 0;
      selectedItems.forEach(item => {
        const product = this.buildCartProductFromWishlistItem(item);
        if (product && this.cartService.addToCart(product, 1, false)) {
          addedCount += 1;
        }
      });

      if (addedCount > 0) {
        this.notification.success(`${addedCount} item${addedCount > 1 ? 's' : ''} added to cart.`);
      }
    }
  }

  relocateSelected(): void {
    const selectedItems = this.wishlistItems.filter(item => item.selected);
    if (selectedItems.length > 0) {
      this.notification.show(`${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} relocated.`);
    }
  }

  removeSelected(): void {
    const selectedItems = this.wishlistItems.filter(item => item.selected);
    if (selectedItems.length > 0) {
      selectedItems.forEach(item => {
        this.wishlistService.removeFromWishlist(item.id, false);
      });
      this.notification.success(`${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} removed from wishlist.`);
    }
  }

  hasSelected(): boolean {
    return this.wishlistItems.some(item => item.selected);
  }

  getDiscountPercent(product: any): number | null {
    const price = Number(product?.price ?? 0);
    const comparePrice = Number(product?.compare_price ?? 0);

    if (!Number.isFinite(price) || !Number.isFinite(comparePrice) || comparePrice <= price || comparePrice <= 0) {
      return null;
    }

    const discountPercent = Math.round(((comparePrice - price) / comparePrice) * 100);
    return discountPercent > 0 ? discountPercent : null;
  }

  getStockLabel(product: any): string {
    const stock = Number(product?.stock ?? product?.available_stock ?? product?.inventory_quantity ?? 0);

    if (!Number.isFinite(stock)) {
      return '';
    }

    if (stock <= 0) {
      return 'Out of stock';
    }

    if (stock < 5) {
      return `Only ${stock} left`;
    }

    return '';
  }

  getItemQuantity(item: any): number {
    const productId = String(item?.product?.id || item?.product_id || '');
    if (!productId) return 0;
    const cart = this.cartService.getCartValue();
    const cartItem = cart.items.find(i => String(i.product_id) === productId);
    return cartItem ? Number(cartItem.quantity || 0) : 0;
  }

  getStockCount(product: any): number {
    const stock = Number(product?.stock ?? product?.available_stock ?? product?.inventory_quantity ?? 0);
    return Number.isFinite(stock) ? stock : 0;
  }

  getProductImage(product: any): string {
    if (!product) return 'assets/cavero/img/shop/grocery/01.png';
    
    if (product.images && product.images.length > 0) {
      const filename = product.images[0].filename;
      return `${environment.apiGatewayBaseUrl}/uploads/products/${filename}`;
    }
    
    return 'assets/cavero/img/shop/grocery/01.png';
  }

  trackByFn(index: number, item: any): any {
    return item.id;
  }

  trackByKey(index: number, item: any): any {
    return item?.key || index;
  }

  // Address management methods
  loadAddresses(): void {
    const localUser = this.authService.getDecodeToken();
    if (!localUser) return;

    this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/addresses/user/${localUser.id}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.addresses = res.data.map((addr: any) => ({
            id: addr.id,
            type: addr.type,
            label: addr.label,
            isDefault: addr.is_default,
            street: addr.street,
            city: addr.city,
            state: addr.state,
            zipCode: addr.zip_code,
            country: addr.country,
            fullAddress: `${addr.city}${addr.state ? ', ' + addr.state : ''}${addr.zip_code ? ' ' + addr.zip_code : ''}`
          }));
        }
      },
      error: (err) => console.error('Failed to load addresses', err)
    });
  }

  loadOrderCount(): void {
    const localUser = this.authService.getDecodeToken();
    if (!localUser) return;

    this.http.get<any>(`${environment.apiGatewayBaseUrl}/api/orders/user/${localUser.id}/count`).subscribe({
      next: (res) => {
        if (res.success) {
          this.orderCount = res.data.count || 0;
        }
      },
      error: (err) => {
        console.error('Failed to load order count', err);
        this.orderCount = this.orders.length;
      }
    });
  }

  loadOrders(): void {
    const localUser = this.authService.getDecodeToken();
    if (!localUser) return;

    this.ordersLoading = true;
    this.http.get<any>(`${environment.orderApiBaseUrl}/user/${localUser.id}`).subscribe({
      next: (res) => {
        const orders = Array.isArray(res?.data) ? res.data : [];
        this.orders = orders;
        this.orderCount = orders.length;
        this.ordersLoading = false;
      },
      error: (err) => {
        console.error('Failed to load orders', err);
        this.orders = [];
        this.ordersLoading = false;
      }
    });
  }

  refreshOrders(): void {
    this.loadOrders();
    this.loadOrderCount();
  }

  async downloadInvoice(order: any): Promise<void> {
    if (!order) return;

    this.invoiceDownloadingId = order.id || order.order_number || 'invoice';
    try {
      await this.invoiceService.downloadOrderInvoice(order);
    } catch (error) {
      console.error('Invoice download failed', error);
      this.snackBar.open('Unable to download invoice', 'Close', { duration: 3000 });
    } finally {
      this.invoiceDownloadingId = null;
    }
  }

  getOrderDate(order: any): Date {
    return new Date(order?.createdAt || order?.created_at || Date.now());
  }

  getTrackingStatus(order: any): string {
    switch (order?.order_status) {
      case 'pending':
        return 'Pending admin approval';
      case 'confirmed':
        return 'Payment approved';
      case 'processing':
        return 'Out of warehouse';
      case 'shipped':
        return 'Out for delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Order cancelled';
      default:
        return order?.payment_status === 'paid' ? 'Pending admin approval' : 'Payment pending';
    }
  }

  getTrackingStepState(order: any, stepKey: string): 'done' | 'active' | 'todo' | 'cancelled' {
    const paymentDone = String(order?.payment_status || '').toLowerCase() === 'paid';
    const orderStatus = String(order?.order_status || 'pending').toLowerCase();
    const orderFlow = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = orderFlow.indexOf(orderStatus);

    if (stepKey === 'payment_completed') {
      return paymentDone ? 'done' : 'active';
    }

    if (orderStatus === 'cancelled') {
      return stepKey === 'pending' ? 'cancelled' : 'todo';
    }

    const stepIndex = orderFlow.indexOf(stepKey);
    if (stepIndex === -1) return 'todo';
    if (currentIndex === -1 && paymentDone && stepKey === 'pending') return 'active';
    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'active';
    return 'todo';
  }

  getTrackingProgressPercent(order: any): number {
    const paymentDone = String(order?.payment_status || '').toLowerCase() === 'paid';
    if (!paymentDone) return 0;

    const stepSize = 100 / (this.trackingSteps.length - 1);
    const orderFlow = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const orderStatus = String(order?.order_status || 'pending').toLowerCase();
    const currentIndex = orderFlow.indexOf(orderStatus);

    if (orderStatus === 'cancelled') return stepSize;
    if (currentIndex === -1) return stepSize;
    return Math.min((currentIndex + 1) * stepSize, 100);
  }

  getOrderProductImage(product: any): string {
    if (!product?.images || product.images.length === 0) {
      return 'assets/cavero/img/shop/grocery/01.png';
    }

    const first = product.images[0];
    if (typeof first === 'string') {
      if (first.startsWith('http')) return first;
      if (first.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${first}`;
      if (first.startsWith('uploads/')) return `${environment.apiGatewayBaseUrl}/${first}`;
      return first;
    }

    if (first?.filename) {
      return `${environment.apiGatewayBaseUrl}/uploads/products/${first.filename}`;
    }

    if (first?.url) {
      if (first.url.startsWith('http')) return first.url;
      if (first.url.startsWith('/uploads/')) return `${environment.apiGatewayBaseUrl}${first.url}`;
      return `${environment.apiGatewayBaseUrl}/${first.url}`;
    }

    return 'assets/cavero/img/shop/grocery/01.png';
  }

  getProductWeightLabel(product: any): string {
    const rawWeight = product?.weight;
    if (rawWeight === null || rawWeight === undefined || rawWeight === '') {
      return '';
    }

    let numericWeight: number | null = null;
    if (typeof rawWeight === 'number') {
      numericWeight = rawWeight;
    } else if (typeof rawWeight === 'string') {
      const parsed = Number.parseFloat(rawWeight);
      if (Number.isFinite(parsed)) {
        numericWeight = parsed;
      }
    }

    const rawWeightText = String(rawWeight).trim();
    const embeddedUnitMatch = rawWeightText.match(/[a-zA-Z]+$/);
    const unit = String(product?.weight_unit || embeddedUnitMatch?.[0] || 'ml').trim().toUpperCase();

    if (numericWeight === null || !Number.isFinite(numericWeight)) {
      return rawWeightText;
    }

    return `${numericWeight.toFixed(2)}${unit}`;
  }

  getOrderProductId(item: any): string | null {
    const productId = item?.product?.id ?? item?.product_id ?? null;
    if (productId === null || productId === undefined || productId === '') {
      return null;
    }

    return String(productId);
  }

  getProductRouteParam(item: any): string {
    return getSeoRouteParam(item?.product || item);
  }

  getOrderProductRouteParam(item: any): string {
    return getSeoRouteParam(item?.product || item);
  }

  private buildCartProductFromWishlistItem(item: any): any | null {
    const source = item?.product || item;
    const productId = source?.id ?? item?.product_id;
    if (!productId) return null;

    const productName = source?.name || item?.product_name || 'Product';
    const productPrice = Number(source?.price ?? item?.price ?? 0);

    return {
      ...source,
      id: productId,
      name: productName,
      price: Number.isFinite(productPrice) ? productPrice : 0,
      images: source?.images || item?.images || [],
      product_image: source?.product_image || item?.product_image || this.getProductImage(source)
    };
  }

  updatePassword(): void {
    if (!this.passwordForm.valid) {
      this.snackBar.open('Please fill all password fields correctly', 'Close', { duration: 3000 });
      return;
    }

    if (this.passwordForm.value.newPassword !== this.passwordForm.value.confirmPassword) {
      this.snackBar.open('New passwords do not match', 'Close', { duration: 3000 });
      return;
    }

    this.isChangingPassword = true;
    const payload = {
      id: this.user.id,
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    };

    this.authService.changePassword(payload).subscribe({
      next: (res) => {
        this.isChangingPassword = false;
        if (res.success) {
          this.snackBar.open('Password updated successfully', 'Close', { duration: 3000 });
          this.cancelPassword();
        } else {
          this.snackBar.open(res.message || 'Password update failed', 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.isChangingPassword = false;
        this.snackBar.open('An error occurred. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  deleteAccount(): void {
    this.showConfirm(
      'Delete Account',
      'When you delete your account, your public profile will be deactivated immediately. This action cannot be undone.',
      'Delete Account', 'danger',
      () => {
        const localUser = this.authService.getDecodeToken();
        if (!localUser) return;
        this.http.delete<any>(`${environment.apiGatewayBaseUrl}/api/auth/user/${localUser.id}`).subscribe({
          next: (res) => {
            if (res.success) {
              this.snackBar.open('Account deleted successfully', 'Close', { duration: 3000 });
              this.authService.logout();
              this.router.navigate(['/signin']);
            } else {
              this.snackBar.open(res.message || 'Account deletion failed', 'Close', { duration: 3000 });
            }
          },
          error: () => {
            this.snackBar.open('An error occurred. Please try again.', 'Close', { duration: 3000 });
          }
        });
      }
    );
  }

  editAddress(address: any): void {
    this.editingAddress = { ...address };
  }

  saveAddress(): void {
    if (!this.editingAddress) return;

    const localUser = this.authService.getDecodeToken();
    if (!localUser) return;

    // Prepare payload for API
    const payload = {
      user_id: localUser.id,
      label: this.editingAddress.label,
      street: this.editingAddress.street,
      city: this.editingAddress.city,
      state: this.editingAddress.state,
      zip_code: this.editingAddress.zipCode,
      country: this.editingAddress.country,
      is_default: this.editingAddress.isDefault,
      type: this.editingAddress.type || 'shipping'
    };

    if (this.addingNewAddress) {
      // Create new address
      this.http.post<any>(`${environment.apiGatewayBaseUrl}/api/addresses`, payload).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Address added successfully', 'Close', { duration: 3000 });
            this.loadAddresses(); // Reload addresses
            this.headerService.notifyAddressBookChanged();
            this.cancelEditAddress();
          } else {
            this.snackBar.open(res.message || 'Failed to add address', 'Close', { duration: 3000 });
          }
        },
        error: () => {
          this.snackBar.open('An error occurred. Please try again.', 'Close', { duration: 3000 });
        }
      });
    } else {
      // Update existing address
      this.http.put<any>(`${environment.apiGatewayBaseUrl}/api/addresses/${this.editingAddress.id}`, payload).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Address updated successfully', 'Close', { duration: 3000 });
            this.loadAddresses(); // Reload addresses
            this.headerService.notifyAddressBookChanged();
            this.cancelEditAddress();
          } else {
            this.snackBar.open(res.message || 'Failed to update address', 'Close', { duration: 3000 });
          }
        },
        error: () => {
          this.snackBar.open('An error occurred. Please try again.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  cancelEditAddress(): void {
    this.editingAddress = null;
    this.addingNewAddress = false;
  }

  deleteAddress(addressId: number): void {
    this.showConfirm(
      'Delete Address',
      'Are you sure you want to delete this address? This action cannot be undone.',
      'Delete', 'danger',
      () => {
        this.http.delete<any>(`${environment.apiGatewayBaseUrl}/api/addresses/${addressId}`).subscribe({
          next: (res) => {
            if (res.success) {
              this.snackBar.open('Address deleted successfully', 'Close', { duration: 3000 });
              this.cancelEditAddress();
              this.loadAddresses();
              this.headerService.notifyAddressBookChanged();
            } else {
              this.snackBar.open(res.message || 'Failed to delete address', 'Close', { duration: 3000 });
            }
          },
          error: () => {
            this.snackBar.open('An error occurred. Please try again.', 'Close', { duration: 3000 });
          }
        });
      }
    );
  }

  addNewAddress(): void {
    this.addingNewAddress = true;
    this.editingAddress = {
      id: null, type: 'shipping', label: '',
      isDefault: false, street: '', city: '', state: '', zipCode: '', country: 'India', fullAddress: ''
    };
  }

  locating = false;

  confirmDialog: { show: boolean; title: string; message: string; okLabel: string; type: string; onOk: () => void } = {
    show: false, title: '', message: '', okLabel: 'Confirm', type: 'danger', onOk: () => {}
  };

  private showConfirm(title: string, message: string, okLabel: string, type: string, onOk: () => void): void {
    this.confirmDialog = { show: true, title, message, okLabel, type, onOk };
  }

  okConfirm(): void { this.confirmDialog.show = false; this.confirmDialog.onOk(); }
  cancelConfirm(): void { this.confirmDialog.show = false; }

  useCurrentLocation(): void {
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
      this.notification.error('Location access requires a secure HTTPS connection. Please use the secure site or enter your address manually.');
      return;
    }

    if (!navigator.geolocation) {
      this.notification.error('Your browser does not support location access. Please enter your address manually.');
      return;
    }
    this.locating = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        this.http.get<any>(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        ).subscribe({
          next: (data) => {
            this.locating = false;
            const a = data.address || {};
            this.editingAddress.street = [
              a.house_number, a.road || a.pedestrian || a.footway
            ].filter(Boolean).join(' ') || a.suburb || '';
            this.editingAddress.city = a.city || a.town || a.village || a.county || '';
            this.editingAddress.state = a.state || '';
            this.editingAddress.zipCode = a.postcode || '';
            this.editingAddress.country = a.country || 'India';
            this.notification.success('Location detected successfully.');
          },
          error: () => {
            this.locating = false;
            this.notification.error('We could not fetch your address from the detected location. Please fill it in manually.');
          }
        });
      },
      (err) => {
        this.locating = false;
        let msg = 'We could not detect your location. Please enter your address manually.';

        if (err.code === 1) {
          msg = 'Location access was denied. Please allow location permission in your browser settings and try again.';
        } else if (err.code === 2) {
          msg = 'Your location is currently unavailable. Please try again in a moment or enter your address manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again or enter your address manually.';
        }

        this.notification.error(msg);
      },
      { timeout: 10000 }
    );
  }

  setDefaultAddress(addressId: number): void {
    this.http.put<any>(`${environment.apiGatewayBaseUrl}/api/addresses/${addressId}/default`, {}).subscribe({
      next: (res) => {
        if (res.success) {
          this.snackBar.open('Default address updated', 'Close', { duration: 3000 });
          this.loadAddresses(); // Reload addresses
          this.headerService.notifyAddressBookChanged();
        } else {
          this.snackBar.open(res.message || 'Failed to update default address', 'Close', { duration: 3000 });
        }
      },
      error: () => {
        this.snackBar.open('An error occurred. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }
}




