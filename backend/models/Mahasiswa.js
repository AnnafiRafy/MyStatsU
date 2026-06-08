// models/Mahasiswa.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mahasiswa = sequelize.define('Mahasiswa', {
  mahasiswaID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  nama: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  nim: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  jurusan: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tanggalDaftar: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'mahasiswa',
  timestamps: false,
});

module.exports = Mahasiswa;
