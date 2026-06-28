// components/currency-selector/currency-selector.component.ts
import { Component, inject } from '@angular/core';
import { CurrencyService } from '../../core/service/currency.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-currency-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select 
      [(ngModel)]="currentCurrency" 
      (ngModelChange)="onCurrencyChange($event)"
      class="form-select"
    >
      <option *ngFor="let currency of currencies()" [value]="currency.code">
        {{ currency.code }} ({{ currency.symbol }})
      </option>
    </select>
  `,
  styles: [`
    .form-select {
      padding: 0.375rem 1.75rem 0.375rem 0.75rem;
      border-radius: 4px;
      border: 1px solid #ced4da;
      background-color: #fff;
    }
  `]
})
export class CurrencySelectorComponent {
  private currencyService = inject(CurrencyService);
  
  currencies = this.currencyService.currencies;
  currentCurrency = this.currencyService.currentCurrency().code;

  onCurrencyChange(code: string) {
    console.log("code",code);
    this.currencyService.setCurrency(code);
  }
}