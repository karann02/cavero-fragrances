import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReviewService } from './review.service';
import { AuthService } from '../../../../core/service/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-product-reviews',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    styles: [`
      :host {
        --rv-green:#1A322D; --rv-teal:#418576; --rv-gold:#E8B54B; --rv-gold-soft:#f3e6c4;
        --rv-ink:#23302b; --rv-mute:#8a8d86; --rv-line:#ece7da; --rv-cream:#FBF7EC;
        display:block;
        font-family:'DM Sans','Segoe UI',sans-serif;
      }
      .cv-reviews{ max-width:760px; }

      /* ── summary ── */
      .cv-rv-summary{
        display:flex; gap:28px; align-items:center; flex-wrap:wrap;
        padding:22px 24px; border-radius:18px; margin-bottom:26px;
        background:linear-gradient(135deg, #fffdf7 0%, var(--rv-cream) 100%);
        border:1px solid var(--rv-line); box-shadow:0 10px 30px rgba(26,50,45,.05);
      }
      .cv-rv-score{ text-align:center; min-width:120px; }
      .cv-rv-avg{ font-family:'Playfair Display',serif; font-size:46px; font-weight:800; color:var(--rv-green); line-height:1; }
      .cv-rv-score .cv-stars{ margin:6px 0 4px; }
      .cv-rv-count{ font-size:12.5px; color:var(--rv-mute); font-weight:600; }
      .cv-rv-bars{ flex:1; min-width:200px; display:flex; flex-direction:column; gap:6px; }
      .cv-rv-bar{ display:flex; align-items:center; gap:10px; font-size:12px; color:var(--rv-mute); }
      .cv-rv-bar-label{ width:26px; font-weight:700; color:var(--rv-ink); white-space:nowrap; }
      .cv-rv-track{ flex:1; height:8px; border-radius:99px; background:#efe9db; overflow:hidden; }
      .cv-rv-fill{ height:100%; border-radius:99px; background:linear-gradient(90deg,var(--rv-gold),#f0c668); transition:width .5s ease; }
      .cv-rv-bar-n{ width:22px; text-align:right; font-weight:600; }

      /* ── heading ── */
      .cv-rv-title{ font-family:'Playfair Display',serif; font-size:24px; font-weight:700; color:var(--rv-green); margin:0 0 18px; }
      .cv-rv-title span{ color:var(--rv-mute); font-weight:500; font-size:18px; }

      /* ── stars ── */
      .cv-stars{ display:inline-flex; gap:2px; }
      .cv-ico-star{ width:16px; height:16px; fill:#dcd6c6; }
      .cv-stars .filled{ fill:var(--rv-gold); }

      /* ── empty state ── */
      .cv-rv-empty{
        text-align:center; padding:34px 20px; border-radius:18px; margin-bottom:26px;
        background:var(--rv-cream); border:1px dashed #e0d8c4;
      }
      .cv-rv-empty svg{ width:46px; height:46px; fill:none; stroke:var(--rv-teal); stroke-width:1.4; margin-bottom:10px; }
      .cv-rv-empty h5{ font-family:'Playfair Display',serif; color:var(--rv-green); font-size:17px; margin:0 0 4px; }
      .cv-rv-empty p{ color:var(--rv-mute); font-size:13px; margin:0; }

      /* ── review cards ── */
      .cv-rv-list{ display:flex; flex-direction:column; gap:14px; margin-bottom:8px; }
      .cv-rv-card{
        padding:18px 20px; border-radius:16px; background:#fff;
        border:1px solid var(--rv-line); box-shadow:0 6px 18px rgba(26,50,45,.04);
        transition:transform .2s ease, box-shadow .2s ease;
      }
      .cv-rv-card:hover{ transform:translateY(-2px); box-shadow:0 12px 26px rgba(26,50,45,.08); }
      .cv-rv-card-head{ display:flex; align-items:center; gap:12px; margin-bottom:10px; }
      .cv-rv-avatar{
        width:42px; height:42px; border-radius:50%; flex:none;
        display:flex; align-items:center; justify-content:center;
        font-weight:800; font-size:16px; color:#fff;
        background:linear-gradient(135deg,var(--rv-teal),#6FC3A6);
        box-shadow:0 4px 10px rgba(65,133,118,.3);
      }
      .cv-rv-who{ flex:1; min-width:0; }
      .cv-rv-name{ display:block; font-weight:700; color:var(--rv-green); font-size:14px; }
      .cv-rv-verified{ font-size:10px; font-weight:700; color:var(--rv-teal); background:#e8f3ee; border-radius:20px; padding:1px 8px; margin-left:6px; vertical-align:middle; }
      .cv-rv-date{ font-size:12px; color:var(--rv-mute); }
      .cv-rv-text{ margin:0; font-size:14px; line-height:1.6; color:#444; }

      .cv-rv-more{
        align-self:flex-start; margin:6px 0 24px; cursor:pointer;
        background:transparent; border:1.5px solid var(--rv-teal); color:var(--rv-teal);
        font-weight:700; font-size:13px; border-radius:99px; padding:9px 22px; transition:all .2s ease;
      }
      .cv-rv-more:hover{ background:var(--rv-teal); color:#fff; }

      /* ── write a review ── */
      .cv-rv-form-card{
        margin-top:18px; padding:24px; border-radius:18px;
        background:linear-gradient(135deg,#fffdf7,var(--rv-cream));
        border:1px solid var(--rv-line);
      }
      .cv-rv-form-title{ font-family:'Playfair Display',serif; font-size:19px; color:var(--rv-green); margin:0 0 16px; }
      .cv-rv-label{ display:block; font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--rv-mute); margin-bottom:8px; }

      .cv-rv-input-stars{ display:flex; align-items:center; gap:4px; margin-bottom:6px; }
      .cv-star-btn{ background:none; border:none; padding:2px; cursor:pointer; line-height:0; }
      .cv-star-btn svg{ width:30px; height:30px; fill:#dcd6c6; transition:transform .12s ease, fill .12s ease; }
      .cv-star-btn.on svg{ fill:var(--rv-gold); }
      .cv-star-btn:hover svg{ transform:scale(1.18); }
      .cv-rv-rating-text{ margin-left:10px; font-weight:700; font-size:13px; color:var(--rv-teal); }

      .cv-rv-textarea{
        width:100%; border:1.5px solid var(--rv-line); border-radius:12px; padding:13px 15px;
        font:inherit; font-size:14px; color:var(--rv-ink); background:#fff; resize:vertical; min-height:110px;
        transition:border-color .18s ease, box-shadow .18s ease; margin-bottom:6px;
      }
      .cv-rv-textarea::placeholder{ color:#b4b0a4; }
      .cv-rv-textarea:focus{ outline:none; border-color:var(--rv-teal); box-shadow:0 0 0 3px rgba(65,133,118,.14); }

      .cv-rv-err{ color:#d64541; font-size:12.5px; font-weight:600; margin:2px 0 8px; }

      .cv-rv-submit{
        margin-top:12px; cursor:pointer; border:none; border-radius:99px; padding:12px 30px;
        font-weight:700; font-size:14px; color:#fff;
        background:linear-gradient(135deg,var(--rv-green),var(--rv-teal));
        box-shadow:0 10px 22px rgba(26,50,45,.22); transition:transform .18s ease, filter .18s ease;
      }
      .cv-rv-submit:hover:not(:disabled){ transform:translateY(-1px); filter:brightness(1.08); }
      .cv-rv-submit:disabled{ opacity:.65; cursor:default; }

      .cv-rv-login{
        margin-top:18px; padding:16px 20px; border-radius:14px; text-align:center;
        background:var(--rv-cream); border:1px solid var(--rv-line); color:var(--rv-ink); font-size:14px;
      }
      .cv-rv-login a{ color:var(--rv-teal); font-weight:700; text-decoration:none; }
      .cv-rv-login a:hover{ text-decoration:underline; }
    `],
    template: `
    <section class="cv-reviews">

      <!-- Rating summary -->
      <div class="cv-rv-summary" *ngIf="reviews.length">
        <div class="cv-rv-score">
          <div class="cv-rv-avg">{{ averageRating | number:'1.1-1' }}</div>
          <div class="cv-stars">
            <svg class="cv-ico-star" [class.filled]="s <= Math.round(averageRating)" viewBox="0 0 24 24" *ngFor="let s of [1,2,3,4,5]"><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.8 5.9 20.3l1.3-6.7-5-4.6 6.8-.8z"/></svg>
          </div>
          <div class="cv-rv-count">{{ reviews.length }} review{{ reviews.length === 1 ? '' : 's' }}</div>
        </div>
        <div class="cv-rv-bars">
          <div class="cv-rv-bar" *ngFor="let s of [5,4,3,2,1]">
            <span class="cv-rv-bar-label">{{ s }} ★</span>
            <div class="cv-rv-track"><div class="cv-rv-fill" [style.width.%]="ratingPercent(s)"></div></div>
            <span class="cv-rv-bar-n">{{ ratingCount(s) }}</span>
          </div>
        </div>
      </div>

      <h3 class="cv-rv-title">Customer Reviews <span>({{ reviews.length }})</span></h3>

      <!-- Empty state -->
      <div class="cv-rv-empty" *ngIf="reviews.length === 0">
        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <h5>No reviews yet</h5>
        <p>Be the first to share your experience with this fragrance.</p>
      </div>

      <!-- Review list -->
      <div class="cv-rv-list">
        <article class="cv-rv-card" *ngFor="let review of visibleReviews">
          <div class="cv-rv-card-head">
            <div class="cv-rv-avatar">{{ initial(review) }}</div>
            <div class="cv-rv-who">
              <span class="cv-rv-name">{{ review.user?.name || 'Verified Buyer' }}<span class="cv-rv-verified">Verified</span></span>
              <span class="cv-rv-date">{{ review.createdAt | date:'mediumDate' }}</span>
            </div>
            <div class="cv-stars">
              <svg class="cv-ico-star" [class.filled]="s <= review.rating" viewBox="0 0 24 24" *ngFor="let s of [1,2,3,4,5]"><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.8 5.9 20.3l1.3-6.7-5-4.6 6.8-.8z"/></svg>
            </div>
          </div>
          <p class="cv-rv-text">{{ review.comment }}</p>
        </article>
      </div>

      <button *ngIf="hasMoreReviews" type="button" class="cv-rv-more" (click)="showMoreReviews()">Show more reviews</button>

      <!-- Write a review -->
      <div class="cv-rv-form-card" *ngIf="isLoggedIn; else loginPrompt">
        <h4 class="cv-rv-form-title">Write a review</h4>
        <form [formGroup]="reviewForm" (ngSubmit)="submitReview()">
          <label class="cv-rv-label">Your rating</label>
          <div class="cv-rv-input-stars" (mouseleave)="hoverRating = 0">
            <button type="button" class="cv-star-btn" *ngFor="let star of [1,2,3,4,5]"
              [class.on]="(hoverRating || reviewForm.get('rating')?.value) >= star"
              (mouseenter)="hoverRating = star" (click)="setRating(star)" [attr.aria-label]="star + ' star'">
              <svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.8 5.9 20.3l1.3-6.7-5-4.6 6.8-.8z"/></svg>
            </button>
            <span class="cv-rv-rating-text">{{ ratingWord(hoverRating || reviewForm.get('rating')?.value) }}</span>
          </div>
          <div *ngIf="submitted && reviewForm.get('rating')?.hasError('required')" class="cv-rv-err">Please select a rating</div>

          <label class="cv-rv-label" for="review-text">Your review</label>
          <textarea id="review-text" class="cv-rv-textarea" rows="4" formControlName="comment"
            placeholder="What did you love about it? How long does the scent last?"></textarea>
          <div *ngIf="submitted && reviewForm.get('comment')?.hasError('required')" class="cv-rv-err">Please write a few words</div>

          <button type="submit" class="cv-rv-submit" [disabled]="isSubmitting">
            {{ isSubmitting ? 'Submitting…' : 'Submit Review' }}
          </button>
        </form>
      </div>

      <ng-template #loginPrompt>
        <div class="cv-rv-login">Please <a href="/signin">sign in</a> to share your review.</div>
      </ng-template>

    </section>
  `
})
export class ProductReviewsComponent implements OnInit {
    @Input() productId!: number | string;
    Math = Math;
    reviews: any[] = [];
    readonly initialVisibleCount = 5;
    visibleCount = this.initialVisibleCount;
    reviewForm: FormGroup;
    isLoggedIn = false;
    isSubmitting = false;
    submitted = false;
    hoverRating = 0;

