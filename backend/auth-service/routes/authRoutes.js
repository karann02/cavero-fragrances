const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');
const User = require("../models/User");
const Role = require("../models/role");
const cors = require("cors");
const { log } = require("console");
const axios = require('axios');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again in a minute.' }
});
const { UniqueConstraintError, Op } = require('sequelize');
const router = express.Router();
// router.use(cors()); // Removed redundant CORS
router.use(express.json()); // âœ… Ensure JSON is parsed
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const Category = require("../models/category");
const Brand = require("../models/brand");
const Product = require("../models/product");
const Combo = require('../models/combo');
const ProductType = require('../models/product_type');
const Order = require("../models/order");
const OrderItem = require("../models/order_item");
const Coupon = require("../models/coupon");
const CouponUsage = require("../models/coupon_usage");
const CMSPage = require("../models/cms_page");
const Slider = require('../models/slider');
const Cart = require("../models/cart");
const ProductVariant = require("../models/product_variant");
const fs = require('fs');
const sequelize = require("../config/db");
const Referral = require("../models/referral");
const {
  normalizeOrderItems,
  reserveInventoryForOrderItems,
  restoreInventoryForOrderItems
} = require("../utils/orderInventory");

// Generate a unique 6-char referral code (no ambiguous chars)
const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += REFERRAL_CHARS.charAt(Math.floor(Math.random() * REFERRAL_CHARS.length));
    }
    const existing = await User.findOne({ where: { referral_code: code } });
    if (!existing) return code;
  }
  // Fallback: use timestamp suffix to guarantee uniqueness
  return 'C' + Date.now().toString(36).toUpperCase().slice(-5);
}

const multer = require('multer');
const { makeUpload: makeCloudinaryUpload } = require('../config/cloudinary');
const path = require('path');

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]+/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-');

const optionalSeoText = (value) => {
  if (value === undefined) return undefined;
  const cleaned = String(value || '').trim();
  return cleaned || null;
};

const isFrontendVisibleCategory = (category) => {
  if (!category) return false;
  const raw = typeof category.toJSON === 'function' ? category.toJSON() : category;
  const isActive = raw.status === true || raw.status === 1 || raw.status === '1' || raw.status === 'true';
  const sortOrder = Number(raw.sort_order ?? 0);
  return isActive && sortOrder !== 0;
};

// Normalize product image URL â€" always returns a /uploads/... path the backend can serve
const normalizeProductImage = (firstImage) => {
  if (!firstImage) return null;
  // Prefer filename â€" most reliable
  if (firstImage.filename) return `/uploads/products/${firstImage.filename}`;
  if (firstImage.url) {
    const url = firstImage.url;
    // Strip any leading /assets/ or assets/ prefix
    const cleaned = url.replace(/^\/?(assets\/)?/, '');
    // If it already starts with uploads/, prepend /
    if (cleaned.startsWith('uploads/')) return `/${cleaned}`;
    // If it's a full path with uploads in it, extract from uploads/ onward
    const uploadsIdx = url.indexOf('uploads/');
    if (uploadsIdx !== -1) return `/${url.substring(uploadsIdx)}`;
    return url.startsWith('/') ? url : `/${url}`;
  }
  return null;
};

const normalizeManagedUploadPath = (value, folderName) => {
  if (value === null || value === undefined) return null;

  const rawValue = String(value).trim();
  if (!rawValue) return null;

  if (rawValue.startsWith(`/${folderName}/`)) {
    return `/uploads${rawValue}`;
  }

  if (rawValue.startsWith(`/uploads/${folderName}/`)) {
    return rawValue;
  }

  if (rawValue.startsWith(`uploads/${folderName}/`)) {
    return `/${rawValue}`;
  }

  if (rawValue.startsWith('http')) {
    const uploadsMarker = `/uploads/${folderName}/`;
    const uploadsIndex = rawValue.indexOf(uploadsMarker);
    if (uploadsIndex !== -1) {
      return rawValue.substring(uploadsIndex);
    }
    return rawValue;
  }

  const normalizedPath = rawValue.replace(/\\/g, '/');
  const uploadsIndex = normalizedPath.indexOf(`uploads/${folderName}/`);
  if (uploadsIndex !== -1) {
    return `/${normalizedPath.substring(uploadsIndex)}`;
  }

  const fileName = path.basename(normalizedPath);
  if (!fileName || fileName === '.' || fileName === '/') {
    return null;
  }

  return `/uploads/${folderName}/${fileName}`;
};

const resolveManagedUploadFilePath = (value, folderName) => {
  const normalizedPath = normalizeManagedUploadPath(value, folderName);
  if (!normalizedPath || !normalizedPath.startsWith(`/uploads/${folderName}/`)) {
    return null;
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  return path.join(__dirname, '..', '..', '..', 'src', 'assets', relativePath);
};

const deleteManagedUploadFile = (value, folderName) => {
  try {
    const filePath = resolveManagedUploadFilePath(value, folderName);
    if (!filePath) return;

    const allowedRoot = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'uploads', folderName);
    if (!filePath.startsWith(allowedRoot)) return;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`[uploads] Failed to delete ${folderName} asset:`, error);
  }
};

// Combo images → Cloudinary (req.file.path = secure URL)
const uploadComboImage = makeCloudinaryUpload('combos');

const comboBoxSettingsImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', '..', 'src', 'assets', 'uploads', 'combo-box-settings');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `combo-box-${uniqueSuffix}${path.extname(file.originalname || '').toLowerCase()}`);
  }
});

const uploadComboBoxSettingsImage = multer({
  storage: comboBoxSettingsImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    if (String(file.mimetype || '').startsWith('image/')) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed for build your own box settings'));
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT Token
const generateToken = (user, expiresIn = '7d') => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      address: user.address || '',
      user_type: user.user_type,
      user_role_id: user.user_role_id,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn }
  );
};

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, address, user_type = 'customer', referred_by_code } = req.body;
    const normalizedName = String(name || '').replace(/<[^>]*>/g, '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').replace(/\D/g, '').trim();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (!/^\d{10,15}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 to 15 digits'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Ensure customer role exists
    const customerRole = await Role.ensureCustomerRole();

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate unique referral code for new user
    const referralCode = await generateUniqueReferralCode();

    // Create user
    const newUser = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      basePass64: '',
      user_role_id: customerRole.id,
      role: 'user',
      phone: normalizedPhone,
      address: address || null,
      user_type: user_type,
      referral_code: referralCode
    });

    // Handle incoming referral code (non-blocking)
    if (referred_by_code) {
      const normalizedCode = String(referred_by_code).trim().toUpperCase();
      User.findOne({ where: { referral_code: normalizedCode } })
        .then(referrer => {
          if (referrer && referrer.id !== newUser.id) {
            return Referral.create({
              referrer_id: referrer.id,
              referred_id: newUser.id,
              reward_points: 10,
              status: 'pending'
            });
          }
        })
        .catch(err => console.error('Referral record error:', err.message));
    }

    // Generate token
    const token = generateToken(newUser);

    // Return user data without password
    const userResponse = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      user_type: newUser.user_type,
      user_role_id: newUser.user_role_id,
      profile_image: newUser.profile_image,
      phone: newUser.phone,
      address: newUser.address,
      referral_code: newUser.referral_code
    };

    res.json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Sign In
router.post('/signin', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({
      where: { email },
      include: [{
        model: Role,
        attributes: ['user_role_keyword', 'user_type']
      }]
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const normalizedRole = String(user.role || user.Role?.user_role || '').toLowerCase();
    if (normalizedRole === 'superuser' || normalizedRole === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Superuser accounts are restricted to the admin dashboard login only.'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      user_type: user.user_type,
      user_role_id: user.user_role_id,
      profile_image: user.profile_image,
      phone: user.phone,
      address: user.address
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// Social Login (placeholder)
router.post('/social-login', async (req, res) => {
  // Implement social login logic here
  res.status(501).json({
    success: false,
    message: 'Social login not implemented yet'
  });
});

// Google Sign-In
router.post('/google-signin', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify Google JWT token signature (not just decode)
    let ticketPayload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      ticketPayload = ticket.getPayload();
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid Google credential' });
    }

    if (!ticketPayload || !ticketPayload.email) {
      return res.status(400).json({ success: false, message: 'Invalid Google credential' });
    }

    const { email, name, picture, sub: googleId } = ticketPayload;

    // Check if user exists
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Ensure customer role exists
      const customerRole = await Role.ensureCustomerRole();

      // Create new user from Google account
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        password: await bcrypt.hash(googleId, 10),
        basePass64: '',
        user_role_id: customerRole.id,
        role: 'user',
        user_type: 'customer',
        profile_image: picture || null,
        google_id: googleId
      });
    } else {
      const normalizedRole = String(user.role || '').toLowerCase();
      if (normalizedRole === 'superuser' || normalizedRole === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Superuser accounts are restricted to the admin dashboard login only.'
        });
      }
      // Update profile image if not set
      if (!user.profile_image && picture) {
        await user.update({ profile_image: picture });
      }
      // Store Google ID if not already stored
      if (!user.google_id) {
        await user.update({ google_id: googleId });
      }
    }

    // Generate token
    const token = generateToken(user);

    // Return user data without password
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      user_type: user.user_type,
      user_role_id: user.user_role_id,
      profile_image: user.profile_image,
      phone: user.phone,
      address: user.address
    };

    res.json({
      success: true,
      message: 'Google sign-in successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Google sign-in'
    });
  }
});

// User Registration
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Error registering user", error });
  }
});

