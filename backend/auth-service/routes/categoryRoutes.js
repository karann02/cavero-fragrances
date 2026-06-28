const express = require("express");
const multer = require("multer");
const path = require("path");
const csv = require("csv-parser");
const fs = require("fs");
const { Op } = require("sequelize");
const Category = require("../models/category");
const Product = require("../models/product");
const { verifyToken, verifySuperuser } = require("../middleware/auth");
const router = express.Router();

const { makeUpload } = require("../config/cloudinary");

const uploadCsv = multer({ dest: "uploads/" }); // local temp — CSV is parsed then deleted
const uploadCategoryImage = makeUpload("categories"); // images → Cloudinary (req.file.path = URL)

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const optionalSeoText = (value) => {
  if (value === undefined) return undefined;
  const cleaned = String(value || "").trim();
  return cleaned || null;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return fallback;
};

// Get featured categories by sort_order with product counts
router.get("/featured", async (req, res) => {
  try {
    const featuredCategories = await Category.findAll({
      where: { 
        status: true,
        is_featured: true
      },
      order: [["sort_order", "ASC"], ["id", "ASC"]],
    });

    const categoriesWithCount = await Promise.all(
      featuredCategories.map(async (category) => {
        const productCount = await Product.count({
          where: {
            category_id: category.id,
            status: true
          }
        });
        
        return {
          ...category.toJSON(),
          product_count: productCount
        };
      })
    );

    return res.status(200).json({
      message: "Featured categories fetched successfully",
      data: categoriesWithCount,
      success: true,
    });
  } catch (error) {
    console.error('Featured categories error:', error);
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["sort_order", "ASC"], ["createdAt", "DESC"]],
    });
    return res.status(200).json({
      message: "Categories fetched successfully",
      data: categories,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// Get parent categories only
router.get("/parents", async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { parent_id: null },
      order: [["name", "ASC"]],
    });
    return res.status(200).json({
      message: "Parent categories fetched successfully",
      data: categories,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// Get categories for dropdown
router.get("/dropdown", async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["name", "ASC"]],
    });
    return res.status(200).json({
      message: "Categories fetched successfully",
      data: categories,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// Get single category
router.get("/:id", async (req, res) => {
  try {
    const categoryIdentifier = String(req.params.id || "").trim();
    const categoryLookup = /^\d+$/.test(categoryIdentifier)
      ? { [Op.or]: [{ id: Number(categoryIdentifier) }, { slug: categoryIdentifier }] }
      : { slug: slugify(categoryIdentifier) };
    const category = await Category.findOne({ where: categoryLookup });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    return res.status(200).json({
      message: "Category found successfully",
      data: category,
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// Add category
router.post("/", verifyToken, verifySuperuser, uploadCategoryImage.single("image"), async (req, res) => {
  try {
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
    } = req.body;

    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const parsedStatus = parseBoolean(status, true);
    const wantsFeatured = parseBoolean(is_featured, false);

    const normalizedSlug = slug && String(slug).trim() ? String(slug).trim() : slugify(trimmedName);
    let finalSlug = normalizedSlug || `category-${Date.now()}`;

    const existingCategoryBySlug = await Category.findOne({ where: { slug: finalSlug } });
    if (existingCategoryBySlug) {
      finalSlug = `${finalSlug}-${Date.now()}`;
    }

    const existingCategoryBySlugRetry = await Category.findOne({ where: { slug: finalSlug } });
    if (existingCategoryBySlugRetry) {
      return res.status(400).json({
        success: false,
        message: "Category slug already exists",
      });
    }

    const imagePath = req.file
      ? req.file.path
      : image_url || null;

    const finalIsFeatured = wantsFeatured && parsedStatus;
    const parsedSortOrder = sort_order ? parseInt(sort_order, 10) : 0;

    // Check for duplicate sort_order
    if (parsedSortOrder > 0) {
      const duplicateSortOrder = await Category.findOne({ where: { sort_order: parsedSortOrder } });
      if (duplicateSortOrder) {
        return res.status(400).json({
          success: false,
          message: `Sort order ${parsedSortOrder} already exists. Please choose a different sort order.`,
        });
      }
    }

    const category = await Category.create({
      name: trimmedName,
      slug: finalSlug,
      description: description || null,
      image_url: imagePath,
      status: parsedStatus,
      parent_id: parent_id ? parseInt(parent_id, 10) : null,
      is_featured: finalIsFeatured,
      sort_order: parsedSortOrder,
      meta_title: optionalSeoText(meta_title),
      meta_description: optionalSeoText(meta_description),
    });
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Category create error:", error);
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Category slug already exists",
      });
    }
    if (error?.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: error.errors?.[0]?.message || "Validation failed",
      });
    }
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// Update category
router.put("/:id", verifyToken, verifySuperuser, uploadCategoryImage.single("image"), async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
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
    } = req.body;

    const wantsFeatured = is_featured !== undefined ? is_featured === "true" || is_featured === true : category.is_featured;
    const nextStatus = status !== undefined ? status === "true" || status === true : category.status;
    const finalIsFeatured = wantsFeatured && nextStatus;
    const parsedSortOrder = sort_order !== undefined ? parseInt(sort_order, 10) : category.sort_order;

    // Check for duplicate sort_order (excluding current category)
    if (parsedSortOrder > 0 && parsedSortOrder !== category.sort_order) {
      const duplicateSortOrder = await Category.findOne({ where: { sort_order: parsedSortOrder } });
      if (duplicateSortOrder) {
        return res.status(400).json({
          success: false,
          message: `Sort order ${parsedSortOrder} already exists. Please choose a different sort order.`,
        });
      }
    }

    const updateData = {
      name: name || category.name,
      slug: slug || category.slug,
      description: description !== undefined ? description : category.description,
      status: nextStatus,
      parent_id:
        parent_id !== undefined && parent_id !== "" && parent_id !== null
          ? parseInt(parent_id, 10)
          : null,
      is_featured: finalIsFeatured,
      sort_order: parsedSortOrder,
      meta_title: meta_title !== undefined ? optionalSeoText(meta_title) : category.meta_title,
      meta_description: meta_description !== undefined ? optionalSeoText(meta_description) : category.meta_description,
    };

    if (req.file) {
      updateData.image_url = req.file.path;
    } else if (image_url !== undefined) {
      updateData.image_url = image_url || null;
    }

    await category.update(updateData);
    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// Bulk delete categories
router.post("/bulk-delete", verifyToken, verifySuperuser, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Category IDs are required" });
    }
    const result = await Category.destroy({ where: { id: ids } });
    return res.status(200).json({
      success: true,
      message: `${result} categories deleted successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// CSV Import
router.post("/import-csv", verifyToken, verifySuperuser, uploadCsv.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const results = [];
    const errors = [];
    const categoryMap = new Map();

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          // First pass: Create parent categories
          for (const row of results) {
            if (!row.parent_category) {
              try {
                const category = await Category.create({
                  name: row.name,
                  slug: row.slug,
                  description: row.description || null,
                  image_url: row.image_url || null,
                  status: row.status === "true" || row.status === "1",
                  is_featured: row.is_featured === "true" || row.is_featured === "1",
                  sort_order: parseInt(row.sort_order) || 0,
                  meta_title: row.meta_title || null,
                  meta_description: row.meta_description || null,
                });
                categoryMap.set(row.name, category.id);
              } catch (error) {
                errors.push({ row: row.name, error: error.message });
              }
            }
          }

          // Second pass: Create subcategories
          for (const row of results) {
            if (row.parent_category) {
              try {
                const parentId = categoryMap.get(row.parent_category);
                if (!parentId) {
                  const parent = await Category.findOne({ where: { name: row.parent_category } });
                  if (parent) {
                    categoryMap.set(row.parent_category, parent.id);
                  }
                }

                await Category.create({
                  name: row.name,
                  slug: row.slug,
                  description: row.description || null,
                  image_url: row.image_url || null,
                  status: row.status === "true" || row.status === "1",
                  parent_id: categoryMap.get(row.parent_category) || null,
                  is_featured: row.is_featured === "true" || row.is_featured === "1",
                  sort_order: parseInt(row.sort_order) || 0,
                  meta_title: row.meta_title || null,
                  meta_description: row.meta_description || null,
                });
              } catch (error) {
                errors.push({ row: row.name, error: error.message });
              }
            }
          }

          fs.unlinkSync(req.file.path);

          return res.status(200).json({
            success: true,
            message: `Imported ${results.length - errors.length} categories successfully`,
            errors: errors.length > 0 ? errors : undefined,
          });
        } catch (error) {
          fs.unlinkSync(req.file.path);
          return res.status(500).json({
            message: "Error processing CSV",
            success: false,
            error: error.message,
          });
        }
      });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
});

// Multer/file upload errors for this router
router.use((err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }
  if (err.message && err.message.toLowerCase().includes("image")) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  return res.status(500).json({
    success: false,
    message: "Server error",
    error: err.message,
  });
});

module.exports = router;
