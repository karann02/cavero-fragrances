import { Component, Input } from '@angular/core';
import { FeatherModule } from 'angular-feather';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    imports: [FeatherModule,MatIconModule]
})
export class BreadcrumbComponent {
  @Input()
  title!: string;
  @Input()
  items!: string[];
  @Input()
  active_item!: string;

  constructor() {
    //constructor
  }
  goBack() {
    // Use location.back() to navigate to the previous page
    window.history.back();
  }
}
