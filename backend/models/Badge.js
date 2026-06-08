// models/Badge.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Badge = sequelize.define('badge', {
  badgeID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'badgeID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'mahasiswaID'
  },
  namaBadge: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  deskripsi: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tipe: {
    type: DataTypes.ENUM('konsistensi', 'nilai', 'jam_belajar', 'streak', 'spesial'),
    defaultValue: 'konsistensi'
  },
  tanggalDiperoleh: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'badge',
  freezeTableName: true,
  timestamps: false
});

module.exports = Badge;
