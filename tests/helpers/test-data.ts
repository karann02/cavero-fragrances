export const ADMIN = { email: 'admin@cavero.com', password: 'Admin@123' };

export const API_AUTH  = 'http://localhost:5000/api/auth';
export const API_PAY   = 'http://localhost:5000/api/payment';

export function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 999)}@playwright.test`;
}

export const TEST_CUSTOMER = {
  name: 'Playwright Tester',
  phone: '9876543210',
  password: 'Test@12345',
};

// Known seeded product (deepanalysis.txt §6)
export const PRODUCT = {
  name: 'Ameer Al Oudh',
  slug: 'ameer-al-oudh',
  price: 1299,
  concentration: 'Attar / Itr',
};

// Free gift thresholds (deepanalysis.txt §6)
export const FREE_GIFT_1_THRESHOLD = 999;   // Attar Sample (3ml)
export const FREE_GIFT_2_THRESHOLD = 1999;  // Oud Incense Stick

// Cart localStorage key (cart.service.ts)
export const GUEST_CART_KEY = 'guest_cart_v2';
export const USER_CART_PREFIX = 'user_cart_v2_';

/** Build a minimal Cart object (matches cart.model.ts Cart interface) */
export function makeGuestCart(price = 1299, quantity = 1) {
  const total = price * quantity;
  return {
    items: [{
      id: `${PRODUCT.slug}_pw`,
      product_id: '1',
      product_slug: PRODUCT.slug,
      product_name: PRODUCT.name,
      product_image: 'assets/uploads/products/ameer-al-oudh-1.jpg',
      price,
      quantity,
      stock: 100,
      discount: 0,
      total,
      item_type: 'product',
    }],
    subtotal: total,
    total_items: quantity,
    delivery_fee: total >= 999 ? 0 : 49,
    total: total + (total >= 999 ? 0 : 49),
    free_delivery_threshold: 999,
    coupon_discount: 0,
    coupon_code: null,
    coupon_id: null,
    applied_coupon: null,
  };
}
