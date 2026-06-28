import { Injectable, effect, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, tap } from 'rxjs';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate?: number;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private baseCurrency = signal<string>('INR');
  private availableCurrencies: Currency[] = [
    { code: 'INR', name: 'Indian Rupee', symbol: '\u20B9', rate: 1 },
    { code: 'USD', name: 'US Dollar', symbol: '$', rate: 0.012 },
    { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.011 },
    { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.0096 },
  ];

  currencies = signal<Currency[]>(this.availableCurrencies);
  currentCurrency = signal<Currency>(this.availableCurrencies[0]);

  constructor(private http: HttpClient) {
    this.initialize();
    effect(() => {
      const currency = this.currentCurrency();
      console.log('Currency changed to:', currency.code);
    });
  }

  initialize() {
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency && this.availableCurrencies.some(c => c.code === savedCurrency)) {
      this.setCurrency(savedCurrency);
    } else {
      this.setCurrency(this.baseCurrency());
    }
    this.loadExchangeRates();
  }

  private loadExchangeRates() {
    const apiUrl = `https://api.exchangerate-api.com/v4/latest/${this.baseCurrency()}`;

    this.http.get<any>(apiUrl).pipe(
      map(response => {
        return this.availableCurrencies.map(currency => ({
          ...currency,
          rate: response.rates[currency.code] || currency.rate || 1,
        }));
      }),
      tap(currencies => this.currencies.set(currencies)),
      catchError(error => {
        console.error('Failed to load exchange rates:', error);
        return of(this.availableCurrencies);
      })
    ).subscribe();
  }

  setCurrency(currencyCode: string) {
    const currency = this.currencies().find(c => c.code === currencyCode);
    if (currency) {
      this.currentCurrency.set(currency);
      localStorage.setItem('preferredCurrency', currencyCode);
    }
  }

  convertPrice(price: number, toCurrency?: string): number {
    const targetCurrency = toCurrency
      ? this.currencies().find(c => c.code === toCurrency)
      : this.currentCurrency();

    if (!targetCurrency || !targetCurrency.rate) return price;
    return price * (targetCurrency.rate || 1);
  }

  formatPrice(price: number, currencyCode?: string): string {
    const currency = currencyCode
      ? this.currencies().find(c => c.code === currencyCode)
      : this.currentCurrency();

    if (!currency) return price.toString();

    const convertedPrice = this.convertPrice(price, currency.code);
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedPrice);
  }
}


