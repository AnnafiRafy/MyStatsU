// models/Insight.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Insight = sequelize.define('insight', {
  insightID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'insightID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'mahasiswaID'
  },
  periode: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  rekomendasi: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  analisis: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tanggalGenerate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'insight',
  freezeTableName: true,
  timestamps: false
});

module.exports = Insight;
