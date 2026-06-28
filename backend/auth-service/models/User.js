// User.js - Updated
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Role = require("./role");

const User = sequelize.define("users", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  basePass64: { type: DataTypes.STRING, allowNull: true, defaultValue: '' },
  user_role_id: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: "user" },
  profile_image: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.STRING, allowNull: true }, 
  otp: { type: DataTypes.STRING, allowNull: true },
  user_type: { type: DataTypes.STRING, allowNull: false, defaultValue: "customer" },
  google_id: { type: DataTypes.STRING, allowNull: true, unique: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
  otp_expiry: { type: DataTypes.DATE, allowNull: true },
  reset_password_token: { type: DataTypes.STRING, allowNull: true },
  reset_password_expires: { type: DataTypes.DATE, allowNull: true },
  referral_code: { type: DataTypes.STRING(20), allowNull: true, unique: true }
}, { 
  timestamps: true 
});

User.belongsTo(Role, { foreignKey: 'user_role_id' });

module.exports = User;