// User Login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, username, password, otp, portal } = req.body;
    console.log("Login Request Body:", req.body);

    const userEmail = email || username;
    // 1. Find user
    const user = await User.findOne({
      where: { email: userEmail },
      include: [
        {
          model: Role,
          attributes: ["id", "user_role"]
        },

      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const normalizedRole = String(user.role || user.Role?.user_role || '').toLowerCase();
    const normalizedPortal = String(portal || '').toLowerCase();
    const isSuperuser = normalizedRole === 'superuser' || normalizedRole === 'admin';

    if (normalizedPortal === 'frontend' && isSuperuser) {
      return res.status(403).json({
        success: false,
        message: 'Superuser accounts can only log in from the admin dashboard.'
      });
    }

    if (normalizedPortal === 'admin' && !isSuperuser) {
      return res.status(403).json({
        success: false,
        message: 'Only superuser/admin accounts can log in to the admin dashboard.'
      });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // 6. Get Role Permissions
    const roleName = user.Role?.user_role || user.role;



    const token = generateToken(user, '1h');

    res.json({
      message: "Login successful",
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in", success: false, error: error.message });
  }
});

// Protected Route Example
router.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Access granted", user: req.user });
});

// Middleware to Verify JWT — also confirms the account still exists + is active
// every request (the 7-day token alone must not keep deleted/disabled users in).
async function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "No token provided" });

  let decoded;
  try {
    decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'is_active', 'role', 'user_type', 'user_role_id']
    });
    if (!user || user.is_active === false) {
      return res.status(401).json({ success: false, message: 'Account no longer active' });
    }
    req.user = { ...decoded, role: user.role, user_type: user.user_type, user_role_id: user.user_role_id };
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Authentication check failed' });
  }
}

function verifySuperuser(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'superuser' && role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}
// -- Add  New Hospital Created By Pravin -- //






