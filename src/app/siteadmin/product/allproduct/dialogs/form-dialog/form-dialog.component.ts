import {
    MAT_DIALOG_DATA,
    MatDialogRef,
    MatDialogContent,
    MatDialogClose,
} from "@angular/material/dialog";
import {
    Component,
    ElementRef,
    Inject,
    OnInit,
    ViewChild,
} from "@angular/core";
import { ProductService } from "../../product.service";
import {
    UntypedFormControl,
    Validators,
    UntypedFormGroup,
    UntypedFormBuilder,
    FormsModule,
    ReactiveFormsModule,
} from "@angular/forms";
import { Product } from "../../product.model";
import { CommonModule } from "@angular/common";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatSelectModule } from "@angular/material/select";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatChipsModule } from "@angular/material/chips";
import { CategoryService } from "../../../../categories/allcategories/category.service";
import { ProductTypeService } from "../../../../producttype/allproducttypes/producttype.service"; // 🆕 Added
import { AuthService } from "@core/service/auth.service";
import { Router } from "@angular/router";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { LiveAnnouncer } from "@angular/cdk/a11y";
import {
    MatAutocompleteSelectedEvent,
    MatAutocompleteModule,
} from "@angular/material/autocomplete";
import { environment } from "environments/environment";
import { HttpClient } from "@angular/common/http";

export interface DialogData {
    id: number;
    action: string;
    product: Product;
}

interface ProductImage {
    filename: string;
    originalname: string;
    path: string;
    size: number;
    mimetype: string;
    url?: string;
}

@Component({
    selector: "app-product-form-dialog",
    templateUrl: "./form-dialog.component.html",
    styleUrls: ["./form-dialog.component.scss"],
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
        MatCheckboxModule,
        MatSlideToggleModule,
        MatChipsModule,
        MatAutocompleteModule,
        CommonModule,
    ],
})
export class ProductFormComponent implements OnInit {
    @ViewChild("fileInput") fileInput!: ElementRef;
    @ViewChild("tagInput") tagInput!: ElementRef<HTMLInputElement>;

    action: string;
    dialogTitle: string;
    productForm!: UntypedFormGroup;
    product: Product;
    categories: any[] = [];
    parentCategories: any[] = [];
    subCategories: any[] = [];
    token: any;
    today: Date = new Date();

