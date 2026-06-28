import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';

const API = `${environment.apiGatewayBaseUrl}/api/logo-settings`;
const FALLBACK = 'assets/images/cavero-logo.png';

@Component({
  selector: 'app-logo-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  templateUrl: './logo-settings.component.html',
  styleUrls: ['./logo-settings.component.scss']
})
export class LogoSettingsComponent implements OnInit {
  isLoading = true;
  isSaving = false;

  /** the saved logo currently live on the storefront */
  currentLogo: string = FALLBACK;
  hasCustomLogo = false;

  /** the new file the admin picked (not yet uploaded) */
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  fileError = '';

  // recommended-spec constants surfaced in the instructions panel
  readonly REC_WIDTH = 480;
  readonly REC_HEIGHT = 160;
  readonly MAX_MB = 2;
  readonly ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadLogo();
  }

  private loadLogo(): void {
    this.isLoading = true;
    this.http.get<any>(API).subscribe({
      next: (res) => {
        const url = res?.data?.logo_url;
        if (url) {
          this.currentLogo = `${environment.apiGatewayBaseUrl}${url}`;
          this.hasCustomLogo = true;
        } else {
          this.currentLogo = FALLBACK;
          this.hasCustomLogo = false;
        }
        this.isLoading = false;
      },
      error: () => {
        this.currentLogo = FALLBACK;
        this.hasCustomLogo = false;
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    this.fileError = '';
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    const okType = /^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type);
    if (!okType) {
      this.fileError = 'Unsupported format. Use a PNG, JPG, WEBP or SVG image.';
      this.clearSelection();
      return;
    }
    if (file.size > this.MAX_MB * 1024 * 1024) {
      this.fileError = `File is too large. Maximum size is ${this.MAX_MB} MB.`;
      this.clearSelection();
      return;
    }

    this.selectedFile = file;
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = URL.createObjectURL(file);
  }

  clearSelection(): void {
    this.selectedFile = null;
    if (this.previewUrl) { URL.revokeObjectURL(this.previewUrl); this.previewUrl = null; }
  }

  upload(): void {
    if (!this.selectedFile) return;
    this.isSaving = true;
    const form = new FormData();
    form.append('logo', this.selectedFile);

    this.http.post<any>(API, form).subscribe({
      next: (res) => {
        this.isSaving = false;
        const url = res?.data?.logo_url;
        if (url) {
          this.currentLogo = `${environment.apiGatewayBaseUrl}${url}?t=${Date.now()}`;
          this.hasCustomLogo = true;
        }
        this.clearSelection();
        this.snackBar.open('Logo updated successfully!', '', { duration: 2500, panelClass: 'snackbar-success' });
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err?.error?.message || 'Failed to upload logo.';
        this.snackBar.open(msg, '', { duration: 3000, panelClass: 'snackbar-danger' });
      }
    });
  }

  resetToDefault(): void {
    this.isSaving = true;
    this.http.delete<any>(API).subscribe({
      next: () => {
        this.isSaving = false;
        this.currentLogo = FALLBACK;
        this.hasCustomLogo = false;
        this.clearSelection();
        this.snackBar.open('Reverted to the default logo.', '', { duration: 2500, panelClass: 'snackbar-success' });
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('Failed to reset logo.', '', { duration: 3000, panelClass: 'snackbar-danger' });
      }
    });
  }
}
