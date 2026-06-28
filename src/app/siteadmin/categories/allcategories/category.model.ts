import { formatDate } from '@angular/common';

export class Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  status: boolean;
  parent_id: string | null;
  is_featured: boolean;
  sort_order: number;
  meta_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;

  constructor(category: Partial<Category> = {}) {
    this.id = category.id || this.getRandomID();
    this.name = category.name || '';
    this.slug = category.slug || '';
    this.description = category.description || '';
    this.image_url = category.image_url || '';
    this.status = category.status !== undefined ? category.status : true;
    this.parent_id = category.parent_id || null;
    this.is_featured = category.is_featured || false;
    this.sort_order = category.sort_order || 0;
    this.meta_title = category.meta_title || '';
    this.meta_description = category.meta_description || '';
    this.created_at = category.created_at || '';
    this.updated_at = category.updated_at || '';
    this.created_by = category.created_by || '';
    this.updated_by = category.updated_by || '';
  }

  public getRandomID(): string {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000).toString(16);
    };
    return S4() + S4();
  }
}