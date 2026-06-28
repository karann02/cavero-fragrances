import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService, Role } from '@core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
@Component({
    selector: 'app-locked',
    templateUrl: './locked.component.html',
    styleUrls: ['./locked.component.scss'],
    imports: [
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        RouterLink,
    ]
})
export class LockedComponent implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  userImg!: string;
  userFullName!: string;
  hide = true;
  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // constuctor
  }
  ngOnInit() {
    this.authForm = this.formBuilder.group({
      password: ['', Validators.required],
    });
    // this.userImg = this.authService.currentUserValue.img;
    // this.userFullName =
    //   this.authService.currentUserValue.firstName +
    //   ' ' +
    //   this.authService.currentUserValue.lastName;
  }
  get f() {
    return this.authForm.controls;
  }
  onSubmit() {
    this.submitted = true;
    // stop here if form is invalid
    if (this.authForm.invalid) {
      return;
    } else {
      const token = this.authService.getDecodeToken();
      console.log('Decoded token:', token.role);

        if (token.role === Role.HospitalGroupAdmin) {
          console.log('token',token);
          this.router.navigate(['/admin/dashboard/main']);
        } else if (token.role === Role.Doctor) {
          this.router.navigate(['/doctor/dashboard']);
        } else if (token.role === Role.Patient) {
          this.router.navigate(['/patient/dashboard']);
        } else {
       this.router.navigate(['/signin']);
       }
    }
  }
}
