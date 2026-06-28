import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogContent,
  MatDialogClose,
} from '@angular/material/dialog';
import { Component, ElementRef, Inject, OnInit } from '@angular/core';
import { CmsService } from '../../cmspage.service';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '@core/service/auth.service';
import { Router } from '@angular/router';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';

export interface DialogData {
  id: number;
  action: string;
  cmsPage: any;
}

@Component({
  selector: 'app-cms-form-dialog',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatDialogClose,
    CommonModule,
    CKEditorModule
  ]
})
export class CmsFormDialogComponent implements OnInit {
  public Editor: any;
  
  public editorConfig = {
    toolbar: {
      items: [
        'heading',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'link',
        'imageUpload',
        'mediaEmbed',
        'insertTable',
        '|',
        'undo',
        'redo',
        '|',
        'sourceEditing'
      ]
    },
    language: 'en',
    image: {
      toolbar: [
        'imageTextAlternative',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side'
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells'
      ]
    },
    licenseKey: ''
  };

  action: string;
  dialogTitle: string;
  cmsForm!: UntypedFormGroup;
  cmsPage: any;
  token: any;
  today: Date = new Date();
  isEditorLoaded = false;

  constructor(
    public dialogRef: MatDialogRef<CmsFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public cmsService: CmsService,
    private fb: UntypedFormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.action = data.action;
    this.dialogTitle = this.action === 'edit' ? `Edit ${data.cmsPage.title}` : 'Add New CMS Page';
    this.cmsPage = this.action === 'edit' ? data.cmsPage : {};
    this.cmsForm = this.createCmsForm();
    
    // Load CKEditor asynchronously
    this.loadCKEditor();
  }

  ngOnInit(): void {
    this.token = this.authService.getDecodeToken();
  }

  async loadCKEditor() {
    try {
      // Method 1: Try to use DecoupledDocument build first (it might already have source editing)
      await this.tryDecoupledDocument();
    } catch (error) {
      console.error('Error loading CKEditor:', error);
      // Method 2: Fallback to simple approach
      await this.loadSimpleEditor();
    }
  }

  async tryDecoupledDocument() {
    try {
      const { default: DecoupledEditor } = await import('@ckeditor/ckeditor5-build-decoupled-document');
      this.Editor = DecoupledEditor;
      this.isEditorLoaded = true;
      console.log('Decoupled Document Editor loaded successfully');
      
      // Check available features
      this.checkAvailableFeatures();
    } catch (error) {
      throw error;
    }
  }

  async loadSimpleEditor() {
    try {
      // Simple approach - use ClassicEditor without extending
      const { default: ClassicEditor } = await import('@ckeditor/ckeditor5-build-classic');
      this.Editor = ClassicEditor;
      this.isEditorLoaded = true;
      console.log('Classic Editor loaded as fallback');
    } catch (error) {
      console.error('Error loading fallback editor:', error);
      this.isEditorLoaded = false;
    }
  }

  checkAvailableFeatures() {
    // This will help us see what features are available
    if (this.Editor && this.Editor.builtinPlugins) {
      const pluginNames = this.Editor.builtinPlugins.map((plugin: any) => {
        return plugin.pluginName || plugin.name || plugin.constructor.name;
      });
      console.log('Available plugins:', pluginNames);
      
      // Check if source editing is available
      const hasSourceEditing = pluginNames.some((name: string) => 
        name.toLowerCase().includes('source') || name === 'SourceEditing'
      );
      console.log('Source editing available:', hasSourceEditing);
      
      if (!hasSourceEditing) {
        console.warn('Source editing not found in build. Available toolbar items may be limited.');
        // Remove sourceEditing from config if not available
        this.editorConfig.toolbar.items = this.editorConfig.toolbar.items.filter(
          (item: string) => item !== 'sourceEditing'
        );
      }
    }
  }

  onEditorReady(editor: any) {
    console.log('Editor ready:', editor);
    
    // For decoupled editor, attach toolbar
    const toolbarContainer = document.querySelector('.document-editor__toolbar');
    if (toolbarContainer && editor.ui && editor.ui.view && editor.ui.view.toolbar) {
      toolbarContainer.appendChild(editor.ui.view.toolbar.element);
      console.log('Toolbar attached for decoupled editor');
    }
    
    // Log available toolbar items
    if (editor.ui && editor.ui.view && editor.ui.view.toolbar) {
      const items = editor.ui.view.toolbar.items.map((item: any) => 
        item.label || item.constructor.name
      );
      console.log('Available toolbar items:', items);
    }
  }

  createCmsForm(): UntypedFormGroup {
    const rawStatus = this.cmsPage.status;
    const statusBool = rawStatus === 'Active' ? true : rawStatus === 'Inactive' ? false : rawStatus !== undefined ? Boolean(rawStatus) : true;
    return this.fb.group({
      id: [this.cmsPage.id],
      title: [this.cmsPage.title || '', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
      slug: [this.cmsPage.slug || '', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
      content: [this.cmsPage.content || '', [Validators.required, Validators.minLength(20)]],
      meta_title: [this.cmsPage.meta_title || '', [Validators.maxLength(160)]],
      meta_description: [this.cmsPage.meta_description || '', [Validators.maxLength(320)]],
      status: [statusBool, [Validators.required]],
    });
  }

  generateSlug() {
    const title = this.cmsForm.get('title')?.value;
    if (title && !this.cmsForm.get('slug')?.value) {
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      this.cmsForm.patchValue({ slug });
    }
  }

  submit() {
    if (this.cmsForm.valid) {
      const rawSt = this.cmsForm.value.status;
      const formData = {
        ...this.cmsForm.value,
        title: String(this.cmsForm.value.title || '').trim(),
        slug: String(this.cmsForm.value.slug || '').trim(),
        meta_title: String(this.cmsForm.value.meta_title || '').trim(),
        meta_description: String(this.cmsForm.value.meta_description || '').trim(),
        status: rawSt === true || rawSt === 'true' || rawSt === 'Active' ? true : false,
      };
      
      if (this.action === 'edit') {
        this.cmsService.updateCmsPage(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
            this.showSuccessNotification('CMS page updated successfully!');
          },
          error: (err) => {
            console.error('Error updating CMS page:', err);
            this.showErrorNotification('Failed to update CMS page');
          }
        });
      } else {
        this.cmsService.addCmsPage(formData).subscribe({
          next: (res) => {
            this.dialogRef.close(res.data);
            this.showSuccessNotification('CMS page added successfully!');
          },
          error: (err) => {
            console.error('Error adding CMS page:', err);
            this.showErrorNotification('Failed to add CMS page');
          }
        });
      }
    } else {
      this.markFormGroupTouched(this.cmsForm);
    }
  }

  private markFormGroupTouched(formGroup: UntypedFormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof UntypedFormControl) {
        control.markAsTouched();
      } else if (control instanceof UntypedFormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showSuccessNotification(message: string) {
    console.log('Success:', message);
  }

  private showErrorNotification(message: string) {
    console.error('Error:', message);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    this.submit();
  }

  getFormControl(controlName: string): UntypedFormControl {
    return this.cmsForm.get(controlName) as UntypedFormControl;
  }
}