    constructor(
        private reviewService: ReviewService,
        private authService: AuthService,
        private fb: FormBuilder,
        private snackBar: MatSnackBar
    ) {
        this.reviewForm = this.fb.group({
            rating: [5, Validators.required],
            comment: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        if (this.productId) {
            this.loadReviews();
        }
        this.isLoggedIn = this.authService.isLoggedIn();
    }

    loadReviews(): void {
        this.reviewService.getReviews(this.productId).subscribe({
            next: (res) => {
                if (res.success) {
                    this.reviews = res.data;
                    this.visibleCount = this.initialVisibleCount;
                }
            }
        });
    }

    get visibleReviews(): any[] {
        return this.reviews.slice(0, this.visibleCount);
    }

    get hasMoreReviews(): boolean {
        return this.reviews.length > this.visibleCount;
    }

    get averageRating(): number {
        if (!this.reviews.length) return 0;
        const sum = this.reviews.reduce((t, r) => t + Number(r.rating || 0), 0);
        return sum / this.reviews.length;
    }

    ratingCount(star: number): number {
        return this.reviews.filter((r) => Math.round(Number(r.rating || 0)) === star).length;
    }

    ratingPercent(star: number): number {
        if (!this.reviews.length) return 0;
        return (this.ratingCount(star) / this.reviews.length) * 100;
    }

    ratingWord(n: number): string {
        return ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][n] || '';
    }

    initial(review: any): string {
        return String(review?.user?.name || 'U').charAt(0).toUpperCase();
    }

    showMoreReviews(): void {
        this.visibleCount = this.reviews.length;
    }

    setRating(rating: number): void {
        this.reviewForm.patchValue({ rating });
    }

    submitReview(): void {
        this.submitted = true;
        if (this.reviewForm.invalid) return;

        const user = this.authService.getCurrentUser();
        if (!user) return;

        this.isSubmitting = true;
        const payload = {
            user_id: user.id || user.user_id,
            product_id: Number(this.productId),
            rating: this.reviewForm.value.rating,
            comment: this.reviewForm.value.comment
        };

        this.reviewService.addReview(payload).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                if (res.success) {
                    this.snackBar.open('Review submitted!', 'Close', { duration: 3000 });
                    this.reviewForm.reset({ rating: 5 });
                    this.submitted = false;
                    this.hoverRating = 0;
                    this.loadReviews();
                } else {
                    this.snackBar.open(res.message || 'Error', 'Close', { duration: 3000 });
                }
            },
            error: (err) => {
                this.isSubmitting = false;
                console.error(err);
                this.snackBar.open('Failed to submit review', 'Close', { duration: 3000 });
            }
        });
    }
}
