import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CaveroService {
  
  private initialized = false;
  private stickyHeaderBound = false;
  private countInputsBound = false;
  private stickyHeaderTicking = false;

  constructor(@Inject(PLATFORM_ID) private platformId: any) {}

  initializeCavero(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Re-bind interactive Bootstrap components on each call.
    setTimeout(() => {
      this.initializeBootstrap();

      // One-time global listeners
      if (!this.initialized) {
        this.initializeCustomComponents();
        this.initialized = true;
      }
    }, 120);
  }

  private initializeComponentsSafely(): void {
    try {
      this.initializeBootstrap();
      this.initializeSwiper();
      this.initializeCustomComponents();
    } catch (error) {
      console.error('Component initialization error:', error);
    }
  }

  private initializeBootstrap(): void {
    const bootstrap = (window as any).bootstrap;
    if (!bootstrap) {
      console.warn('Bootstrap not found');
      return;
    }

    // Safe initialization with try-catch for each component type
    const initializers = [
      { selector: '[data-bs-toggle="tooltip"]', factory: (el: Element) => bootstrap.Tooltip.getOrCreateInstance(el) },
      { selector: '[data-bs-toggle="dropdown"]', factory: (el: Element) => bootstrap.Dropdown.getOrCreateInstance(el) },
      { selector: '.offcanvas', factory: (el: Element) => bootstrap.Offcanvas.getOrCreateInstance(el) },
      { selector: '.collapse', factory: (el: Element) => bootstrap.Collapse.getOrCreateInstance(el, { toggle: false }) }
    ];

    initializers.forEach(({ selector, factory }) => {
      try {
        document.querySelectorAll(selector).forEach(element => {
          if (element && element.nodeType === Node.ELEMENT_NODE) {
            factory(element);
          }
        });
      } catch (error) {
        console.warn(`Failed to initialize ${selector}:`, error);
      }
    });
  }

  private initializeSwiper(): void {
    const Swiper = (window as any).Swiper;
    if (!Swiper) {
      console.warn('Swiper not found');
      return;
    }

    try {
      document.querySelectorAll('[data-swiper]').forEach(element => {
        if (element && element.nodeType === Node.ELEMENT_NODE) {
          try {
            const config = element.getAttribute('data-swiper');
            const options = config ? JSON.parse(config) : {};
            new Swiper(element, options);
          } catch (error) {
            console.error('Swiper config error:', error);
          }
        }
      });
    } catch (error) {
      console.error('Swiper initialization error:', error);
    }
  }

  private initializeCustomComponents(): void {
    // Initialize sticky header
    this.initializeStickyHeader();
    
    // Initialize count inputs
    this.initializeCountInputs();
  }

  private initializeStickyHeader(): void {
    if (this.stickyHeaderBound) return;
    const stickyElement = document.querySelector('[data-sticky-element]');
    if (!stickyElement) return;

    const syncStickyState = () => {
      if (window.scrollY > 100) {
        stickyElement.classList.add('navbar-stuck');
      } else {
        stickyElement.classList.remove('navbar-stuck');
      }
      this.stickyHeaderTicking = false;
    };

    const handleScroll = () => {
      if (this.stickyHeaderTicking) return;
      this.stickyHeaderTicking = true;
      window.requestAnimationFrame(syncStickyState);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    this.stickyHeaderBound = true;
  }

  private initializeCountInputs(): void {
    if (this.countInputsBound) return;
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const incrementBtn = target.closest('[data-increment]');
      const decrementBtn = target.closest('[data-decrement]');

      if (incrementBtn || decrementBtn) {
        const countInput = incrementBtn?.closest('.count-input') || decrementBtn?.closest('.count-input');
        const input = countInput?.querySelector('input') as HTMLInputElement;
        
        if (input) {
          if (incrementBtn) {
            input.stepUp();
          } else if (decrementBtn) {
            input.stepDown();
          }
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    this.countInputsBound = true;
  }
}
