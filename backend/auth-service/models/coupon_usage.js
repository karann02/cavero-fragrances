const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CouponUsage = sequelize.define(
  'coupon_usage',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    coupon_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    order_id: { type: DataTypes.INTEGER, allowNull: true },
    applied_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    redeemed_at: { type: DataTypes.DATE, allowNull: true }
  },
  {
    tableName: 'coupon_usages',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['coupon_id', 'user_id']
      }
    ]
  }
);

module.exports = CouponUsage;
