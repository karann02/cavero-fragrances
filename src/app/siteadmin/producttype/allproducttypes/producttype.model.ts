// producttype.model.ts
export class ProductType {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  products?: any[];
 
  constructor(producttype: Partial<ProductType> = {}) {
    this.id = producttype.id || this.getRandomID();
    this.name = producttype.name || '';
    this.active = producttype.active !== undefined ? producttype.active : true;
    this.created_at = producttype.created_at || '';
    this.updated_at = producttype.updated_at || '';
    this.products = producttype.products || [];
  }

  public getRandomID(): string {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000).toString(16);
    };
    return S4() + S4();
  }
}

export interface ComboProduct {
  product_id: string;
  quantity: number;
}