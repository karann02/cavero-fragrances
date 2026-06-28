import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from '../../../environments/environment';

const API = `${environment.authApiBaseUrl}`;

@Component({
  selector: 'app-terms-editor',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    BreadcrumbComponent,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  templateUrl: './terms-editor.component.html',
  styleUrls: ['./terms-editor.component.scss']
})
export class TermsEditorComponent implements OnInit {
  form!: FormGroup;
  isLoading = true;
  isSaving = false;
  pageId: number | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      lastUpdated: ['', Validators.required],
      intro: ['', Validators.required],
      sections: this.fb.array([])
    });
    this.loadPage();
  }

  get sections(): FormArray {
    return this.form.get('sections') as FormArray;
  }

  loadPage(): void {
    this.http.get<any>(`${API}/cms-pages`).subscribe({
      next: (res) => {
        const pages = res.data || res;
        const termsPage = (Array.isArray(pages) ? pages : pages.rows || [])
          .find((p: any) => p.slug === 'terms-and-conditions');
        if (termsPage) {
          this.pageId = termsPage.id;
          try {
            const parsed = JSON.parse(termsPage.content);
            this.form.patchValue({ lastUpdated: parsed.lastUpdated, intro: parsed.intro });
            (parsed.sections || []).forEach((s: any) => this.addSection(s));
          } catch {
            this.addSection();
          }
        } else {
          this.addSection();
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; this.addSection(); }
    });
  }

  addSection(data?: any): void {
    this.sections.push(this.fb.group({
      id: [data?.id || this.generateId()],
      title: [data?.title || '', Validators.required],
      content: [data?.content || '', Validators.required]
    }));
  }

  removeSection(i: number): void {
    this.sections.removeAt(i);
  }

  moveUp(i: number): void {
    if (i === 0) return;
    const arr = this.sections;
    const ctrl = arr.at(i);
    arr.removeAt(i);
    arr.insert(i - 1, ctrl);
  }

  moveDown(i: number): void {
    if (i === this.sections.length - 1) return;
    const arr = this.sections;
    const ctrl = arr.at(i);
    arr.removeAt(i);
    arr.insert(i + 1, ctrl);
  }

  save(): void {
    if (this.form.invalid) return;
    this.isSaving = true;
    const content = JSON.stringify(this.form.value);
    const payload = {
      title: 'Terms and Conditions',
      slug: 'terms-and-conditions',
      content,
      meta_title: 'Terms and Conditions',
      meta_description: 'Terms and Conditions page',
      status: true
    };

    const req = this.pageId
      ? this.http.put<any>(`${API}/cms-pages/${this.pageId}`, { ...payload, id: this.pageId })
      : this.http.post<any>(`${API}/cms-pages`, payload);

    req.subscribe({
      next: (res) => {
        if (!this.pageId) this.pageId = res.data?.id || res.id;
        this.isSaving = false;
        this.snackBar.open('Terms & Conditions saved successfully!', '', { duration: 3000, panelClass: 'snackbar-success' });
      },
      error: () => {
        this.isSaving = false;
        this.snackBar.open('Failed to save. Please try again.', '', { duration: 3000, panelClass: 'snackbar-danger' });
      }
    });
  }

  private generateId(): string {
    return 'section-' + Math.random().toString(36).substr(2, 6);
  }
}
