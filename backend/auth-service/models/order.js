

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require('./User');
const Order = sequelize.define('order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING, unique: true, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  shipping_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  final_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  order_status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'return_requested'),
    defaultValue: 'pending'
  },
  payment_method: { type: DataTypes.STRING, allowNull: false },
  razorpay_order_id: { type: DataTypes.STRING, allowNull: true },
  razorpay_payment_id: { type: DataTypes.STRING, allowNull: true },
  shipping_address: { type: DataTypes.JSON, allowNull: false },
  billing_address: { type: DataTypes.JSON, allowNull: false },

  coupon_id: { type: DataTypes.INTEGER, allowNull: true },
  tracking_number: { type: DataTypes.STRING, allowNull: true },
  shipping_method: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  tax_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
}, {
  tableName: 'orders',
  timestamps: true

});

const OrderItem = require('./order_item');
Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
User.hasMany(Order, { foreignKey: 'user_id', as: 'Orders' });

module.exports = Order;
