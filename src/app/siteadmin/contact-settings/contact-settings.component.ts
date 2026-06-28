import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

const API = `${environment.apiGatewayBaseUrl}/api/contact-settings`;

interface ContactSettingsForm {
  email1: string;
  email2: string;
  seo_title: string;
  seo_keywords: string;
  seo_description: string;
}

@Component({
  selector: 'app-contact-settings',
  standalone: true,
  imports: [CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './contact-settings.component.html',
  styleUrls: ['./contact-settings.component.scss']
})
export class ContactSettingsComponent implements OnInit {
  isSaving = false;
  isLoading = true;

  settings: ContactSettingsForm = {
    email1: '',
    email2: '',
    seo_title: '',
    seo_keywords: '',
    seo_description: ''
  };

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.http.get<any>(API).subscribe({
      next: (res) => {
        const data = res?.data || {};
        this.settings = {
          email1: data.email1 || '',
          email2: data.email2 || '',
          seo_title: data.seo_title || '',
          seo_keywords: data.seo_keywords || '',
          seo_description: data.seo_description || ''
        };
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  save(): void {
    this.isSaving = true;
    const payload = {
      email1: (this.settings.email1 || '').trim(),
      email2: (this.settings.email2 || '').trim(),
      seo_title: (this.settings.seo_title || '').trim(),
      seo_keywords: (this.settings.seo_keywords || '').trim(),
      seo_description: (this.settings.seo_description || '').trim()
    };
    this.http.post<any>(API, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('Contact settings saved!', '', { duration: 2500, panelClass: 'snackbar-success' });
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('Failed to save.', '', { duration: 2500, panelClass: 'snackbar-danger' });
      }
    });
  }
}
