// models/Notifikasi.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notifikasi = sequelize.define('notifikasi', {
  notifID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'notifID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'mahasiswaID'
  },
  pesan: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipe: {
    type: DataTypes.ENUM('motivasi', 'peringatan', 'pencapaian', 'info'),
    defaultValue: 'motivasi'
  },
  tanggalKirim: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  dibaca: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'isRead'
  }
}, {
  tableName: 'notifikasi',
  freezeTableName: true,
  timestamps: false
});

module.exports = Notifikasi;
