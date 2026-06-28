import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from 'app/app.component';
import { appConfig } from 'app/app.config';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { DynamicDateAdapter, DYNAMIC_FORMATS } from 'app/shared/dynamic-date-adapter';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    DynamicDateAdapter, // <-- provide the class itself
    { provide: DateAdapter, useExisting: DynamicDateAdapter }, // <-- useExisting links DI token
    { provide: MAT_DATE_FORMATS, useValue: DYNAMIC_FORMATS },
  ],
})
.catch(err => console.error(err));
