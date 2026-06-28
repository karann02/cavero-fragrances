import { Page, request as pwRequest } from '@playwright/test';
import { API_AUTH, ADMIN, TEST_CUSTOMER } from './test-data';

/** Call /signin API and store JWT in page localStorage */
export async function loginCustomerViaApi(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const ctx = await pwRequest.newContext();
  const res = await ctx.post(`${API_AUTH}/signin`, {
    data: { email, password, portal: 'frontend' },
  });
  const body = await res.json();
  await ctx.dispose();
  if (!body.success) throw new Error(`Customer login failed: ${body.message}`);
  await page.evaluate((t) => localStorage.setItem('authToken', t), body.token as string);
}

/** Call /login API (admin portal) and store JWT in page localStorage */
export async function loginAdminViaApi(page: Page): Promise<void> {
  const ctx = await pwRequest.newContext();
  const res = await ctx.post(`${API_AUTH}/login`, {
    data: { username: ADMIN.email, password: ADMIN.password, portal: 'admin' },
  });
  const body = await res.json();
  await ctx.dispose();
  if (!body.success) throw new Error(`Admin login failed: ${body.message}`);
  await page.evaluate((t) => localStorage.setItem('authToken', t), body.token as string);
}

/** Register a customer via API (for auth test setup) */
export async function registerCustomerViaApi(
  email: string,
  password = TEST_CUSTOMER.password,
): Promise<void> {
  const ctx = await pwRequest.newContext();
  await ctx.post(`${API_AUTH}/signup`, {
    data: {
      name: TEST_CUSTOMER.name,
      phone: TEST_CUSTOMER.phone,
      email,
      password,
      user_type: 'customer',
    },
  });
  await ctx.dispose();
}

/** Decode JWT stored in page localStorage and return the user id */
export async function getUserIdFromToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return String(payload.id ?? payload.userId ?? payload.sub ?? '');
    } catch {
      return '';
    }
  });
}
