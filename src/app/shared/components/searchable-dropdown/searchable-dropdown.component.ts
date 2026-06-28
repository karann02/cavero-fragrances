import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef,
  OnInit,
  OnChanges
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { CapitalizePipe } from "../../../pipe/capitalize.pipe";
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    CapitalizePipe,
    TranslateModule
  ],
  templateUrl: './searchable-dropdown.component.html',
  styleUrls: ['./searchable-dropdown.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableDropdownComponent),
      multi: true
    }
  ]
})
export class SearchableDropdownComponent implements ControlValueAccessor {
  @Input() optionDisabled?: string; // the property in the object that marks it disabled
  @Input() options: any[] = [];
  @Input() optionLabel!: string | string[]; // allow array
  @Input() optionValue!: string;
  @Input() placeholder: string = 'Select...';
  @Input() disabled: boolean = false;
  @Input() value: any;
  isDisabled = false;

  @Input() label: string | null = null;
  @Output() selectionChange = new EventEmitter<any>();
  @Output() valueChange = new EventEmitter<any>();

  searchText: string = '';
  filteredOptions: any[] = [];
  selectedValue: any;

  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit() {
    this.filteredOptions = [...this.options];
  }

  ngOnChanges() {
    this.filteredOptions = [...this.options];
  }

  // ✅ mark form control as touched
  markAsTouched() {
    this.onTouched();
  }

  filterOptions() {
    const search = this.searchText.toLowerCase();
    this.filteredOptions = this.options.filter(opt => {
      const label = this.getNestedValue(opt, this.optionLabel)?.toString().toLowerCase();
      return label?.includes(search);
    });
  }

  clearSearch() {
    this.searchText = '';
    this.filteredOptions = [...this.options];
  }

  onSelectionChange(event: any) {
    this.value = event.value;
    this.onChange(this.value);            // update formControlName
    this.selectionChange.emit(event.value);
    this.valueChange.emit(this.value);    // two-way binding
    this.markAsTouched();                 // ✅ mark touched
    this.clearSearch();
  }

  onDropdownOpenChange(opened: boolean) {
    if (!opened) {
      this.markAsTouched();               // ✅ mark touched on close
      this.clearSearch();
    }
  }

  // getNestedValue(obj: any, path: string) {
  //   return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  // }
  // getNestedValue(obj: any, path: string | string[]): string {
  //   if (Array.isArray(path)) {
  //     return path.map(p => obj?.[p] ?? '').join(' ');
  //   } else {
  //     return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  //   }
  // }
  getNestedValue(obj: any, path: string | string[]): any {
    if (Array.isArray(path)) {
      return path
        .map(p => p.split('.').reduce((acc, part) => acc && acc[part], obj))
        .filter(Boolean)   // remove null/undefined
        .join(' ');        // join with space
    } else {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }
  }

  // 🔹 ControlValueAccessor methods
  writeValue(value: any): void {
    this.selectedValue = value;
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
