export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  is_logged_in: boolean;
}

export interface DeliveryAddress {
  id: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}