// Get categories for frontend (with children)
router.get('/categories/frontend', async (req, res) => {
  try {
    const allCategories = await Category.findAll({
      where: { status: true },
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });
    const categories = allCategories.filter(isFrontendVisibleCategory);

    // Build category tree
    const buildTree = (parentId = null) => {
      return categories
        .filter(cat => cat.parent_id === parentId)
        .map(cat => ({
          ...cat.toJSON(),
          children: buildTree(cat.id)
        }));
    };

    const categoryTree = buildTree();

    return res.status(200).json({
      message: 'Categories fetched successfully',
      data: categoryTree,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching categories:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get categories for header menu (each category with its products)
router.get('/categories/menu', async (req, res) => {
  try {
    const allCategories = await Category.findAll({
      where: { status: true },
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });
    const categories = allCategories.filter(isFrontendVisibleCategory);

    const products = await Product.findAll({
      attributes: ['id', 'name', 'slug', 'category_id'],
      order: [['name', 'ASC']]
    });

    const productsByCategory = products.reduce((acc, product) => {
      if (!product.category_id) return acc;
      const key = String(product.category_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        id: product.id,
        name: product.name,
        slug: product.slug
      });
      return acc;
    }, {});

    const menuData = categories.map((category) => ({
      ...category.toJSON(),
      products: productsByCategory[String(category.id)] || []
    }));

    return res.status(200).json({
      message: 'Categories with products fetched successfully',
      data: menuData,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching categories menu:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});


// Add these routes to your authRoutes.js file
// Get Parent Categories (categories without parent)
router.get('/categories/parents', async (req, res) => {
  try {
    const parentCategories = await Category.findAll({
      where: {
        parent_id: null
      },
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      message: 'Parent categories fetched successfully',
      data: parentCategories,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching parent categories:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get Categories for Dropdown (with hierarchy info)
router.get('/categories/dropdown', async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'name', 'parent_id'],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      message: 'Categories for dropdown fetched successfully',
      data: categories,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching dropdown categories:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});
// Category Listing
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      message: 'Categories fetched successfully',
      data: categories,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching categories:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get Single Category
router.get('/categories/:id', async (req, res) => {
  try {
    const categoryIdentifier = String(req.params.id || '').trim();
    const categoryLookup = /^\d+$/.test(categoryIdentifier)
      ? { [Op.or]: [{ id: Number(categoryIdentifier) }, { slug: categoryIdentifier }] }
      : { slug: slugify(categoryIdentifier) };
    const category = await Category.findOne({ where: categoryLookup });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    return res.status(200).json({
      message: 'Category found successfully',
      data: category,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching category:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Add Category
router.post('/categories', verifyToken, verifySuperuser, async (req, res) => {
  try {
    console.log('req.body:', req.body);

    const {
      name,
      slug,
      description,
      image_url,
      status,
      parent_id,
      is_featured,
      sort_order,
      meta_title,
      meta_description,
      created_by
    } = req.body;

    // Check if category already exists by name
    const existingCategoryByName = await Category.findOne({ where: { name } });
    if (existingCategoryByName) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    const normalizedSlug = slug && String(slug).trim() ? String(slug).trim() : slugify(name);
    let finalSlug = normalizedSlug || `category-${Date.now()}`;

    // Check if slug already exists
    const existingCategoryBySlug = await Category.findOne({ where: { slug: finalSlug } });
    if (existingCategoryBySlug) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    const existingCategoryBySlugRetry = await Category.findOne({ where: { slug: finalSlug } });
    if (existingCategoryBySlugRetry) {
      return res.status(400).json({
        success: false,
        message: 'Category slug already exists'
      });
    }

    const created_at = new Date();

    const category = await Category.create({
      name,
      slug: finalSlug,
      description: description || null,
      image_url: image_url || null,
      status: status !== undefined ? status : true,
      parent_id: parent_id || null,
      is_featured: is_featured || false,
      sort_order: sort_order || 0,
      meta_title: optionalSeoText(meta_title),
      meta_description: optionalSeoText(meta_description),
      created_at,
      created_by: created_by || 'system'
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });

  } catch (error) {
    console.error('Error during category creation:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Update Category
router.put('/categories/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    console.log('req.body:', req.body);

    const categoryId = req.params.id;
    const {
      name,
      slug,
      description,
      image_url,
      status,
      parent_id,
      is_featured,
      sort_order,
      meta_title,
      meta_description,
      updated_by
    } = req.body;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if name already exists (excluding current category)
    if (name && name !== category.name) {
      const existingCategoryByName = await Category.findOne({
        where: { name }
      });
      if (existingCategoryByName) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists'
        });
      }
    }

    // Check if slug already exists (excluding current category)
    if (slug && slug !== category.slug) {
      const existingCategoryBySlug = await Category.findOne({
        where: { slug }
      });
      if (existingCategoryBySlug) {
        return res.status(400).json({
          success: false,
          message: 'Category slug already exists'
        });
      }
    }

    const updated_at = new Date();

    await category.update({
      name: name || category.name,
      slug: slug || category.slug,
      description: description !== undefined ? description : category.description,
      image_url: image_url !== undefined ? image_url : category.image_url,
      status: status !== undefined ? status : category.status,
      parent_id: parent_id !== undefined ? parent_id : category.parent_id,
      is_featured: is_featured !== undefined ? is_featured : category.is_featured,
      sort_order: sort_order !== undefined ? sort_order : category.sort_order,
      meta_title: meta_title !== undefined ? optionalSeoText(meta_title) : category.meta_title,
      meta_description: meta_description !== undefined ? optionalSeoText(meta_description) : category.meta_description,
      updated_at,
      updated_by: updated_by || 'system'
    });

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });

  } catch (error) {
    console.error('Error during category update:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Delete Category
router.delete('/categories/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await category.destroy();

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error during category deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Bulk Delete Categories
router.post('/categories/bulk-delete', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category IDs are required'
      });
    }

    const result = await Category.destroy({
      where: {
        id: ids
      }
    });

    return res.status(200).json({
      success: true,
      message: `${result} categories deleted successfully`
    });

  } catch (error) {
    console.error('Error during bulk category deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});


// routes/sliders.js

// Get all sliders

// routes/sliders.js
const uploadSlider = require('../config/multer');

const resolveSliderImageFilePath = (imageUrl) => {
  if (!imageUrl) {
    return null;
  }

  const normalizedImagePath = String(imageUrl)
    .replace(/^\/+/, '')
    .split('/')
    .join(path.sep);

  return path.join(__dirname, '..', '..', '..', 'src', 'assets', normalizedImagePath);
};

const deleteSliderImageFile = (imageUrl) => {
  const imageFilePath = resolveSliderImageFilePath(imageUrl);

  if (imageFilePath && fs.existsSync(imageFilePath)) {
    fs.unlinkSync(imageFilePath);
  }
};

const normalizeSliderDisplayOn = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return ['all', 'desktop', 'mobile'].includes(normalized) ? normalized : 'all';
};

const parseSliderBoolean = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const mapSliderResponse = (slider) => {
  const sliderJson = slider?.toJSON ? slider.toJSON() : slider;
  return {
    ...sliderJson,
    display_on: normalizeSliderDisplayOn(sliderJson.display_on || sliderJson.screen_type || 'all')
  };
};

// Get all sliders
router.get('/sliders', async (req, res) => {
  try {
    const sliders = await Slider.findAll({
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    return res.status(200).json({
      message: 'Sliders fetched successfully',
      data: sliders.map(mapSliderResponse),
      success: true
    });
  } catch (error) {
    console.error('Error during fetching sliders:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get active sliders (frontend) - MUST be before /:id route
router.get('/sliders/active', async (req, res) => {
  try {
    const sliders = await Slider.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']]
    });
    return res.status(200).json({ success: true, data: sliders.map(mapSliderResponse) });
  } catch (error) {
    console.error('Error fetching active sliders:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get single slider
router.get('/sliders/:id', async (req, res) => {
  try {
    const sliderId = req.params.id;
    const slider = await Slider.findByPk(sliderId);

    if (!slider) {
      return res.status(404).json({
        success: false,
        message: 'Slider not found'
      });
    }

    return res.status(200).json({
      message: 'Slider found successfully',
      data: mapSliderResponse(slider),
      success: true
    });
  } catch (error) {
    console.error('Error during fetching slider:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Add slider with image upload
router.post('/sliders', verifyToken, verifySuperuser, uploadSlider.single('image'), async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

    const {
      title,
      subtitle,
      description,
      button_text,
      button_url,
      sort_order,
      is_active,
      background_color,
      text_color,
      display_on,
      screen_type
    } = req.body;

    // Check if slider with same title already exists
    if (title) {
      const existingSlider = await Slider.findOne({ where: { title } });
      if (existingSlider) {
        // Delete uploaded file if title exists
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Slider with this title already exists'
        });
      }
    }

    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image is required'
      });
    }

    const imagePath = `/uploads/sliders/${req.file.filename}`;

    const slider = await Slider.create({
      title: title || null,
      subtitle: subtitle || null,
      description: description || null,
      image: imagePath,
      button_text: button_text || null,
      button_url: button_url || null,
      sort_order: sort_order || 0,
      is_active: parseSliderBoolean(is_active, true),
      background_color: background_color || null,
      text_color: text_color || null,
      display_on: normalizeSliderDisplayOn(display_on || screen_type || 'all')
    });

    return res.status(201).json({
      success: true,
      message: 'Slider created successfully',
      data: mapSliderResponse(slider)
    });

  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error during slider creation:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Update slider with optional image upload
router.put('/sliders/:id', verifyToken, verifySuperuser, uploadSlider.single('image'), async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

    const sliderId = req.params.id;
    const {
      title,
      subtitle,
      description,
      button_text,
      button_url,
      sort_order,
      is_active,
      background_color,
      text_color,
      remove_image,
      display_on,
      screen_type
    } = req.body;

    const slider = await Slider.findByPk(sliderId);
    if (!slider) {
      // Delete uploaded file if slider not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Slider not found'
      });
    }

    // Check if title already exists (excluding current slider)
    if (title && title !== slider.title) {
      const existingSlider = await Slider.findOne({
        where: { title }
      });
      if (existingSlider) {
        // Delete uploaded file if title exists
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Slider with this title already exists'
        });
      }
    }

    const shouldRemoveImage = String(remove_image).toLowerCase() === 'true';
    let imagePath = slider.image;

    if (req.file) {
      deleteSliderImageFile(slider.image);
      imagePath = `/uploads/sliders/${req.file.filename}`;
    } else if (shouldRemoveImage) {
      deleteSliderImageFile(slider.image);
      imagePath = '';
    }

    await slider.update({
      title: title !== undefined ? title : slider.title,
      subtitle: subtitle !== undefined ? subtitle : slider.subtitle,
      description: description !== undefined ? description : slider.description,
      image: imagePath,
      button_text: button_text !== undefined ? button_text : slider.button_text,
      button_url: button_url !== undefined ? button_url : slider.button_url,
      sort_order: sort_order !== undefined ? sort_order : slider.sort_order,
      is_active: is_active !== undefined ? parseSliderBoolean(is_active, slider.is_active) : slider.is_active,
      background_color: background_color !== undefined ? background_color : slider.background_color,
      text_color: text_color !== undefined ? text_color : slider.text_color,
      display_on:
        (display_on !== undefined || screen_type !== undefined)
          ? normalizeSliderDisplayOn(display_on || screen_type)
          : normalizeSliderDisplayOn(slider.display_on || slider.screen_type || 'all')
    });

    await slider.reload();

    return res.status(200).json({
      success: true,
      message: 'Slider updated successfully',
      data: mapSliderResponse(slider)
    });

  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error during slider update:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Delete slider
router.delete('/sliders/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const sliderId = req.params.id;

    const slider = await Slider.findByPk(sliderId);
    if (!slider) {
      return res.status(404).json({
        success: false,
        message: 'Slider not found'
      });
    }

    // Delete image file
    if (slider.image) {
      deleteSliderImageFile(slider.image);
    }

    await slider.destroy();

    return res.status(200).json({
      success: true,
      message: 'Slider deleted successfully'
    });

  } catch (error) {
    console.error('Error during slider deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Bulk delete sliders
router.post('/sliders/bulk-delete', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Slider IDs are required'
      });
    }

    // Get sliders to delete their images
    const slidersToDelete = await Slider.findAll({
      where: { id: ids }
    });

    // Delete image files
    slidersToDelete.forEach(slider => {
      if (slider.image) {
        deleteSliderImageFile(slider.image);
      }
    });

    const result = await Slider.destroy({
      where: {
        id: ids
      }
    });

    return res.status(200).json({
      success: true,
      message: `${result} sliders deleted successfully`
    });

  } catch (error) {
    console.error('Error during bulk slider deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Serve static files from uploads directory
router.use('/uploads', express.static('uploads'))



// Add these routes to your authRoutes.js file or create a new productRoutes.js file

// Product Listing
router.post('/orders', async (req, res) => {
  const transaction = await sequelize.transaction();
  let normalizedTransactionId = '';
  let normalizedRazorpayOrderId = '';

  try {
    const {
      items,
      shipping_address,
      customer_email,
      customer_phone,
      payment_method,
      transaction_id,
      razorpay_order_id,
      subtotal,
      delivery_fee,
      total_amount
    } = req.body;

    normalizedTransactionId = String(transaction_id || '').trim();
    normalizedRazorpayOrderId = String(razorpay_order_id || '').trim();

    const normalizedOrderItems = normalizeOrderItems(items);

    // Determine User ID (logic depends on auth state, assuming optional or passed)
    // For now, finding user by email or setting to null/guest
    let user_id = null;
    if (customer_email) {
      const user = await User.findOne({ where: { email: customer_email }, transaction });
      if (user) user_id = user.id;
    }

    if (payment_method === 'online' && normalizedTransactionId) {
      const existingOrder = await Order.findOne({
        where: { razorpay_payment_id: normalizedTransactionId },
        transaction
      });

      if (existingOrder) {
        await transaction.rollback();
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Order already exists for this payment.',
          data: existingOrder
        });
      }
    }

    await reserveInventoryForOrderItems(normalizedOrderItems, { transaction });

    // Create Order
    const order = await Order.create({
      order_number: `ORD-${Date.now()}`,
      user_id: user_id || 0, // 0 for Guest if allowed, or enforce user
      total_amount: subtotal,
      shipping_amount: delivery_fee,
      final_amount: total_amount,
      payment_status: 'pending',
      order_status: 'pending',
      payment_method,
      razorpay_order_id: normalizedRazorpayOrderId || null,
      razorpay_payment_id: normalizedTransactionId || null,
      shipping_address,
      billing_address: shipping_address // assuming same for now
    }, { transaction });

    // Create Order Items
    for (const item of normalizedOrderItems) {
      await OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        total_price: item.total_price
      }, { transaction });
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });

  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    if (error instanceof UniqueConstraintError && normalizedTransactionId) {
      const existingOrder = await Order.findOne({
        where: { razorpay_payment_id: normalizedTransactionId }
      });

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'Order already exists for this payment.',
          data: existingOrder
        });
      }
    }
    console.error('Error creating order:', error);
    return res.status(error?.statusCode || 500).json({
      success: false,
      message: error?.message || 'Failed to create order',
      error: error.message
    });
  }
});

// Admin Order Routes
router.get('/orders', async (req, res) => {

  console.log('req.query1', req.query);
  try {
    const { status = '' } = req.query;

    let whereCondition = {};
    if (status) {
      whereCondition.order_status = status;
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereCondition,
      attributes: [
        'id', 'order_number', 'user_id', 'total_amount', 'discount_amount', 
        'shipping_amount', 'final_amount', 'payment_status', 'order_status', 
        'payment_method', 'razorpay_order_id', 'razorpay_payment_id', 
        'shipping_address', 'billing_address', 'coupon_id', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email', 'phone'],
          required: false
        },
        {
          model: OrderItem,
          attributes: ['id', 'product_id', 'quantity', 'price', 'total_price'],
          required: false,
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'sku', 'images'],
              required: false
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
    });

    const plainOrders = orders.map((order) =>
      typeof order?.toJSON === 'function' ? order.toJSON() : order
    );

    const couponIds = [...new Set(
      plainOrders
        .map((order) => Number(order?.coupon_id || 0))
        .filter((couponId) => Number.isInteger(couponId) && couponId > 0)
    )];

    const couponRows = couponIds.length
      ? await Coupon.findAll({
          where: { id: { [Op.in]: couponIds } },
          attributes: ['id', 'code']
        })
      : [];

    const couponMap = new Map(
      couponRows.map((coupon) => [Number(coupon.id), typeof coupon?.toJSON === 'function' ? coupon.toJSON() : coupon])
    );

    const usageRows = couponIds.length
      ? await Order.findAll({
          where: {
            coupon_id: { [Op.in]: couponIds }
          },
          attributes: [
            'user_id',
            'coupon_id',
            [sequelize.fn('COUNT', sequelize.col('id')), 'usage_count']
          ],
          group: ['user_id', 'coupon_id'],
          raw: true
        })
      : [];

    const usageMap = new Map(
      usageRows.map((usageRow) => [
        `${Number(usageRow.user_id || 0)}:${Number(usageRow.coupon_id || 0)}`,
        Number(usageRow.usage_count || 0)
      ])
    );

    const enrichedOrders = plainOrders.map((order) => {
      const couponId = Number(order?.coupon_id || 0);
      const userId = Number(order?.user_id || 0);
      const coupon = couponMap.get(couponId) || null;
      const usageCount = couponId > 0 && userId > 0
        ? Number(usageMap.get(`${userId}:${couponId}`) || 0)
        : 0;

      return {
        ...order,
        coupon_code: coupon?.code || '',
        coupon_usage_count: usageCount
      };
    });

    return res.status(200).json({
      message: 'Orders fetched successfully',
      data: enrichedOrders,
      total: count,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching orders:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get Single Order
router.get('/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: OrderItem,
          include: [Product]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    return res.status(200).json({
      message: 'Order found successfully',
      data: order,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching order:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Update Order Status
router.put('/orders/:id/status', async (req, res) => {
  let transaction;

  try {
    const { order_status } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(order_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status'
      });
    }

    transaction = await sequelize.transaction();

    const order = await Order.findByPk(req.params.id, { transaction });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousStatus = String(order.order_status || '').toLowerCase();
    const nextStatus = String(order_status || '').toLowerCase();

    if (previousStatus !== nextStatus) {
      const orderItems = await OrderItem.findAll({
        where: { order_id: order.id },
        transaction
      });

      if (previousStatus !== 'cancelled' && nextStatus === 'cancelled') {
        await restoreInventoryForOrderItems(orderItems, { transaction });
      }

      if (previousStatus === 'cancelled' && nextStatus !== 'cancelled') {
        await reserveInventoryForOrderItems(orderItems, { transaction });
      }
    }

    await order.update({ order_status: nextStatus }, { transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });

  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('Error during order status update:', error);
    return res.status(error?.statusCode || 500).json({
      message: error?.message || 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});






// Get User Orders
router.get('/orders/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      message: 'User orders fetched successfully',
      data: orders
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});


// Get User Profile
router.post('/getProfile', async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'basePass64', 'otp', 'otp_expiry'] }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Edit User Profile
router.post('/editProfile', async (req, res) => {
  try {
    const { id, name, phone, address } = req.body;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({
      name: name !== undefined ? name : user.name,
      phone: phone !== undefined ? phone : user.phone,
      address: address !== undefined ? address : user.address,
    });

    // Issue a fresh token so frontend stays in sync
    const newToken = generateToken(user);

    res.json({ success: true, message: 'Profile updated successfully', data: user, token: newToken });
  } catch (error) {
    console.error('Edit profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Address Routes (Mocking Address model if not exists, or using User address field for simplicity initially,
// but plan called for Address Book. Let's assume we might need an Address model later.
// For now, I'll store a simple list in the User model or just use the main address.
// CHECK: User model has 'address' column. Is there an Address model? NO.
// I will create a simple Address model or just use the user.address for now to save time,
// BUT the plan asked for "Address Book" (multiple).
// Let's create a separate Address model or just mock the multiple addresses extraction from a JSON field if compatible.
// Actually, `order.js` has `shipping_address` JSON. User might not have multiple addresses table yet.
// I will create a new Address model in the backend first to support "Address Book".
// Wait, I can't create files easily without restarting server explicitly.
// Refined Plan: supporting single address in Profile for now, and mocked "Address Book" in frontend or
// just implement standard profile editing. The user prompt said "implement step by step".
// Let's stick to the Profile first.

// Wishlist Routes
const Wishlist = require("../models/wishlist");

// Cart Routes (requires login)
const getProductStock = (product) => {
  const stock = Number(product?.stock ?? product?.quantity ?? 0);
  return Number.isFinite(stock) ? Math.max(stock, 0) : 0;
};

const buildStockLimitMessage = (productName, availableQty) => {
  const safeName = String(productName || 'This product');
  const safeAvailable = Math.max(0, Number(availableQty) || 0);
  if (safeAvailable <= 0) {
    return `${safeName} is currently out of stock.`;
  }
  return `Only ${safeAvailable} left in stock for ${safeName}.`;
};

const getCartProductImage = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const normalized = normalizeProductImage(images[0]);
  return normalized || 'assets/yuvic/img/shop/grocery/01.png';
};

const emptyCartPayload = () => ({
  items: [],
  subtotal: 0,
  total_items: 0,
  delivery_fee: 0,
  total: 0,
  free_delivery_threshold: 100,
  coupon_discount: 0,
  coupon_code: null,
  coupon_id: null,
  applied_coupon: null
});

const buildCartPayload = async (userId) => {
  if (!userId) return emptyCartPayload();

  const cartRows = await Cart.findAll({
    where: { user_id: userId },
    order: [['id', 'ASC']]
  });

  if (!cartRows.length) return emptyCartPayload();

  const productIds = cartRows.map((row) => Number(row.product_id)).filter((id) => Number.isInteger(id) && id > 0);
  const products = await Product.findAll({
    where: { id: productIds },
    include: [{ model: Category, attributes: ['id', 'name', 'slug'] }]
  });

  const productMap = new Map(products.map((product) => [Number(product.id), product]));

  // Load any selected variants so we can show the variant size + price
  const variantIds = cartRows
    .map((row) => Number(row.variant_id))
    .filter((id) => Number.isInteger(id) && id > 0);
  const variantMap = new Map();
  if (variantIds.length) {
    const variants = await ProductVariant.findAll({ where: { id: variantIds } });
    variants.forEach((v) => variantMap.set(Number(v.id), v));
  }

  const items = [];

  for (const row of cartRows) {
    const product = productMap.get(Number(row.product_id));
    if (!product) continue;

    const variant = row.variant_id ? variantMap.get(Number(row.variant_id)) : null;
    const selectedSize = row.selected_size || (variant ? variant.name : null);
    const price = variant ? Number(variant.price || 0) : Number(product.price || 0);
    const quantity = Math.max(1, Number(row.quantity) || 1);
    items.push({
      id: String(row.id),
      product_id: String(product.id),
      product_slug: product.slug,
      product_name: selectedSize ? `${product.name} (${selectedSize})` : product.name,
      product_image: getCartProductImage(product),
      price,
      quantity,
      selected_size: selectedSize || undefined,
      variant_id: variant ? Number(variant.id) : undefined,
      stock: variant ? Number(variant.stock) : getProductStock(product),
      total: Number((price * quantity).toFixed(2)),
      category_id: product.category_id || null,
      category_name: product.Category?.name || null,
      category_slug: product.Category?.slug || null
    });
  }

  const subtotal = Number(items.reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2));
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const freeDeliveryThreshold = 100;
  const deliveryFee = subtotal > 0 && subtotal <= freeDeliveryThreshold ? 10 : 0;

  return {
    items,
    subtotal,
    total_items: totalItems,
    delivery_fee: deliveryFee,
    total: Number((subtotal + deliveryFee).toFixed(2)),
    free_delivery_threshold: freeDeliveryThreshold,
    coupon_discount: 0,
    coupon_code: null,
    coupon_id: null,
    applied_coupon: null
  };
};

router.get('/cart', verifyToken, async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Please login first to view your cart.' });
    }

    const cart = await buildCartPayload(user_id);
    return res.json({ success: true, data: cart });
  } catch (error) {
    console.error('cart/get error:', error);
    return res.status(500).json({ success: false, message: 'Server error while loading cart.' });
  }
});

router.post('/cart/add', verifyToken, async (req, res) => {
  let transaction;
  try {
    const user_id = req.user?.id;
    const { product_id, quantity = 1, variant_id = null, selected_size = null } = req.body || {};

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Please login first to add products to cart.' });
    }

    const parsedProductId = Number(product_id);
    const parsedQty = Math.max(1, Number(quantity) || 1);
    const parsedVariantId = Number(variant_id);
    const normalizedVariantId = Number.isInteger(parsedVariantId) && parsedVariantId > 0 ? parsedVariantId : null;
    const normalizedSize = selected_size ? String(selected_size).trim() : null;
    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    transaction = await sequelize.transaction();

    const product = await Product.findByPk(parsedProductId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const stock = getProductStock(product);
    if (stock <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: `${product.name} is currently out of stock.` });
    }

    const lockedCartRows = await Cart.findAll({
      where: { product_id: parsedProductId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const existing = lockedCartRows.find((row) => Number(row.user_id) === Number(user_id));
    const currentUserQty = Math.max(0, Number(existing?.quantity) || 0);
    const reservedByOthers = lockedCartRows.reduce((sum, row) => {
      if (Number(row.user_id) === Number(user_id)) return sum;
      return sum + Math.max(0, Number(row.quantity) || 0);
    }, 0);
    const maxAvailableForUser = Math.max(stock - reservedByOthers, 0);
    const nextQty = currentUserQty + parsedQty;

    if (nextQty > maxAvailableForUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: buildStockLimitMessage(product.name, maxAvailableForUser)
      });
    }

    if (existing) {
      await existing.update({
        quantity: nextQty,
        variant_id: normalizedVariantId ?? existing.variant_id ?? null,
        selected_size: normalizedSize ?? existing.selected_size ?? null
      }, { transaction });
    } else {
      await Cart.create({
        user_id,
        product_id: parsedProductId,
        quantity: parsedQty,
        variant_id: normalizedVariantId,
        selected_size: normalizedSize
      }, { transaction });
    }

    await transaction.commit();
    const cart = await buildCartPayload(user_id);
    return res.status(existing ? 200 : 201).json({
      success: true,
      message: existing ? 'Cart updated.' : 'Added to cart.',
      data: cart
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('cart/add error:', error);
    return res.status(500).json({ success: false, message: 'Server error while adding to cart.' });
  }
});

router.put('/cart/update', verifyToken, async (req, res) => {
  let transaction;
  try {
    const user_id = req.user?.id;
    const { product_id, quantity } = req.body || {};

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Please login first to update your cart.' });
    }

    const parsedProductId = Number(product_id);
    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    transaction = await sequelize.transaction();

    const lockedCartRows = await Cart.findAll({
      where: { product_id: parsedProductId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    const existing = lockedCartRows.find((row) => Number(row.user_id) === Number(user_id));
    if (!existing) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Cart item not found.' });
    }

    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      await existing.destroy({ transaction });
      await transaction.commit();
      const cart = await buildCartPayload(user_id);
      return res.json({ success: true, message: 'Item removed from cart.', data: cart });
    }

    const product = await Product.findByPk(parsedProductId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!product) {
      await existing.destroy({ transaction });
      await transaction.commit();
      const cart = await buildCartPayload(user_id);
      return res.json({ success: true, message: 'Product no longer exists and was removed from cart.', data: cart });
    }

    const stock = getProductStock(product);
    if (stock <= 0) {
      await existing.destroy({ transaction });
      await transaction.commit();
      const cart = await buildCartPayload(user_id);
      return res.status(400).json({ success: false, message: `${product.name} is currently out of stock.`, data: cart });
    }

    const reservedByOthers = lockedCartRows.reduce((sum, row) => {
      if (Number(row.user_id) === Number(user_id)) return sum;
      return sum + Math.max(0, Number(row.quantity) || 0);
    }, 0);
    const maxAvailableForUser = Math.max(stock - reservedByOthers, 0);

    if (parsedQty > maxAvailableForUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: buildStockLimitMessage(product.name, maxAvailableForUser)
      });
    }

    await existing.update({ quantity: parsedQty }, { transaction });
    await transaction.commit();
    const cart = await buildCartPayload(user_id);
    return res.json({ success: true, message: 'Cart updated.', data: cart });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error('cart/update error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating cart.' });
  }
});

router.delete('/cart/:productId', verifyToken, async (req, res) => {
  try {
    const user_id = req.user?.id;
    const parsedProductId = Number(req.params.productId);

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Please login first to update your cart.' });
    }

    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid product id.' });
    }

    await Cart.destroy({ where: { user_id, product_id: parsedProductId } });
    const cart = await buildCartPayload(user_id);
    return res.json({ success: true, message: 'Item removed from cart.', data: cart });
  } catch (error) {
    console.error('cart/delete error:', error);
    return res.status(500).json({ success: false, message: 'Server error while removing cart item.' });
  }
});

router.delete('/cart', verifyToken, async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Please login first to clear your cart.' });
    }

    await Cart.destroy({ where: { user_id } });
    return res.json({ success: true, message: 'Cart cleared.', data: emptyCartPayload() });
  } catch (error) {
    console.error('cart/clear error:', error);
    return res.status(500).json({ success: false, message: 'Server error while clearing cart.' });
  }
});

router.post('/cart/merge', verifyToken, async (req, res) => {
  try {
    const user_id = req.user?.id;
    const incomingItems = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'Please login first to merge your cart.' });
    }

    for (const rawItem of incomingItems) {
      const parsedProductId = Number(rawItem?.product_id);
      const parsedQty = Math.max(1, Number(rawItem?.quantity) || 1);
      if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) continue;

      const parsedVariantId = Number(rawItem?.variant_id);
      const normalizedVariantId = Number.isInteger(parsedVariantId) && parsedVariantId > 0 ? parsedVariantId : null;
      const normalizedSize = rawItem?.selected_size ? String(rawItem.selected_size).trim() : null;

      const product = await Product.findByPk(parsedProductId);
      if (!product) continue;

      const stock = getProductStock(product);
      if (stock <= 0) continue;

      const existing = await Cart.findOne({ where: { user_id, product_id: parsedProductId } });
      const nextQty = Math.min((existing?.quantity || 0) + parsedQty, stock);

      if (existing) {
        await existing.update({
          quantity: nextQty,
          variant_id: normalizedVariantId ?? existing.variant_id ?? null,
          selected_size: normalizedSize ?? existing.selected_size ?? null
        });
      } else {
        await Cart.create({
          user_id,
          product_id: parsedProductId,
          quantity: Math.min(parsedQty, stock),
          variant_id: normalizedVariantId,
          selected_size: normalizedSize
        });
      }
    }

    const cart = await buildCartPayload(user_id);
    return res.json({ success: true, message: 'Guest cart merged successfully.', data: cart });
  } catch (error) {
    console.error('cart/merge error:', error);
    return res.status(500).json({ success: false, message: 'Server error while merging cart.' });
  }
});

router.post('/wishlist', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: 'product_id is required' });
    }

    const existing = await Wishlist.findOne({ where: { user_id, product_id } });
    if (existing) {
      return res.json({ success: false, message: 'Item already in wishlist' });
    }

    const item = await Wishlist.create({ user_id, product_id });
    res.json({ success: true, message: 'Added to wishlist', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/wishlist/user/:userId', async (req, res) => {
  try {
    const items = await Wishlist.findAll({
      where: { user_id: req.params.userId },
      include: [{ model: Product }]
    });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/wishlist/:id', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    await Wishlist.destroy({ where: { id: req.params.id, user_id } });
    res.json({ success: true, message: 'Removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Review Routes
const Review = require("../models/review");

router.post('/reviews', async (req, res) => {
  try {
    const { user_id, product_id, rating, comment } = req.body;

    // Check if user already reviewed
    const existing = await Review.findOne({ where: { user_id, product_id } });
    if (existing) {
      return res.json({ success: false, message: 'You have already reviewed this product' });
    }

    const review = await Review.create({ user_id, product_id, rating, comment });
    res.json({ success: true, message: 'Review submitted', data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reviews/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { product_id: req.params.productId },
      include: [{ model: User, attributes: ['name', 'id'] }],
      order: [['id', 'DESC']]
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const normalizeCouponPayload = (coupon) => {
  const raw = coupon.toJSON ? coupon.toJSON() : coupon;
  const payload = {
    ...raw,
    id: Number(raw.id),
    code: String(raw.code || '').trim().toUpperCase(),
    value: Number(raw.value || 0),
    min_order_amount: Number(raw.min_order_amount || 0),
    max_discount: raw.max_discount !== null && raw.max_discount !== undefined ? Number(raw.max_discount) : null,
    usage_limit: raw.usage_limit !== null && raw.usage_limit !== undefined ? Number(raw.usage_limit) : null,
    valid_from: raw.valid_from || null,
    valid_until: raw.valid_until || null,
    used_count: Number(raw.used_count || 0),
    cart_users_count: Number(raw.cart_users_count || 0)
  };

  if (payload.usage_limit !== null) {
    payload.valid_from = null;
    payload.valid_until = null;
  }

  return payload;
};

const normalizeCouponTypeInput = (value, fallback = 'percentage') => {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  if (normalized === 'percentage' || normalized === 'percent') return 'percentage';
  if (normalized === 'fixed' || normalized === 'fixed amount' || normalized === 'amount') return 'fixed';
  return fallback;
};

const normalizeCouponNumberInput = (value, { allowNull = false, fallback = 0 } = {}) => {
  if (value === null || value === undefined || value === '') {
    return allowNull ? null : fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : (allowNull ? null : fallback);
  }

  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (!cleaned) return allowNull ? null : fallback;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : (allowNull ? null : fallback);
};

const normalizeCouponStatusInput = (value, fallback = true) => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'active', 'enabled', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'inactive', 'disabled', 'no'].includes(normalized)) return false;
  return fallback;
};

const normalizeCouponDateInput = (value, fallback = null) => {
  const source = value ?? fallback;
  if (!source) return fallback;
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

const prepareCouponPayload = (body = {}, existingCoupon = null) => {
  const fallbackType = existingCoupon?.type || 'percentage';
  const type = normalizeCouponTypeInput(body.type, fallbackType);

  const payload = {
    code: String(body.code ?? existingCoupon?.code ?? '').trim().toUpperCase(),
    type,
    value: normalizeCouponNumberInput(body.value, { fallback: Number(existingCoupon?.value || 0) }),
    min_order_amount: normalizeCouponNumberInput(body.min_order_amount, {
      fallback: Number(existingCoupon?.min_order_amount || 0)
    }),
    max_discount: type === 'percentage'
      ? normalizeCouponNumberInput(body.max_discount, { allowNull: true, fallback: existingCoupon?.max_discount ?? null })
      : null,
    usage_limit: normalizeCouponNumberInput(body.usage_limit, { allowNull: true, fallback: existingCoupon?.usage_limit ?? null }),
    valid_from: null,
    valid_until: null,
    status: normalizeCouponStatusInput(body.status, existingCoupon?.status ?? true)
  };

  if (payload.usage_limit === null || payload.usage_limit === undefined) {
    payload.valid_from = normalizeCouponDateInput(body.valid_from, existingCoupon?.valid_from || null);
    payload.valid_until = normalizeCouponDateInput(body.valid_until, existingCoupon?.valid_until || null);

    if (!payload.valid_from || !payload.valid_until) {
      throw new Error('Coupon validity dates are required.');
    }
  }

  if (!payload.code) {
    throw new Error('Coupon code is required.');
  }

  return payload;
};

const calculateCouponDiscount = (coupon, subtotal) => {
  const normalizedSubtotal = Number(subtotal || 0);
  const normalizedCoupon = normalizeCouponPayload(coupon);
  let discount = 0;

  if (normalizedCoupon.type === 'percentage') {
    discount = normalizedSubtotal * (normalizedCoupon.value / 100);
    if (normalizedCoupon.max_discount !== null) {
      discount = Math.min(discount, normalizedCoupon.max_discount);
    }
  } else {
    discount = normalizedCoupon.value;
  }

  if (!Number.isFinite(discount) || discount < 0) return 0;
  return Math.min(discount, normalizedSubtotal);
};

const validateCouponAgainstSubtotal = (coupon, subtotal) => {
  const normalizedSubtotal = Number(subtotal || 0);
  const normalizedCoupon = normalizeCouponPayload(coupon);
  const now = new Date();

  if (!normalizedCoupon.status) {
    return 'This coupon is currently inactive.';
  }
  if (normalizedCoupon.usage_limit === null) {
    if (!normalizedCoupon.valid_from || !normalizedCoupon.valid_until) {
      return 'Coupon validity dates are required.';
    }
    if (new Date(normalizedCoupon.valid_from) > now) {
      return 'This coupon is not active yet.';
    }
    if (new Date(normalizedCoupon.valid_until) < now) {
      return 'This coupon has expired.';
    }
  }
  if (
    normalizedCoupon.usage_limit !== null &&
    normalizedCoupon.used_count >= normalizedCoupon.usage_limit
  ) {
    return 'This coupon has reached its usage limit.';
  }
  if (normalizedSubtotal < normalizedCoupon.min_order_amount) {
    const remaining = normalizedCoupon.min_order_amount - normalizedSubtotal;
    return `Your cart is currently \u20B9${normalizedSubtotal.toFixed(2)}. This coupon unlocks at \u20B9${normalizedCoupon.min_order_amount.toFixed(2)}. Add \u20B9${remaining.toFixed(2)} more to use this coupon.`;
  }

  return null;
};

// Admin Coupon Routes
router.get('/coupons', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageSize = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * pageSize;

    const { count, rows: coupons } = await Coupon.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset
    });

    const couponIds = coupons.map((coupon) => coupon.id);
    const usages = couponIds.length
      ? await CouponUsage.findAll({
          where: { coupon_id: { [Op.in]: couponIds } },
          attributes: ['coupon_id', 'user_id']
        })
      : [];

    const cartUsersMap = usages.reduce((acc, usage) => {
      const couponId = Number(usage.coupon_id);
      const userId = Number(usage.user_id);
      if (!acc[couponId]) acc[couponId] = new Set();
      acc[couponId].add(userId);
      return acc;
    }, {});

    const couponData = coupons.map((coupon) => {
      const normalizedCoupon = normalizeCouponPayload(coupon);
      return {
        ...normalizedCoupon,
        cart_users_count: cartUsersMap[normalizedCoupon.id]?.size || 0
      };
    });

    return res.status(200).json({
      message: 'Coupons fetched successfully',
      data: couponData,
      total: count,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching coupons:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

router.get('/coupons/:id/usages', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const couponId = Number(req.params.id);
    if (!couponId || Number.isNaN(couponId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon id.'
      });
    }

    const coupon = await Coupon.findByPk(couponId);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    const usages = await CouponUsage.findAll({
      where: { coupon_id: couponId },
      attributes: ['user_id', 'order_id', 'applied_at', 'redeemed_at']
    });

    const orderRows = await Order.findAll({
      where: { coupon_id: couponId },
      attributes: ['user_id', 'id'],
      raw: true
    });

    const userIdsFromUsages = usages
      .map((usage) => Number(usage.user_id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const userIdsFromOrders = orderRows
      .map((order) => Number(order.user_id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const allUserIds = [...new Set([...userIdsFromUsages, ...userIdsFromOrders])];

    const users = allUserIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: allUserIds } },
          attributes: ['id', 'name', 'email', 'phone']
        })
      : [];

    const userMap = new Map(users.map((user) => [user.id, user]));
    const grouped = {};

    usages.forEach((usage) => {
      const userId = Number(usage.user_id);
      if (!Number.isInteger(userId) || userId <= 0) return;
      if (!grouped[userId]) {
        grouped[userId] = {
          user_id: userId,
          usage_count: 0,
          orders: [],
          applied_at: null,
          redeemed_at: null
        };
      }
      grouped[userId].usage_count += 1;
      if (usage.order_id) {
        grouped[userId].orders.push(usage.order_id);
      }
      if (!grouped[userId].applied_at && usage.applied_at) {
        grouped[userId].applied_at = usage.applied_at;
      }
      if (!grouped[userId].redeemed_at && usage.redeemed_at) {
        grouped[userId].redeemed_at = usage.redeemed_at;
      }
    });

    orderRows.forEach((order) => {
      const userId = Number(order.user_id);
      if (!Number.isInteger(userId) || userId <= 0) return;
      if (!grouped[userId]) {
        grouped[userId] = {
          user_id: userId,
          usage_count: 0,
          orders: [],
          applied_at: null,
          redeemed_at: null
        };
      }
      grouped[userId].orders.push(order.id);
      if (grouped[userId].usage_count === 0) {
        grouped[userId].usage_count = 1;
      }
    });

    const detailData = Object.values(grouped).map((entry) => {
      const user = userMap.get(entry.user_id) || {};
      return {
        ...entry,
        name: user.name || 'Unknown',
        email: user.email || '',
        phone: user.phone || ''
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Coupon usage details fetched successfully.',
      data: detailData,
      count: detailData.length
    });
  } catch (error) {
    console.error('Error fetching coupon usage details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon usage details.',
      error: error.message
    });
  }
});

router.get('/coupons/public', async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.findAll({
      where: {
        status: true,
        [Op.or]: [
          {
            valid_from: { [Op.lte]: now },
            valid_until: { [Op.gte]: now }
          },
          {
            usage_limit: { [Op.ne]: null }
          }
        ]
      },
      order: [['valid_until', 'ASC'], ['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: coupons.map((coupon) => normalizeCouponPayload(coupon))
    });
  } catch (error) {
    console.error('Error during fetching public coupons:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available coupons.',
      error: error.message
    });
  }
});

router.get('/coupons/storefront', async (req, res) => {
  try {
    const coupons = await Coupon.findAll({
      order: [['status', 'DESC'], ['valid_until', 'ASC'], ['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: coupons.map((coupon) => normalizeCouponPayload(coupon))
    });
  } catch (error) {
    console.error('Error during fetching storefront coupons:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons for storefront.',
      error: error.message
    });
  }
});

router.post('/coupons/validate', verifyToken, async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const subtotal = Number(req.body?.subtotal || 0);

    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const coupon = await Coupon.findOne({ where: { code } });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found.' });
    }

    const validationError = validateCouponAgainstSubtotal(coupon, subtotal);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const normalizedCoupon = normalizeCouponPayload(coupon);
    const discountAmount = calculateCouponDiscount(normalizedCoupon, subtotal);

    const [usage, created] = await CouponUsage.findOrCreate({
      where: {
        coupon_id: normalizedCoupon.id,
        user_id: Number(req.user.id)
      },
      defaults: {
        applied_at: new Date()
      }
    });

    if (!created) {
      await usage.update({ applied_at: new Date() });
    }

    return res.status(200).json({
      success: true,
      message: 'Coupon validated successfully.',
      data: {
        coupon: normalizedCoupon,
        discount_amount: discountAmount
      }
    });
  } catch (error) {
    console.error('Error during coupon validation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate coupon.',
      error: error.message
    });
  }
});

// Add Coupon
router.post('/coupons', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const payload = prepareCouponPayload(req.body);
    const coupon = await Coupon.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: normalizeCouponPayload(coupon)
    });
  } catch (error) {
    console.error('Error during coupon creation:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Update Coupon
router.put('/coupons/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const payload = prepareCouponPayload(req.body, coupon);
    await coupon.update(payload);

    return res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: normalizeCouponPayload(coupon)
    });
  } catch (error) {
    console.error('Error during coupon update:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Delete Coupon
router.delete('/coupons/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    await CouponUsage.destroy({ where: { coupon_id: coupon.id } });
    await coupon.destroy();

    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error during coupon deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Bulk Delete Coupons - This is what your Angular service is calling
router.post('/coupons/bulk-delete', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Coupon IDs are required'
      });
    }

    await CouponUsage.destroy({
      where: {
        coupon_id: { [Op.in]: ids }
      }
    });

    const result = await Coupon.destroy({
      where: {
        id: ids
      }
    });

    return res.status(200).json({
      success: true,
      message: `${result} coupons deleted successfully`
    });
  } catch (error) {
    console.error('Error during bulk coupon deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});


// Admin CMS Routes
router.get('/cms-pages', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: pages } = await CMSPage.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      message: 'CMS pages fetched successfully',
      data: pages,
      total: count,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching CMS pages:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Add CMS Page
router.post('/cms-pages', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.status !== undefined) {
      body.status = body.status === true || body.status === 'true' || body.status === 'Active' || body.status === 1 || body.status === '1';
    }
    const page = await CMSPage.create(body);

    return res.status(201).json({
      success: true,
      message: 'CMS page created successfully',
      data: page
    });

  } catch (error) {
    console.error('Error during CMS page creation:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Update CMS Page
router.put('/cms-pages/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const page = await CMSPage.findByPk(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'CMS page not found'
      });
    }

    const body = { ...req.body };
    if (body.status !== undefined) {
      body.status = body.status === true || body.status === 'true' || body.status === 'Active' || body.status === 1 || body.status === '1';
    }
    await page.update(body);

    return res.status(200).json({
      success: true,
      message: 'CMS page updated successfully',
      data: page
    });

  } catch (error) {
    console.error('Error during CMS page update:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Delete CMS Page
router.delete('/cms-pages/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const page = await CMSPage.findByPk(req.params.id);

    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'CMS page not found'
      });
    }

    await page.destroy();

    return res.status(200).json({
      success: true,
      message: 'CMS page deleted successfully'
    });

  } catch (error) {
    console.error('Error during CMS page deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Bulk Delete CMS Pages
router.post('/cms-pages/bulk-delete', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cms IDs are required'
      });
    }

    const result = await CMSPage.destroy({
      where: {
        id: ids
      }
    });

    return res.status(200).json({
      success: true,
      message: `${result} CMS pages deleted successfully`
    });

  } catch (error) {
    console.error('Error during bulk CMS page deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});















const parseDateOnly = (value) => {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const getLocalDateOnly = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeComboSlots = (rawSlots = []) => {
  const slots = Array.isArray(rawSlots) ? rawSlots : [];
  return slots
    .map((slot, index) => ({
      slot: Number(slot?.slot || (index + 1)),
      product_id: Number(slot?.product_id),
      category_id:
        slot?.category_id !== undefined && slot?.category_id !== null && slot?.category_id !== ''
          ? Number(slot.category_id)
          : null
    }))
    .filter((slot) => Number.isInteger(slot.product_id) && slot.product_id > 0)
    .sort((a, b) => a.slot - b.slot)
    .slice(0, 4);
};

const getProductImageForCombo = (images) => {
  if (!images) return null;

  let normalizedImages = images;
  if (typeof normalizedImages === 'string') {
    try {
      normalizedImages = JSON.parse(normalizedImages);
    } catch (err) {
      normalizedImages = [];
    }
  }

  if (!Array.isArray(normalizedImages) || normalizedImages.length === 0) return null;
  const firstImage = normalizedImages[0];

  if (typeof firstImage === 'string') return firstImage;
  return normalizeProductImage(firstImage);
};

const buildComboResponse = async (combo) => {
  const slots = normalizeComboSlots(combo.product_ids);
  const productIds = [...new Set(slots.map((slot) => slot.product_id))];

  const products = productIds.length
    ? await Product.findAll({
      where: { id: productIds },
      attributes: ['id', 'name', 'price', 'images', 'category_id'],
      include: [{ model: Category, attributes: ['id', 'name'], required: false }]
    })
    : [];

  const productMap = new Map(products.map((product) => [Number(product.id), product]));

  const enrichedSlots = slots.map((slot, index) => {
    const product = productMap.get(slot.product_id);
    const resolvedCategoryId = slot.category_id || product?.category_id || null;
    const categoryFromProduct = product?.Category || null;

    return {
      slot: index + 1,
      product_id: slot.product_id,
      product_name: product?.name || '',
      product_price: Number(product?.price || 0),
      product_image: getProductImageForCombo(product?.images),
      category_id: resolvedCategoryId,
      category_name: categoryFromProduct?.name || '',
    };
  });

  return {
    id: combo.id,
    name: combo.name,
    image: normalizeManagedUploadPath(combo.image, 'combos'),
    discount_price: Number(combo.discount_price || 0),
    combo_size: Number(combo.combo_size || 4),
    active: !!combo.active,
    valid_from: combo.valid_from || null,
    valid_to: combo.valid_to || null,
    product_ids: slots,
    products: enrichedSlots,
    created_at: combo.createdAt || combo.created_at || null,
    updated_at: combo.updatedAt || combo.updated_at || null
  };
};

const validateAndNormalizeComboPayload = async (body) => {
  const name = String(body?.name || '').trim();
  if (!name) {
    return { ok: false, status: 400, message: 'Combo name is required' };
  }

  const discountPrice = Number(body?.discount_price);
  if (!Number.isFinite(discountPrice) || discountPrice < 0) {
    return { ok: false, status: 400, message: 'Combo price must be a valid non-negative number' };
  }

  const validFrom = parseDateOnly(body?.valid_from);
  const validTo = parseDateOnly(body?.valid_to);
  if (!validFrom || !validTo) {
    return { ok: false, status: 400, message: 'Validity start and end dates are required (YYYY-MM-DD)' };
  }
  if (validFrom > validTo) {
    return { ok: false, status: 400, message: 'Validity end date cannot be before start date' };
  }

  const parseIncomingSlots = (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    return [];
  };

  const incomingSlots = parseIncomingSlots(body?.product_ids).length
    ? parseIncomingSlots(body?.product_ids)
    : parseIncomingSlots(body?.products);

  if (incomingSlots.length !== 4) {
    return { ok: false, status: 400, message: 'Exactly 4 products are required for a predefined combo' };
  }

  const normalizedSlots = incomingSlots.map((slot, index) => ({
    slot: index + 1,
    product_id: Number(slot?.product_id),
    category_id: Number(slot?.category_id)
  }));

  for (const slot of normalizedSlots) {
    if (!Number.isInteger(slot.product_id) || slot.product_id <= 0) {
      return { ok: false, status: 400, message: `Product ${slot.slot} must have a valid product` };
    }
    if (!Number.isInteger(slot.category_id) || slot.category_id <= 0) {
      return { ok: false, status: 400, message: `Product ${slot.slot} must have a valid category` };
    }
  }

  const uniqueProductIds = new Set(normalizedSlots.map((slot) => slot.product_id));
  if (uniqueProductIds.size !== normalizedSlots.length) {
    return { ok: false, status: 400, message: 'Each combo slot must have a different product' };
  }

  const products = await Product.findAll({
    where: { id: [...uniqueProductIds] },
    attributes: ['id', 'category_id', 'status']
  });

  if (products.length !== uniqueProductIds.size) {
    return { ok: false, status: 400, message: 'One or more selected products were not found' };
  }

  const categories = await Category.findAll({
    attributes: ['id', 'parent_id']
  });

  const categoryParentMap = new Map(
    categories.map((category) => [Number(category.id), category.parent_id !== null ? Number(category.parent_id) : null])
  );

  const doesCategoryMatch = (productCategoryId, selectedCategoryId) => {
    let currentCategoryId = Number(productCategoryId);
    const targetCategoryId = Number(selectedCategoryId);
    const visited = new Set();

    while (Number.isInteger(currentCategoryId) && currentCategoryId > 0 && !visited.has(currentCategoryId)) {
      if (currentCategoryId === targetCategoryId) {
        return true;
      }

      visited.add(currentCategoryId);
      const parentCategoryId = categoryParentMap.get(currentCategoryId);
      if (!Number.isInteger(parentCategoryId) || parentCategoryId <= 0) {
        break;
      }

      currentCategoryId = parentCategoryId;
    }

    return false;
  };

  const productMap = new Map(products.map((product) => [Number(product.id), product]));
  for (const slot of normalizedSlots) {
    const product = productMap.get(slot.product_id);
    if (!product) {
      return { ok: false, status: 400, message: `Product ${slot.slot} is invalid` };
    }
    if (product.status === false) {
      return { ok: false, status: 400, message: `Product ${slot.slot} is inactive` };
    }
    if (!doesCategoryMatch(product.category_id, slot.category_id)) {
      return {
        ok: false,
        status: 400,
        message: `Product ${slot.slot} does not belong to the selected category`
      };
    }
  }

  return {
    ok: true,
    data: {
      name,
      discount_price: discountPrice,
      combo_size: 4,
      active: body?.active !== undefined ? parseSliderBoolean(body.active, true) : true,
      valid_from: validFrom,
      valid_to: validTo,
      product_ids: normalizedSlots
    }
  };
};

const COMBO_BOX_SETTINGS_SLUG = 'combo-box-settings';
const DEFAULT_COMBO_BOX_SETTINGS = {
  box_price: 1200,
  image: null
};

router.get('/combo-box-settings', async (req, res) => {
  try {
    const page = await CMSPage.findOne({ where: { slug: COMBO_BOX_SETTINGS_SLUG } });

    if (page?.content) {
      try {
        const data = JSON.parse(page.content);
        return res.status(200).json({
          success: true,
          data: {
            ...DEFAULT_COMBO_BOX_SETTINGS,
            ...data,
            box_price: Number(data?.box_price ?? DEFAULT_COMBO_BOX_SETTINGS.box_price) || DEFAULT_COMBO_BOX_SETTINGS.box_price,
            image: normalizeManagedUploadPath(data?.image, 'combo-box-settings'),
            updated_at: page.updatedAt || page.updated_at || null
          }
        });
      } catch (parseError) {
        console.error('Error parsing combo-box-settings content:', parseError);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ...DEFAULT_COMBO_BOX_SETTINGS,
        updated_at: null
      }
    });
  } catch (error) {
    console.error('Error during fetching combo-box-settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error, please try again later.',
      error: error.message
    });
  }
});

router.post('/combo-box-settings', uploadComboBoxSettingsImage.single('image'), async (req, res) => {
  try {
    const parsedPrice = Number(req.body?.box_price);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid build your own box price is required'
      });
    }

    const existing = await CMSPage.findOne({ where: { slug: COMBO_BOX_SETTINGS_SLUG } });
    let existingContent = {};

    if (existing?.content) {
      try {
        existingContent = JSON.parse(existing.content);
      } catch (parseError) {
        console.error('Error parsing existing combo-box-settings content:', parseError);
      }
    }

    const incomingImage = normalizeManagedUploadPath(req.body?.image, 'combo-box-settings');
    const wantsImageRemoval =
      String(req.body?.remove_image || '').toLowerCase() === 'true' ||
      (req.body?.image !== undefined && String(req.body.image).trim() === '');

    let nextImage = normalizeManagedUploadPath(existingContent?.image, 'combo-box-settings');
    if (req.file) {
      deleteManagedUploadFile(nextImage, 'combo-box-settings');
      nextImage = `/uploads/combo-box-settings/${req.file.filename}`;
    } else if (wantsImageRemoval) {
      deleteManagedUploadFile(nextImage, 'combo-box-settings');
      nextImage = null;
    } else if (incomingImage) {
      nextImage = incomingImage;
    }

    const content = JSON.stringify({
      box_price: parsedPrice,
      image: nextImage
    });

    if (existing) {
      await existing.update({ content });
    } else {
      const createdPage = await CMSPage.create({
        slug: COMBO_BOX_SETTINGS_SLUG,
        title: 'Combo Box Settings',
        content,
        status: true
      });

      return res.status(200).json({
        success: true,
        message: 'Build your own box settings updated successfully',
        data: {
          box_price: parsedPrice,
          image: nextImage,
          updated_at: createdPage.updatedAt || createdPage.updated_at || null
        }
      });
    }

    const refreshedPage = await CMSPage.findOne({ where: { slug: COMBO_BOX_SETTINGS_SLUG } });

    return res.status(200).json({
      success: true,
      message: 'Build your own box settings updated successfully',
      data: {
        box_price: parsedPrice,
        image: nextImage,
        updated_at: refreshedPage?.updatedAt || refreshedPage?.updated_at || null
      }
    });
  } catch (error) {
    console.error('Error during saving combo-box-settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error, please try again later.',
      error: error.message
    });
  }
});

