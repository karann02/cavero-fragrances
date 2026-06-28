// combo.model.ts
export class Combo {
  id: string;
  name: string;
  image: string;
  discount_price: number;
  combo_size: number;
  valid_from: string;
  valid_to: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  product_ids: ComboProduct[];
  products?: any[];
 
  constructor(combo: Partial<Combo> = {}) {
    this.id = combo.id || this.getRandomID();
    this.name = combo.name || '';
    this.image = combo.image || '';
    this.discount_price = combo.discount_price || 0;
    this.combo_size = combo.combo_size || 4;
    this.valid_from = combo.valid_from || '';
    this.valid_to = combo.valid_to || '';
    this.active = combo.active !== undefined ? combo.active : true;
    this.created_at = combo.created_at || '';
    this.updated_at = combo.updated_at || '';
    this.product_ids = combo.product_ids || [];
    this.products = combo.products || [];
  }

  public getRandomID(): string {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000).toString(16);
    };
    return S4() + S4();
  }
}

export interface ComboProduct {
  slot?: number;
  product_id: string | number;
  category_id: string | number;
  product_name?: string;
  category_name?: string;
  product_price?: number;
  product_image?: string | null;
}
