export interface CartItem {
  id: string;
  product_id: string;
  product_slug?: string;
  product_name: string;
  product_image: string;
  combo_id?: number;
  price: number;
  quantity: number;
  stock?: number;
  discount?: number;
  total: number;
  item_type?: 'product' | 'combo_box';
  combo_box_items?: ComboBoxCartProduct[];
  combo_box_size?: number;
  selected_size?: string;
  variant_id?: number;
}

export interface ComboBoxCartProduct {
  product_id: string;
  product_slug?: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  price: number;
}

export interface AppliedCoupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_discount?: number | null;
  valid_until?: string | null;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  total_items: number;
  delivery_fee: number;
  total: number;
  free_delivery_threshold: number;
  coupon_discount: number;
  coupon_code?: string | null;
  coupon_id?: number | null;
  applied_coupon?: AppliedCoupon | null;
}