    // File upload properties
    selectedFiles: File[] = [];
    uploadedImages: ProductImage[] = [];
    deletedImages: string[] = [];
    isDragging = false;
    acceptedFileTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
    ];

    separatorKeysCodes: number[] = [ENTER, COMMA];
    allTags: string[] = [
        "Oud",
        "Attar",
        "Floral",
        "Woody",
        "Fresh",
        "Oriental",
        "Citrus",
        "Gourmand",
        "Gift Set",
        "New Arrival",
        "Best Seller",
    ];
    filteredTags: string[] = [];

    concentrationOptions: string[] = [
        "Parfum (Extrait)",
        "Eau de Parfum (EDP)",
        "Eau de Toilette (EDT)",
        "Eau de Cologne (EDC)",
        "Attar / Itr",
        "Body Mist",
    ];

    variants: {
        id?: number;
        name: string;
        sku: string;
        price: number | null;
        compare_price: number | null;
        stock: number | null;
        addStock?: number | null;
        low_stock_threshold: number | null;
        is_active: boolean;
        sort_order: number;
    }[] = [];

    fragranceFamilies: string[] = [
        "Oriental / Oud",
        "Woody",
        "Floral",
        "Fresh / Citrus",
        "Gourmand",
        "Aquatic",
        "Spicy / Amber",
        "Musk",
        "Fougère",
        "Chypre",
    ];
    showSuccessNotification: any;
    showErrorNotification: any;
    tagInputControl = new UntypedFormControl();
    productTypes: any[] = [];
    variantTypes: any[] = [];

    constructor(
        public dialogRef: MatDialogRef<ProductFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData,
        public productService: ProductService,
        private fb: UntypedFormBuilder,
        public categoryService: CategoryService,
        public productTypeService: ProductTypeService, // 🆕 Added
        private authService: AuthService,
        private router: Router,
        private _liveAnnouncer: LiveAnnouncer, // 🆕 Added for tags
        private http: HttpClient,
    ) {
        this.action = data.action;
        this.dialogTitle =
            this.action === "edit"
                ? `Edit ${data.product.name}`
                : "Add New Product";
        this.product = this.action === "edit" ? data.product : new Product({});
        this.productForm = this.createProductForm();

        // Initialize existing data
        if (this.action === "edit") {
            this.initializeExistingImages();
            this.filteredTags = this.allTags.slice();

            // Load from product.variants[] (new relational approach)
            const existingVariants = (this.product as any).variants;
            if (Array.isArray(existingVariants) && existingVariants.length > 0) {
                this.variants = existingVariants.map((v: any, i: number) => ({
                    id: v.id,
                    name: v.name || '',
                    sku: v.sku || '',
                    price: Number(v.price) || 0,
                    compare_price: Number(v.compare_price) || 0,
                    stock: Number(v.stock) || 0,
                    low_stock_threshold: Number(v.low_stock_threshold) || 5,
                    is_active: v.is_active !== false,
                    sort_order: v.sort_order ?? i
                }));
            } else {
                // Backward compat: migrate from specifications.sizes JSONB if present
                const existingSizes = (this.product.specifications as any)?.sizes;
                if (Array.isArray(existingSizes)) {
                    this.variants = existingSizes.map((s: any, i: number) => ({
                        name: s.label || s.name || '',
                        sku: '',
                        price: Number(s.price) || 0,
                        compare_price: Number(s.compare_price) || 0,
                        stock: Number(s.stock) || 0,
                        low_stock_threshold: 5,
                        is_active: true,
                        sort_order: i
                    }));
                }
            }
        }
    }

    ngOnInit(): void {
        this.token = this.authService.getDecodeToken();
        this.fetchCategories();
        this.fetchProductTypes();
        this.loadVariantTypes();

        // Listen to price changes
        this.productForm.get("price")?.valueChanges.subscribe(() => {});

        // Listen to tag changes
        this.productForm.get("tags")?.valueChanges.subscribe(() => {
            this.filterTags();
        });

        // Auto-generate the URL slug from the product name as it's typed/changed
        // (slug field is read-only — it always mirrors the name).
        this.productForm.get("name")?.valueChanges.subscribe((name: string) => {
            this.productForm.get("slug")?.setValue(this.generateSlug(name), { emitEvent: false });
        });
    }

    createProductForm(): UntypedFormGroup {
        return this.fb.group({
            id: [this.product.id],
            name: [
                this.product.name,
                [Validators.required, Validators.minLength(2)],
            ],
            slug: [this.product.slug || this.generateSlug(this.product.name)],
            sku: [
                this.product.sku || this.generateSKU(),
                [Validators.required],
            ],
            description: [this.product.description],
            short_description: [this.product.short_description],
            price: [
                this.product.price,
                [Validators.required, Validators.min(0)],
            ],
            compare_price: [
                this.product.compare_price || 0,
                [Validators.min(0)],
            ],
            // Main stock is derived from the variant stocks on submit — no separate field.
            quantity: [this.product.quantity ?? 0],
            parent_category_id: [null],
            category_id: [this.product.category_id],
            product_type_id: [this.product.product_type_id || null],
            status: [
                this.product.status !== undefined
                    ? Boolean(this.product.status)
                    : true,
            ],
            is_featured: [this.product.is_featured || false],
            is_published: [
                this.product.is_published !== undefined
                    ? this.product.is_published
                    : true,
            ],
            track_quantity: [
                this.product.track_quantity !== undefined
                    ? this.product.track_quantity
                    : true,
            ],
            weight: [this.product.weight || 0, [Validators.min(0)]],
            weight_unit: [this.product.weight_unit || "ml"],
            tags: [this.product.tags || []],
            seo_title: [this.product.seo_title || ""],
            seo_description: [this.product.seo_description || ""],
            specifications: [this.product.specifications || {}],
            dimensions: [this.product.dimensions || {}],
            ingredients: [this.product.ingredients || ""],
            calories: [this.product.calories || ""],
            delivery_info: [this.product.delivery_info || ""],
            concentration: [(this.product.specifications as any)?.concentration || ""],
            fragrance_family: [(this.product.specifications as any)?.fragrance_family || ""],
            gender: [(this.product.specifications as any)?.gender || ""],
        });
    }

    private generateSlug(name: string): string {
        return (name || "")
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]+/g, "")   // drop punctuation (e.g. the & in "Oud & Roses")
            .replace(/[\s_-]+/g, "-")     // spaces/underscores → single hyphen
            .replace(/^-+|-+$/g, "");     // trim leading/trailing hyphens
    }

    private generateSKU(): string {
        return `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    }

    fetchCategories() {
        this.categoryService.getAllCategories().subscribe((res: any) => {
            this.categories = res.data || [];
            this.parentCategories = this.categories;

            if (this.action === "edit" && this.product.category_id) {
                const selectedCategory = this.categories.find(
                    (c: any) => c.id === this.product.category_id,
                );
                if (selectedCategory?.id) {
                    this.productForm.patchValue({
                        parent_category_id: selectedCategory.id,
                        category_id: selectedCategory.id,
                    });
                }
            }
        });
    }

    onParentCategoryChange(parentId: any) {
        if (parentId) {
            this.productForm.patchValue({ category_id: parentId });
        } else {
            this.productForm.patchValue({ category_id: null });
        }
    }

    fetchProductTypes() {
        this.productTypeService.getAllProductTypes().subscribe((res: any) => {
            this.productTypes = res.data || [];
        });
    }

    loadVariantTypes(): void {
        const url = `${environment.apiGatewayBaseUrl}/api/variant-types`;
        this.http.get<any>(url).subscribe({
            next: (res) => {
                this.variantTypes = (res.data || []).filter((t: any) => t.is_active);
                // For a brand-new product, auto-add every predefined size as a variant row
                // so the admin only has to fill in price & stock.
                if (this.action === 'add' && this.variants.length === 0) {
                    this.variantTypes.forEach(t => this.addVariantFromType(t));
                }
            },
            error: () => {}
        });
    }

    isTypeAdded(typeName: string): boolean {
        return this.variants.some(v => v.name.toLowerCase() === typeName.toLowerCase());
    }

    /** Fold the "+ Add" amount into the variant's current stock (old + new), then clear the add field. */
    applyVariantStockAdd(v: { stock: number | null; addStock?: number | null }): void {
        const add = Math.floor(Number(v.addStock) || 0);
        if (add > 0) {
            v.stock = (Number(v.stock) || 0) + add;
        }
        v.addStock = null;
    }

    // --- Stock distribution getters ---
    get mainStock(): number {
        return Number(this.productForm.get('quantity')?.value) || 0;
    }
    get totalVariantStock(): number {
        return this.variants
            .filter(v => String(v.name || '').trim() !== '')
            .reduce((sum, v) => sum + (Number(v.stock) || 0) + (Number(v.addStock) || 0), 0);
    }
    get stockOverflow(): boolean {
        return this.variants.length > 0 && this.mainStock > 0 && this.totalVariantStock > this.mainStock;
    }
    get stockRemaining(): number {
        return this.mainStock - this.totalVariantStock;
    }
    get stockUsedPercent(): number {
        if (this.mainStock === 0) return 0;
        return Math.min(100, Math.round((this.totalVariantStock / this.mainStock) * 100));
    }

    addVariantFromType(type: any): void {
        if (this.isTypeAdded(type.name)) return;
        const sku = this.generateVariantSku(type.name);
        this.variants.push({
            id: undefined,
            // empty (null) instead of 0 so the fields start blank — typing never
            // leaves a leading zero like "0674543". Save coerces null → 0.
            price: null,
            compare_price: null,
            stock: null,
            low_stock_threshold: 5,
            name: type.name,
            sku,
            is_active: true,
            sort_order: this.variants.length
        });
    }

    addTag(event: any): void {
        const value = (event.value || "").trim();
        if (value) {
            const currentTags = this.productForm.get("tags")?.value || [];
            if (!currentTags.includes(value)) {
                currentTags.push(value);
                this.productForm.get("tags")?.setValue(currentTags);
            }
        }
        this.clearTagInput();
    }

    removeTag(tag: string): void {
        const currentTags = this.productForm.get("tags")?.value || [];
        const index = currentTags.indexOf(tag);
        if (index >= 0) {
            currentTags.splice(index, 1);
            this.productForm.get("tags")?.setValue(currentTags);
            this._liveAnnouncer.announce(`Removed ${tag}`);
        }
    }

    selectedTag(event: MatAutocompleteSelectedEvent): void {
        this.addTag({ value: event.option.viewValue });
    }

    private clearTagInput(): void {
        if (this.tagInput?.nativeElement) {
            this.tagInput.nativeElement.value = "";
        }
    }

    private filterTags(): void {
        const currentTags = this.productForm.get("tags")?.value || [];
        const filterValue =
            this.tagInput?.nativeElement?.value?.toLowerCase() || "";
        this.filteredTags = this.allTags.filter(
            (tag) =>
                tag.toLowerCase().includes(filterValue) &&
                !currentTags.includes(tag),
        );
    }

    addVariant(): void {
        const sortOrder = this.variants.length;
        this.variants.push({
            name: '',
            sku: this.generateVariantSku(''),
            price: 0,
            compare_price: 0,
            stock: 0,
            low_stock_threshold: 5,
            is_active: true,
            sort_order: sortOrder
        });
    }

    removeVariant(index: number): void {
        this.variants.splice(index, 1);
        this.variants.forEach((v, i) => { v.sort_order = i; });
    }

    onVariantNameChange(variant: any, name: string): void {
        variant.name = name;
        if (!variant.id) {
            variant.sku = this.generateVariantSku(name);
        }
    }

    generateVariantSku(name: string): string {
        const base = this.productForm.get('sku')?.value || 'VAR';
        const suffix = name
            ? name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
            : Date.now().toString().slice(-4);
        return `${base}-${suffix}`;
    }

    addSpecification(): void {
        const specifications =
            this.productForm.get("specifications")?.value || {};
        const key = `spec_${Date.now()}`;
        specifications[key] = { key: "", value: "" };
        this.productForm.get("specifications")?.setValue(specifications);
    }

    removeSpecification(key: string): void {
        const specifications =
            this.productForm.get("specifications")?.value || {};
        delete specifications[key];
        this.productForm.get("specifications")?.setValue(specifications);
    }

    trackByFn(index: number, item: any): any {
        return item.key || index;
    }

    private initializeExistingImages(): void {
        if (Array.isArray(this.product.images)) {
            this.uploadedImages = this.product.images.map((img: any) => {
                if (typeof img === "object" && img.filename) {
                    return {
                        filename: img.filename,
                        originalname: img.originalname || img.filename,
                        path: img.path || img.url || "",
                        size: img.size || 0,
                        mimetype: img.mimetype || "image/jpeg",
                        url: this.getImageUrl(img),
                    };
                } else if (typeof img === "string") {
                    return {
                        filename: this.extractFilename(img),
                        originalname: this.extractFilename(img),
                        path: img,
                        size: 0,
                        mimetype: "image/jpeg",
                        url: img,
                    };
                }
                return {
                    filename: "unknown",
                    originalname: "unknown",
                    path: "",
                    size: 0,
                    mimetype: "image/jpeg",
                    url: "",
                };
            });
        }
    }

    private extractFilename(path: string): string {
        if (!path) return "unknown";
        return path.split("/").pop() || path.split("\\").pop() || "unknown";
    }

    private getImageUrl(img: any): string {
        if (!img) return "";

        // If it's a data URL (base64), return as is
        if (typeof img === "string" && img.startsWith("data:")) return img;

        // If it's a blob URL, return as is
        if (typeof img === "string" && img.startsWith("blob:")) return img;

        // If img has url property and it's a data URL or blob
        if (
            img.url &&
            (img.url.startsWith("data:") || img.url.startsWith("blob:"))
        )
            return img.url;

        // If img has path property and it's a data URL or blob
        if (
            img.path &&
            (img.path.startsWith("data:") || img.path.startsWith("blob:"))
        )
            return img.path;

        // For server images with filename
        if (img.filename) {
            // Check if it's already a full URL
            if (img.filename.startsWith("http")) return img.filename;
            return (
                environment.apiGatewayBaseUrl +
                "/uploads/products/" +
                img.filename
            );
        }

        // For server images with url
        if (img.url) {
            if (img.url.startsWith("http")) return img.url;
            if (img.url.startsWith("/uploads/"))
                return environment.apiGatewayBaseUrl + img.url;
            if (img.url.startsWith("uploads/"))
                return environment.apiGatewayBaseUrl + "/" + img.url;
            return img.url;
        }

        // If it's a plain string
        if (typeof img === "string") {
            if (img.startsWith("http")) return img;
            if (img.startsWith("/uploads/"))
                return environment.apiGatewayBaseUrl + img;
            if (img.startsWith("uploads/"))
                return environment.apiGatewayBaseUrl + "/" + img;
            return img;
        }

        return "";
    }

    onFileSelected(event: any): void {
        const files: FileList = event.target.files;
        this.processFiles(files);
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
        const files = event.dataTransfer?.files;
        if (files) {
            this.processFiles(files);
        }
    }

    processFiles(files: FileList): void {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!this.acceptedFileTypes.includes(file.type)) {
                this.showErrorNotification(
                    "Invalid file type. Please upload only images (JPEG, PNG, GIF, WebP).",
                );
                continue;
            }
            this.selectedFiles.push(file);
            const reader = new FileReader();
            reader.onload = (e: any) => {
                const image: ProductImage = {
                    filename: file.name,
                    originalname: file.name,
                    path: e.target.result,
                    size: file.size,
                    mimetype: file.type,
                    url: e.target.result,
                };
                this.uploadedImages.push(image);
            };
            reader.readAsDataURL(file);
        }
        if (this.fileInput?.nativeElement) {
            this.fileInput.nativeElement.value = "";
        }
    }

    removeImage(index: number, image: ProductImage): void {
        if (
            image.filename &&
            image.filename !== image.originalname &&
            !image.filename.startsWith("blob:")
        ) {
            this.deletedImages.push(image.filename);
        }
        this.uploadedImages.splice(index, 1);
        const fileIndex = this.selectedFiles.findIndex(
            (file) => file.name === image.originalname,
        );
        if (fileIndex > -1) {
            this.selectedFiles.splice(fileIndex, 1);
        }
    }

    triggerFileInput(): void {
        if (this.fileInput?.nativeElement) {
            this.fileInput.nativeElement.click();
        }
    }

    submit() {
        // Fold any pending "+ Add" amounts into each variant's stock (old + new).
        this.variants.forEach(v => this.applyVariantStockAdd(v));
        // Stock is derived from the variants (the standalone Stock Quantity field was removed).
        // When variants exist, the main stock = sum of variant stocks; otherwise keep what's set.
        if (this.variants.length > 0) {
            this.productForm.get('quantity')?.setValue(this.totalVariantStock);
        }
        if (this.productForm.valid) {
            const formData = new FormData();

            if (
                !this.productForm.value.category_id &&
                this.productForm.value.parent_category_id
            ) {
                this.productForm.patchValue({
                    category_id: this.productForm.value.parent_category_id,
                });
            }

            // Merge perfume-specific fields into specifications JSONB (variants now stored in DB table)
            const perfumeFields = ['concentration', 'fragrance_family', 'gender'];
            const specs = { ...(this.productForm.value.specifications || {}) };
            perfumeFields.forEach((field) => {
                const val = this.productForm.value[field];
                if (val) specs[field] = val;
            });
            delete specs['sizes']; // remove legacy JSONB sizes — variants now in product_variants table
            this.productForm.patchValue({ specifications: specs });

            const skipFields = new Set(perfumeFields);
            Object.keys(this.productForm.value).forEach((key) => {
                if (skipFields.has(key)) return;
                const value = this.productForm.value[key];
                if (value !== null && value !== undefined) {
                    if (typeof value === "object" && !(value instanceof File)) {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, value.toString());
                    }
                }
            });

            // Include variants as JSON so backend can sync the product_variants table
            const validVariants = this.variants.filter(v => String(v.name || '').trim() !== '');
            formData.append('variants', JSON.stringify(validVariants));

            const existingImages = this.uploadedImages.filter(
                (img) =>
                    !this.selectedFiles.some(
                        (file) => file.name === img.originalname,
                    ),
            );
            formData.append("existing_images", JSON.stringify(existingImages));

            if (this.action === "edit" && this.deletedImages.length > 0) {
                formData.append(
                    "deleted_images",
                    JSON.stringify(this.deletedImages),
                );
            }

            this.selectedFiles.forEach((file) => {
                formData.append("images", file, file.name);
            });

            if (this.action === "edit") {
                this.productService
                    .updateProductWithImages(formData)
                    .subscribe({
                        next: (res: any) => {
                            this.dialogRef.close(res?.data);
                        },
                        error: (err: any) => {
                            console.error("Error updating product:", err);
                        },
                    });
            } else {
                this.productService.addProductWithImages(formData).subscribe({
                    next: (res: any) => {
                        this.dialogRef.close(res?.data);
                    },
                    error: (err: any) => {
                        console.error("Error adding product:", err);
                    },
                });
            }
        } else {
            this.markFormGroupTouched(this.productForm);
        }
    }

    private markFormGroupTouched(formGroup: UntypedFormGroup) {
        Object.keys(formGroup.controls).forEach((key) => {
            const control = formGroup.get(key);
            if (control instanceof UntypedFormControl) {
                control.markAsTouched();
            } else if (control instanceof UntypedFormGroup) {
                this.markFormGroupTouched(control);
            }
        });
    }

    get weightUnits(): string[] {
        return ["ml", "fl oz", "g", "oz"];
    }
}
