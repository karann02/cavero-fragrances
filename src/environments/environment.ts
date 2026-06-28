/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
// Production uses same-origin API routes behind the web server/proxy.
// Keep this empty so service URLs resolve to /api/... instead of /api/api/...
const apiGatewayBaseUrl = '';
//ddd
export const environment = {
  production: true,
  apiGatewayBaseUrl,  // Common base URL

  // Services
  masterServiceBaseUrl: `${apiGatewayBaseUrl}/master`,
  authApiBaseUrl: `${apiGatewayBaseUrl}/api/auth`,
  categoryApiBaseUrl: `${apiGatewayBaseUrl}/api/categories`,
  brandApiBaseUrl: `${apiGatewayBaseUrl}/api/brands`,
  paymentApiBaseUrl: `${apiGatewayBaseUrl}/api/payment`, // 🆕 New
  orderApiBaseUrl: `${apiGatewayBaseUrl}/api/orders`, // 🆕 New
  reviewApiBaseUrl: `${apiGatewayBaseUrl}/api/reviews`, // 🆕 New
  returnApiBaseUrl: `${apiGatewayBaseUrl}/api/returns`, // 🆕 New
  supportTicketsApiBaseUrl: `${apiGatewayBaseUrl}/api/support-tickets`,
  freeGiftsApiBaseUrl: `${apiGatewayBaseUrl}/api/free-gifts`,
  razorpayKey: '',
  inventoryBaseUrl: `${apiGatewayBaseUrl}/inventory`,
  googleClientId: '408429788067-v04s6ahu9boqjavpqme9u0h0d7k6c83a.apps.googleusercontent.com', // Cavero Fragrances Google OAuth client
};
