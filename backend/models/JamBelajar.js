const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const JamBelajar = sequelize.define("jam_belajar", {
  jamID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: "jamID"
  },
  user_id: {
    type: DataTypes.INTEGER,
    field: "mahasiswaID"
  },
  mata_kuliah: {
    type: DataTypes.STRING,
    field: "mataKuliah"
  },
  tanggal: DataTypes.DATEONLY,
  durasi: DataTypes.INTEGER,
  catatan: DataTypes.TEXT
}, {
  tableName: "jam_belajar",
  freezeTableName: true,
  timestamps: false
});

module.exports = JamBelajar;
