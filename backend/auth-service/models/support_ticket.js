const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SupportTicket = sequelize.define('SupportTicket', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('open', 'in_progress', 'resolved'), defaultValue: 'open' }
}, {
  tableName: 'support_tickets',
  timestamps: true
});

module.exports = SupportTicket;
