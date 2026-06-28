/* eslint-disable @typescript-eslint/no-empty-function */
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, UntypedFormGroup } from '@angular/forms';
@Component({
    selector: 'app-redirect-note',
    templateUrl: './redirect-note.component.html',
    styleUrls: ['./redirect-note.component.scss'],
    imports: [
        FormsModule,
        MatButtonModule,
        RouterLink,
    ]
})
export class RedirectNot {

  constructor() { }





}
