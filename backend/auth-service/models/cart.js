


const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
 const Cart = sequelize.define('cart', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    variant_id: { type: DataTypes.INTEGER, allowNull: true },
    selected_size: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: 'cart',
  });
module.exports = Cart;


