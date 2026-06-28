const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InfluencerReel = sequelize.define('InfluencerReel', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  reel_url: { type: DataTypes.STRING, allowNull: false },
  thumbnail_url: { type: DataTypes.STRING, allowNull: true },
  product_image: { type: DataTypes.STRING, allowNull: true },
  product_name: { type: DataTypes.STRING, allowNull: true },
  product_price: { type: DataTypes.STRING, allowNull: true },
  product_original_price: { type: DataTypes.STRING, allowNull: true },
  product_description: { type: DataTypes.TEXT, allowNull: true },
  instagram_url: { type: DataTypes.STRING, allowNull: true },
  product_detail_url: { type: DataTypes.STRING, allowNull: true },
  discount_text: { type: DataTypes.STRING, allowNull: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'influencer_reels',
  timestamps: true
});

module.exports = InfluencerReel;
