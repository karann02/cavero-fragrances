// models/combo.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Combo = sequelize.define('combo', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    valid_from: { type: DataTypes.DATEONLY, allowNull: true },
    valid_to: { type: DataTypes.DATEONLY, allowNull: true },
    product_ids: { 
        type: DataTypes.JSONB, 
        allowNull: false, 
        defaultValue: [],
        validate: {
            isValidProductIds(value) {
                if (!Array.isArray(value)) {
                    throw new Error('product_ids must be an array');
                }
                value.forEach(item => {
                    if (!item || !item.product_id) {
                        throw new Error('Each slot must include product_id');
                    }
                });
            }
        }
    },
    combo_size: { 
        type: DataTypes.DECIMAL(10,2), 
        allowNull: false, 
        defaultValue: 0.00,
        validate: {
            min: 0
        }
    },
    discount_price: { 
        type: DataTypes.DECIMAL(10,2), 
        allowNull: false, 
        defaultValue: 0.00,
        validate: {
            min: 0
        }
    },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    image: { type: DataTypes.STRING(500), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'combos',
    timestamps: true,
});

module.exports = Combo;
