// models/Prediksi.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Prediksi = sequelize.define('prediksi', {
  prediksiID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'prediksiID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'mahasiswaID'
  },
  nilaiRataRata: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  hasilPrediksi: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tanggalPrediksi: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  akurasi: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  metodePrediksi: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'tren_jam_belajar'
  }
}, {
  tableName: 'prediksi',
  freezeTableName: true,
  timestamps: false
});

module.exports = Prediksi;
