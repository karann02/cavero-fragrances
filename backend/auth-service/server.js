const path = require('path');
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, '.env') }); // must be first — before any require that reads process.env

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const sequelize = require("./config/db");
const brandRoutes = require("./routes/brandRoutes");
const fs = require('fs');
const { Op } = require('sequelize');

process.on('uncaughtException', (error) => {
  console.error('[auth-service] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[auth-service] Unhandled rejection:', reason);
});

const app = express();
// Third-party origins the storefront legitimately loads in production (where the
// Angular app is served by THIS server and the CSP actually applies — unlike `ng serve`).
const RAZORPAY = ["https://checkout.razorpay.com", "https://api.razorpay.com", "https://lumberjack.razorpay.com", "https://*.razorpay.com"];
const GOOGLE   = ["https://accounts.google.com", "https://apis.google.com"];
const ANALYTICS = ["https://www.googletagmanager.com", "https://www.google-analytics.com", "https://*.google-analytics.com", "https://*.analytics.google.com"];
const CDNS     = ["https://cdn.jsdelivr.net", "https://cdn.lordicon.com"]; // GSAP + lordicon
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://checkout.razorpay.com", ...GOOGLE, ...ANALYTICS, ...CDNS], // Angular inline + Razorpay/Google/GA/CDNs; unsafe-eval+blob for lordicon/lottie
      scriptSrcAttr: ["'unsafe-inline'"], // allow inline on* event handlers (theme/vendor markup) — helmet defaults to 'none'
      workerSrc:  ["'self'", "blob:"], // lordicon/lottie worker
      childSrc:   ["'self'", "blob:"], // worker fallback (older browsers)
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"], // Angular inline + Google Fonts + GSI button styles
      imgSrc:     ["'self'", "data:", "blob:", "https:"], // covers Cloudinary, Razorpay, GA pixels
      mediaSrc:   ["'self'", "https:", "data:", "blob:"], // Cloudinary reel videos (media-src else falls back to default-src)
      connectSrc: ["'self'", "blob:", "data:", ...RAZORPAY, ...GOOGLE, ...ANALYTICS, ...CDNS, "https://www.google.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      frameSrc:   ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com", "https://accounts.google.com"], // Razorpay modal + Google sign-in
      fontSrc:    ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      objectSrc:  ["'none'"],                      // Blocks Flash / plugin attacks
      baseUri:    ["'self'"],                      // Prevents <base> tag injection
      formAction: ["'self'"],
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(bodyParser.json({                            // Blocks oversized payload attacks
  limit: '10kb',
  verify: (req, _res, buf) => { req.rawBody = buf; }  // keep raw bytes for webhook signature checks
}));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));

const configuredOrigins = String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/+$/, '');

const isAllowedDevOrigin = (origin) => {
  if (!origin) return true;

  try {
    const parsedOrigin = new URL(origin);
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(parsedOrigin.hostname);
    return isLocalHost && ['http:', 'https:'].includes(parsedOrigin.protocol);
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = normalizeOrigin(origin);
    if (configuredOrigins.includes(normalizedOrigin) || isAllowedDevOrigin(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Protect against old frontend bundles or proxy rules accidentally calling /api/api/...
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
  }
  next();
});

// Serve Static Uploads
app.use('/uploads', express.static(path.join(__dirname, '../../src/assets/uploads')));

// Load models to ensure associations are set up
const Product = require('./models/product');
const Category = require('./models/category');
require('./models/wishlist');
require('./models/support_ticket');
require('./models/coupon_usage');

// Split routes registered BEFORE authRoutes so they take precedence
const productRoutes = require("./routes/productRoutes");
app.use("/api/auth", productRoutes);
const userRoutes = require("./routes/userRoutes");
app.use("/api/auth", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/brands", brandRoutes);
const categoryRoutes = require("./routes/categoryRoutes");
app.use("/api/categories", categoryRoutes);
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payment", paymentRoutes);
const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);
const returnRoutes = require("./routes/returnRoutes");
app.use("/api/returns", returnRoutes);
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);
const sliderRoutes = require("./routes/sliderRoutes");
app.use("/api/auth/sliders", sliderRoutes);
const addressRoutes = require("./routes/addressRoutes");
app.use("/api/addresses", addressRoutes);
const supportTicketRoutes = require("./routes/supportTicketRoutes");
app.use("/api/support-tickets", supportTicketRoutes);
const influencerReelRoutes = require("./routes/influencerReelRoutes");
app.use("/api/reels", influencerReelRoutes);
const contactSettingsRoutes = require("./routes/contactSettingsRoutes");
app.use("/api/contact-settings", contactSettingsRoutes);
const logoSettingsRoutes = require("./routes/logoSettingsRoutes");
app.use("/api/logo-settings", logoSettingsRoutes);
const aboutSettingsRoutes = require("./routes/aboutSettingsRoutes");
app.use("/api/about-settings", aboutSettingsRoutes);
const comboBoxSettingsRoutes = require("./routes/comboBoxSettingsRoutes");
app.use("/api/combo-box-settings", comboBoxSettingsRoutes);
const freeGiftRoutes = require("./routes/freeGiftRoutes");
app.use("/api/free-gifts", freeGiftRoutes);
const referralRoutes = require("./routes/referralRoutes");
app.use("/api/referrals", referralRoutes);
// Product variants — load model to set up Product.hasMany(ProductVariant) association
require('./models/product_variant');
const variantRoutes = require("./routes/variantRoutes");
app.use("/api/variants", variantRoutes);
const variantTypeRoutes = require('./routes/variantTypeRoutes');
app.use('/api/variant-types', variantTypeRoutes);
require('./models/influencer_reel');

