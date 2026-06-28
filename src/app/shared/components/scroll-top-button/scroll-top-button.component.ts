import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-scroll-top-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scroll-top-button.component.html',
  styleUrls: ['./scroll-top-button.component.scss']
})
export class ScrollTopButtonComponent implements OnInit, OnDestroy {
  isVisible = false;
  private readonly scrollThreshold = 280;
  private readonly subscriptions = new Subscription();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.updateVisibility();

    this.subscriptions.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.updateVisibility();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateVisibility();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateVisibility();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updateVisibility(): void {
    if (typeof window === 'undefined') {
      this.isVisible = false;
      return;
    }

    this.isVisible = window.scrollY > this.scrollThreshold;
  }
}
