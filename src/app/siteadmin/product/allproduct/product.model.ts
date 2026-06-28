// product.model.ts
export class Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  compare_price: number;
  cost_price: number;
  quantity: number;
  stock?: number;
  sku: string;
  images: any[];
  rating: number;
  status: boolean; // 🆕 CHANGED: from number to boolean
  is_featured: boolean;
  is_published: boolean;
  brand_id: number;
  product_type_id: number;
  specifications: any;
  tags: string[];
  weight: number;
  weight_unit: string;
  dimensions: any;
  seo_title: string;
  seo_description: string;
  calories: string;
  ingredients: string;
  delivery_info: string;
  track_quantity: boolean;
  review_count: number;
  category_name?: string;
  created_at?: string;
  updated_at?: string;

  constructor(product?: Partial<Product>) {
    this.id = product?.id || 0;
    this.category_id = product?.category_id || 0;
    this.name = product?.name || '';
    this.slug = product?.slug || '';
    this.short_description = product?.short_description || '';
    this.description = product?.description || '';
    this.price = product?.price || 0;
    this.compare_price = product?.compare_price || 0;
    this.cost_price = product?.cost_price || 0;
    this.quantity = product?.quantity || 0;
    this.stock = product?.stock ?? product?.quantity ?? 0;
    this.sku = product?.sku || '';
    this.images = product?.images || [];
    this.rating = product?.rating || 0;
    this.status = product?.status !== undefined ? Boolean(product.status) : true; // 🆕 FIXED: Convert to boolean
    this.is_featured = product?.is_featured || false;
    this.is_published = product?.is_published ?? true;
    this.brand_id = product?.brand_id || 0;
    this.product_type_id = (product as any)?.product_type_id || 0;
    this.specifications = product?.specifications || {};
    this.tags = product?.tags || [];
    this.weight = product?.weight || 0;
    this.weight_unit = (product as any)?.weight_unit || 'ml';
    this.dimensions = product?.dimensions || {};
    this.seo_title = product?.seo_title || '';
    this.seo_description = product?.seo_description || '';
    this.calories = product?.calories || '';
    this.ingredients = product?.ingredients || '';
    this.delivery_info = product?.delivery_info || '';
    this.track_quantity = product?.track_quantity ?? true;
    this.review_count = product?.review_count || 0;
    this.category_name = product?.category_name || '';
    this.created_at = product?.created_at || '';
    this.updated_at = product?.updated_at || '';
  }
}
