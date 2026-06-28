import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';
import { MatDateFormats } from '@angular/material/core';

@Injectable()
export class DynamicDateAdapter extends NativeDateAdapter {
  // default format
  public dateFormat: string = 'DD-MM-YYYY';

  override format(date: Date, displayFormat: any): string {
    if (!date) return '';

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Replace tokens in the format string
    return this.dateFormat
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day);
  }
}
export const DYNAMIC_FORMATS: MatDateFormats = {
  parse: { dateInput: 'input' },  // allow any input
  display: {
    dateInput: 'input',            // shows formatted date
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

