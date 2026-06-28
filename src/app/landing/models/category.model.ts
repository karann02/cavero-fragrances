export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  status: boolean;
  parent_id: string;
  is_featured: boolean;
  sort_order: number;
  meta_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  children?: Category[]; // For nested categories
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}