// Combo Listing (Admin)
router.get('/combos', async (req, res) => {
  try {
    const combos = await Combo.findAll({
      order: [['createdAt', 'DESC']]
    });

    const enriched = await Promise.all(combos.map((combo) => buildComboResponse(combo)));

    return res.status(200).json({
      message: 'Combos fetched successfully',
      data: enriched,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching combos:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Active predefined combos (Frontend)
router.get('/combos/predefined', async (req, res) => {
  try {
    // Use local date (not UTC date) to avoid excluding "today" combos in IST/other positive timezones.
    const today = getLocalDateOnly(new Date());

    const combos = await Combo.findAll({
      where: {
        active: true,
        [Op.and]: [
          {
            [Op.or]: [
              { valid_from: null },
              { valid_from: { [Op.lte]: today } }
            ]
          },
          {
            [Op.or]: [
              { valid_to: null },
              { valid_to: { [Op.gte]: today } }
            ]
          }
        ]
      },
      order: [['createdAt', 'DESC']]
    });

    const enriched = await Promise.all(combos.map((combo) => buildComboResponse(combo)));

    return res.status(200).json({
      message: 'Predefined combos fetched successfully',
      data: enriched,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching predefined combos:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get Single Combo
router.get('/combos/:id', async (req, res) => {
  try {
    const comboId = req.params.id;
    const combo = await Combo.findByPk(comboId);

    if (!combo) {
      return res.status(404).json({
        success: false,
        message: 'Combo not found'
      });
    }

    const enrichedCombo = await buildComboResponse(combo);

    return res.status(200).json({
      message: 'Combo found successfully',
      data: enrichedCombo,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching combo:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Add Combo
router.post('/combos', verifyToken, verifySuperuser, uploadComboImage.single('image'), async (req, res) => {
  try {
    const normalized = await validateAndNormalizeComboPayload(req.body);
    if (!normalized.ok) {
      if (req.file) {
        deleteManagedUploadFile(`/uploads/combos/${req.file.filename}`, 'combos');
      }
      return res.status(normalized.status).json({
        success: false,
        message: normalized.message
      });
    }

    const payload = {
      ...normalized.data,
      image: req.file
        ? req.file.path
        : normalizeManagedUploadPath(req.body?.image, 'combos')
    };

    const existingCombo = await Combo.findOne({ where: { name: payload.name } });
    if (existingCombo) {
      return res.status(400).json({
        success: false,
        message: 'Combo name already exists'
      });
    }

    const combo = await Combo.create(payload);
    const enrichedCombo = await buildComboResponse(combo);

    return res.status(201).json({
      success: true,
      message: 'Combo created successfully',
      data: enrichedCombo
    });
  } catch (error) {
    if (req.file) {
      deleteManagedUploadFile(`/uploads/combos/${req.file.filename}`, 'combos');
    }
    console.error('Error during combo creation:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Update Combo
router.put('/combos/:id', verifyToken, verifySuperuser, uploadComboImage.single('image'), async (req, res) => {
  try {
    const comboId = req.params.id;
    const combo = await Combo.findByPk(comboId);
    if (!combo) {
      if (req.file) {
        deleteManagedUploadFile(`/uploads/combos/${req.file.filename}`, 'combos');
      }
      return res.status(404).json({
        success: false,
        message: 'Combo not found'
      });
    }

    const normalized = await validateAndNormalizeComboPayload(req.body);
    if (!normalized.ok) {
      if (req.file) {
        deleteManagedUploadFile(`/uploads/combos/${req.file.filename}`, 'combos');
      }
      return res.status(normalized.status).json({
        success: false,
        message: normalized.message
      });
    }

    const incomingImage = normalizeManagedUploadPath(req.body?.image, 'combos');
    const wantsImageRemoval = req.body?.image !== undefined && String(req.body.image).trim() === '';
    const payload = { ...normalized.data };

    if (req.file) {
      deleteManagedUploadFile(combo.image, 'combos');
      payload.image = req.file.path;
    } else if (wantsImageRemoval) {
      deleteManagedUploadFile(combo.image, 'combos');
      payload.image = null;
    } else {
      payload.image = incomingImage || combo.image || null;
    }

    const existingCombo = await Combo.findOne({
      where: {
        name: payload.name,
        id: { [Op.ne]: combo.id }
      }
    });
    if (existingCombo) {
      return res.status(400).json({
        success: false,
        message: 'Combo name already exists'
      });
    }

    await combo.update(payload);
    const enrichedCombo = await buildComboResponse(combo);

    return res.status(200).json({
      success: true,
      message: 'Combo updated successfully',
      data: enrichedCombo
    });
  } catch (error) {
    if (req.file) {
      deleteManagedUploadFile(`/uploads/combos/${req.file.filename}`, 'combos');
    }
    console.error('Error during combo update:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Delete Combo
router.delete('/combos/:id', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const comboId = req.params.id;

    const combo = await Combo.findByPk(comboId);
    if (!combo) {
      return res.status(404).json({
        success: false,
        message: 'Combo not found'
      });
    }

    deleteManagedUploadFile(combo.image, 'combos');
    await combo.destroy();

    return res.status(200).json({
      success: true,
      message: 'Combo deleted successfully'
    });

  } catch (error) {
    console.error('Error during combo deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Bulk Delete Combos
router.post('/combos/bulk-delete', verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Combo IDs are required'
      });
    }

    const result = await Combo.destroy({
      where: {
        id: ids
      }
    });

    return res.status(200).json({
      success: true,
      message: `${result} combos deleted successfully`
    });

  } catch (error) {
    console.error('Error during bulk combo deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get products for dropdown




// ProductType Listing
router.get('/producttypes', async (req, res) => {
  try {
    const producttypes = await ProductType.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Enrich producttypes with product details manually


    return res.status(200).json({
      message: 'ProductTypes fetched successfully',
      data: producttypes,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching producttypes:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Get Single producttype
router.get('/producttypes/:id', async (req, res) => {
  try {
    const producttypeId = req.params.id;
    const producttype = await ProductType.findByPk(producttypeId);

    if (!producttype) {
      return res.status(404).json({
        success: false,
        message: 'ProductType not found'
      });
    }

    // Get product details for the producttype



    const enrichedProductType = {
      id: producttype.id,
      name: producttype.name,
      active: producttype.active,
      created_at: producttype.created_at,
      updated_at: producttype.updated_at,
    };

    return res.status(200).json({
      message: 'ProductType found successfully',
      data: enrichedProductType,
      success: true
    });
  } catch (error) {
    console.error('Error during fetching producttype:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Add producttype
router.post('/producttypes', async (req, res) => {
  try {
    console.log('req.body:', req.body);

    const {
      name,
      active,
    } = req.body;

    // Check if producttype name already exists
    const existingProductType = await ProductType.findOne({ where: { name } });
    if (existingProductType) {
      return res.status(400).json({
        success: false,
        message: 'ProductType name already exists'
      });
    }

    const created_at = new Date();

    const producttype = await ProductType.create({
      name,
      active: active !== undefined ? active : true,
      created_at
    });

    // Get the created producttype with product details

    const enrichedProductType = {
      id: producttype.id,
      name: producttype.name,
      active: producttype.active,
      created_at: producttype.created_at,
    };

    return res.status(201).json({
      success: true,
      message: 'ProductType created successfully',
      data: enrichedProductType
    });

  } catch (error) {
    console.error('Error during producttype creation:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Update producttype
router.put('/producttypes/:id', async (req, res) => {
  try {
    console.log('req.body:', req.body);

    const producttypeId = req.params.id;
    const {
      name,
      active,
    } = req.body;

    const producttype = await ProductType.findByPk(producttypeId);
    if (!producttype) {
      return res.status(404).json({
        success: false,
        message: 'ProductType not found'
      });
    }



    // Check if producttype name already exists (excluding current producttype)
    if (name && name !== producttype.name) {
      const existingProductType = await ProductType.findOne({
        where: { name }
      });
      if (existingProductType) {
        return res.status(400).json({
          success: false,
          message: 'ProductType name already exists'
        });
      }
    }

    const updated_at = new Date();

    await producttype.update({
      name: name || producttype.name,
      active: active !== undefined ? active : producttype.active,
      updated_at
    });

    // Get the updated combo with product details

    const enrichedProductType = {
      id: producttype.id,
      name: producttype.name,
      active: producttype.active,
      updated_at: producttype.updated_at,
    };

    return res.status(200).json({
      success: true,
      message: 'ProductType updated successfully',
      data: enrichedProductType
    });

  } catch (error) {
    console.error('Error during product type update:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Delete producttype
router.delete('/producttypes/:id', async (req, res) => {
  try {
    const producttypeId = req.params.id;

    const producttype = await ProductType.findByPk(producttypeId);
    if (!producttype) {
      return res.status(404).json({
        success: false,
        message: 'ProductType not found'
      });
    }

    await producttype.destroy();
    return res.status(200).json({
      success: true,
      message: 'ProductType deleted successfully'
    });

  } catch (error) {
    console.error('Error during product type deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});

// Bulk Delete Combos
router.post('/producttypes/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ProductType IDs are required'
      });
    }

    const result = await ProductType.destroy({
      where: {
        id: ids
      }
    });

    return res.status(200).json({
      success: true,
      message: `${result} product types deleted successfully`
    });

  } catch (error) {
    console.error('Error during bulk product type deletion:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});



// Get active sliders for frontend
router.get('/sliders/active', async (req, res) => {
  try {
    const sliders = await Slider.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      attributes: [
        'id',
        'title',
        'subtitle',
        'description',
        'image',
        'button_text',
        'button_url',
        'background_color',
        'text_color',
        'sort_order',
        'is_active',
        'display_on'
      ]
    });

    return res.status(200).json({
      message: 'Active sliders fetched successfully',
      data: sliders.map(mapSliderResponse),
      success: true
    });
  } catch (error) {
    console.error('Error during fetching active sliders:', error);
    return res.status(500).json({
      message: 'Server error, please try again later.',
      success: false,
      error: error.message
    });
  }
});









// Get popular products (featured products)




// Get products by category with filtering and pagination

// Get CMS page by slug
router.get('/cms/:slug', async (req, res) => {
  try {
    const page = await CMSPage.findOne({ where: { slug: req.params.slug, status: true } });
    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    res.json({ success: true, title: page.title, content: page.content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all products with filtering (for when no category is selected)

// Delete user account

// Password reset helpers and routes.
const getFrontendBaseUrl = (req) => {
  const configuredUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || req.get('origin') || 'http://localhost:4200';
  return configuredUrl.replace(/\/+$/, '');
};

const hashPasswordResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const passwordResetSuccessMessage = 'If this email exists, a reset link has been sent.';

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ success: true, message: passwordResetSuccessMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = hashPasswordResetToken(resetToken);
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.update({
      reset_password_token: hashedResetToken,
      reset_password_expires: resetExpiresAt
    });

    // Send email via Gmail SMTP
    const emailUser = (process.env.EMAIL_USER || '').trim();
    const emailPass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
    if (!emailUser || !emailPass) {
      throw new Error('Missing email configuration: EMAIL_USER and EMAIL_PASS are required');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const resetUrl = `${getFrontendBaseUrl(req)}/reset-password?token=${resetToken}`;
    const displayName = escapeHtml(user.name || 'there');

    const mailOptions = {
      from: `"Cavero Fragrances" <${emailUser}>`,
      to: email,
      subject: 'Reset your Cavero Fragrances password',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#FFF8E7;border:1px solid #E8D5A0;border-radius:16px;color:#8B6914;">
          <h2 style="margin:0 0 12px;color:#C9A84C;">Reset your password</h2>
          <p style="margin:0 0 16px;line-height:1.6;">Hi <strong>${displayName}</strong>,</p>
          <p style="margin:0 0 22px;line-height:1.6;">We received a request to reset your Cavero Fragrances account password. Use the button below to choose a new password.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:14px 26px;background:#C9A84C;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:bold;">Reset password</a>
          <p style="margin:22px 0 0;color:#A8873D;font-size:14px;line-height:1.6;">This link expires in 60 minutes. If the button does not work, copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#8B6914;font-size:13px;">${resetUrl}</p>
          <p style="margin-top:24px;color:#A8873D;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset link sent to ${email}`);

    return res.json({ success: true, message: passwordResetSuccessMessage });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    // Always return generic message — never reveal if email exists or if sending failed
    return res.json({ success: true, message: passwordResetSuccessMessage });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset token is required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const hashedResetToken = hashPasswordResetToken(token);
    const user = await User.findOne({
      where: {
        reset_password_token: hashedResetToken,
        reset_password_expires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired. Please request a new link.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await user.update({
      password: hashedPassword,
      basePass64: password,
      reset_password_token: null,
      reset_password_expires: null
    });

    return res.json({ success: true, message: 'Password updated successfully. Please sign in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password.', error: error.message });
  }
});

module.exports = router;



