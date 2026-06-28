export class Brand {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  meta_title: string;
  meta_description: string;
  created_at?: string;
  updated_at?: string;

  constructor(brand?: Partial<Brand>) {
    this.id = brand?.id || 0;
    this.name = brand?.name || '';
    this.slug = brand?.slug || '';
    this.description = brand?.description || '';
    this.logo = brand?.logo || '';
    this.is_featured = brand?.is_featured || false;
    this.is_active = brand?.is_active ?? true;
    this.sort_order = brand?.sort_order || 0;
    this.meta_title = brand?.meta_title || '';
    this.meta_description = brand?.meta_description || '';
    this.created_at = brand?.created_at || '';
    this.updated_at = brand?.updated_at || '';
  }
}