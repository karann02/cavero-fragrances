// pipes/price.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../service/currency.service';

@Pipe({
  name: 'price',
  standalone: true
})
export class PricePipe implements PipeTransform {
  private currencyService = inject(CurrencyService);

  transform(value: number, currencyCode?: string): string {
    return this.currencyService.formatPrice(value, currencyCode);
  }
}