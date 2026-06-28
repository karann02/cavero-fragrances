export class VariantType {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  createdAt?: string;

  constructor(item: any) {
    this.id = item.id || 0;
    this.name = item.name || '';
    this.is_active = item.is_active !== undefined ? item.is_active : true;
    this.sort_order = item.sort_order || 0;
    this.createdAt = item.createdAt || '';
  }
}
