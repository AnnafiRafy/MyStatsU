const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

function gradeFromNilai(nilai) {
  const angka = Number(nilai);
  if (angka >= 85) return "A";
  if (angka >= 80) return "AB";
  if (angka >= 75) return "B";
  if (angka >= 70) return "BC";
  if (angka >= 60) return "C";
  if (angka >= 50) return "D";
  return "E";
}

const Nilai = sequelize.define("nilai", {
  nilaiID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: "nilaiID"
  },
  user_id: {
    type: DataTypes.INTEGER,
    field: "mahasiswaID"
  },
  mata_kuliah: {
    type: DataTypes.STRING,
    field: "mataKuliah"
  },
  kelas: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  nilai_angka: {
    type: DataTypes.FLOAT,
    field: "nilai"
  },
  semester: {
    type: DataTypes.STRING(20)
  },
  sks: DataTypes.INTEGER,
  tanggalInput: DataTypes.DATEONLY,
  grade: {
    type: DataTypes.VIRTUAL,
    get() {
      return gradeFromNilai(this.getDataValue("nilai_angka"));
    }
  }
}, {
  tableName: "nilai",
  freezeTableName: true,
  timestamps: false
});

module.exports = Nilai;