const frontendDistPath = path.join(__dirname, '..', '..', 'dist', 'cliniva', 'browser');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

const defaultSeo = {
  title: 'Cavero Fragrances — Luxury Arabian Perfumes & Oud',
  description: 'Shop premium Arabian perfumes, Oud, Attar & luxury fragrances at Cavero Fragrances. Free shipping across India.'
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]+/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

const cleanText = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const upsertHeadTag = (html, selectorRegex, tag) => {
  if (selectorRegex.test(html)) {
    return html.replace(selectorRegex, tag);
  }
  return html.replace('</head>', `  ${tag}\n</head>`);
};

const injectSeoIntoHtml = (html, seo) => {
  const title = escapeHtml(seo.title || defaultSeo.title);
  const description = escapeHtml(seo.description ?? defaultSeo.description);
  const canonicalUrl = escapeHtml(seo.canonicalUrl || '/');

  let output = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  output = upsertHeadTag(output, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`);
  output = upsertHeadTag(output, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}">`);
  output = upsertHeadTag(output, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${description}">`);
  output = upsertHeadTag(output, /<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${title}">`);
  output = upsertHeadTag(output, /<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${description}">`);
  output = upsertHeadTag(output, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonicalUrl}">`);
  return output;
};

const getCanonicalUrl = (req) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('host') || '';
  return host ? `${protocol}://${host}${req.path}` : req.path;
};

const lookupByIdOrSlug = (identifier) => {
  const value = String(identifier || '').trim();
  return /^\d+$/.test(value)
    ? { [Op.or]: [{ id: Number(value) }, { slug: value }] }
    : { slug: slugify(value) };
};

const resolveRouteSeo = async (req) => {
  const productMatch = req.path.match(/^\/product\/([^/]+)\/?$/i);
  if (productMatch) {
    const product = await Product.findOne({ where: lookupByIdOrSlug(decodeURIComponent(productMatch[1])) });
    if (product) {
      return {
        title: cleanText(product.seo_title) || cleanText(product.name) || defaultSeo.title,
        description: cleanText(product.seo_description),
        canonicalUrl: getCanonicalUrl(req)
      };
    }
  }

  const categoryMatch = req.path.match(/^\/shop-category\/([^/]+)\/?$/i);
  if (categoryMatch) {
    const category = await Category.findOne({ where: lookupByIdOrSlug(decodeURIComponent(categoryMatch[1])) });
    if (category) {
      return {
        title: cleanText(category.meta_title) || cleanText(category.name) || defaultSeo.title,
        description: cleanText(category.meta_description),
        canonicalUrl: getCanonicalUrl(req)
      };
    }
  }

  return {
    ...defaultSeo,
    canonicalUrl: getCanonicalUrl(req)
  };
};

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath, { index: false }));
  app.use(async (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }

    const acceptsHtml = String(req.get('accept') || '').includes('text/html') || !path.extname(req.path);
    if (!acceptsHtml) return next();

    try {
      const html = await fs.promises.readFile(frontendIndexPath, 'utf8');
      const seo = await resolveRouteSeo(req);
      res.type('html').send(injectSeoIntoHtml(html, seo));
    } catch (error) {
      next(error);
    }
  });
}

// Global error handler — prevents stack traces leaking to client
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(err.status || 500).json({ success: false, message: 'An error occurred.' });
});

// Run as a standalone server ONLY when executed directly (local dev, Railway, Render, etc.).
// On Vercel the file is `require`d by api/index.js as a serverless function, where we must
// NOT call app.listen(), and must NOT re-run sync()/migrations or background timers
// (the schema already exists on the managed DB; serverless functions don't persist timers).
if (require.main === module) {
  const runMigrations = require('./migrate');
  const PORT = process.env.PORT || 5000;
  sequelize.sync().then(async () => {
    await runMigrations();
    const server = app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
    server.on('error', (error) => {
      console.error('[auth-service] Server error:', error);
    });

    // Safety-net: sweep abandoned online "pending" orders — reconcile if actually paid,
    // otherwise release their reserved stock + coupon. Runs shortly after boot, then hourly-ish.
    try {
      const { cleanupStalePendingOrders } = require('./utils/pendingOrders');
      setTimeout(() => cleanupStalePendingOrders().catch(() => {}), 60 * 1000);
      setInterval(() => cleanupStalePendingOrders().catch(() => {}), 15 * 60 * 1000);
    } catch (e) {
      console.error('[auth-service] pending-order cleanup not scheduled:', e.message);
    }
  });
}

// Export the configured Express app for serverless (Vercel) use.
module.exports = app;
