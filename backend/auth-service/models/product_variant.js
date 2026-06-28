const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductVariant = sequelize.define('product_variant', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  sku: { type: DataTypes.STRING(100), allowNull: true },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
  compare_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  low_stock_threshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'product_variants',
});

// Set up associations — requires Product, which is already cached in Node module system
const Product = require('./product');
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = ProductVariant;
