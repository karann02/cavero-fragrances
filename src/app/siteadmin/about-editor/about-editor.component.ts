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
import { MatTabsModule } from '@angular/material/tabs';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from '../../../environments/environment';

const API = `${environment.apiGatewayBaseUrl}/api/about-settings`;

@Component({
  selector: 'app-about-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatTabsModule],
  templateUrl: './about-editor.component.html',
  styleUrls: ['./about-editor.component.scss']
})
export class AboutEditorComponent implements OnInit {
  isSaving = false;
  isLoading = true;

  data: any = {
    hero_title: 'Welcome to Cavero Fragrances',
    hero_subtitle: 'We believe that quality wellness products are available to everyone',
    story_title: 'Our story — designed to inspire a healthier life',
    story_text: 'At Cavero Fragrances, we are passionate about bringing you the finest Arabian perfumes and Oud fragrances.',
    story_stat_value: '500+',
    story_stat_label: 'products made with natural and eco-friendly ingredients',
    quote: '"Every Cavero Fragrances product is an opportunity to create value for our customers."',
    features: [
      { icon: 'ci-leaf', title: 'Natural Ingredients', text: 'All our products are crafted with natural, eco-friendly ingredients.' },
      { icon: 'ci-star', title: 'Unbeatable Quality', text: 'We source raw materials from the best manufacturers.' },
      { icon: 'ci-delivery', title: 'Delivery to Your Door', text: 'We deliver anywhere in India within 3-5 business days.' }
    ],
    values: [
      { icon: 'ci-heart', title: 'Customer Focus', text: 'We give each customer the attention they deserve.' },
      { icon: 'ci-check-circle', title: 'Attention to Detail', text: 'We carefully monitor every step from sourcing to packaging.' },
      { icon: 'ci-shield-check', title: 'Trusted Quality', text: 'Our reputation is built on integrity and quality.' }
    ],
    stats: [
      { value: '50K+', label: 'Happy Customers' },
      { value: '500+', label: 'Products' },
      { value: '7+', label: 'Years Experience' },
      { value: '4.9★', label: 'Average Rating' }
    ]
  };

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.http.get<any>(API).subscribe({
      next: (res) => {
        if (res?.data) this.data = { ...this.data, ...res.data };
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  addFeature(): void {
    this.data.features.push({ icon: 'ci-star', title: '', text: '' });
  }
  removeFeature(i: number): void { this.data.features.splice(i, 1); }

  addValue(): void {
    this.data.values.push({ icon: 'ci-heart', title: '', text: '' });
  }
  removeValue(i: number): void { this.data.values.splice(i, 1); }

  addStat(): void { this.data.stats.push({ value: '', label: '' }); }
  removeStat(i: number): void { this.data.stats.splice(i, 1); }

  save(): void {
    this.isSaving = true;
    this.http.post<any>(API, this.data).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('About page saved!', '', { duration: 2500, panelClass: 'snackbar-success' });
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('Failed to save.', '', { duration: 2500, panelClass: 'snackbar-danger' });
      }
    });
  }
}
