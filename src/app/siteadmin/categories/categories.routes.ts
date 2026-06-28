import { Route } from '@angular/router';
import { Page404Component } from '../../authentication/page404/page404.component';
export const DOCTOR_ROUTE: Route[] = [
 
  { path: '**', component: Page404Component },
];
