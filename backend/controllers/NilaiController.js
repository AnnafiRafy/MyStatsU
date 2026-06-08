const { Nilai } = require("../models");

const canAccessUserResource = (authUser, targetUserId) =>
  authUser.role === "admin" || String(authUser.id) === String(targetUserId);

exports.create = async (req, res) => {
  try {
    if (req.user.role !== "mahasiswa") {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const { mata_kuliah, kelas, sks, nilai_angka, semester, tanggalInput } = req.body;
    const cleanMataKuliah = String(mata_kuliah || "").trim();
    const cleanKelas = String(kelas || "").trim();
    const cleanSemester = String(semester || "").trim();
    const cleanSks = Number.parseInt(String(sks ?? "").trim(), 10);
    const rawNilai = String(nilai_angka ?? "").trim();
    const cleanNilai = Number(rawNilai);

    if (
      !cleanMataKuliah ||
      !cleanKelas ||
      !cleanSemester ||
      !Number.isInteger(cleanSks) ||
      cleanSks < 1 ||
      !rawNilai ||
      Number.isNaN(cleanNilai) ||
      cleanNilai < 0 ||
      cleanNilai > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Lengkapi mata kuliah, kelas, semester, SKS, dan nilai angka 0-100"
      });
    }

    const data = await Nilai.create({
      user_id: req.user.id,
      mata_kuliah: cleanMataKuliah,
      kelas: cleanKelas,
      sks: cleanSks,
      nilai_angka: cleanNilai,
      semester: cleanSemester,
      tanggalInput: tanggalInput || new Date()
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("create nilai error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan data nilai"
    });
  }
};

exports.findByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!canAccessUserResource(req.user, userId)) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const data = await Nilai.findAll({
      where: {
        user_id: userId
      }
    });

    return res.json(data);
  } catch (err) {
    console.error("get nilai error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data nilai"
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { nilaiId } = req.params;
    const nilai = await Nilai.findByPk(nilaiId);

    if (!nilai) {
      return res.status(404).json({ success: false, message: "Data nilai tidak ditemukan" });
    }

    if (!canAccessUserResource(req.user, nilai.user_id)) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const { mata_kuliah, kelas, sks, nilai_angka, semester, tanggalInput } = req.body;
    const cleanMataKuliah = String(mata_kuliah || "").trim();
    const cleanKelas = String(kelas || "").trim();
    const cleanSemester = String(semester || "").trim();
    const cleanSks = Number.parseInt(String(sks ?? "").trim(), 10);
    const rawNilai = String(nilai_angka ?? "").trim();
    const cleanNilai = Number(rawNilai);

    if (
      !cleanMataKuliah ||
      !cleanKelas ||
      !cleanSemester ||
      !Number.isInteger(cleanSks) ||
      cleanSks < 1 ||
      !rawNilai ||
      Number.isNaN(cleanNilai) ||
      cleanNilai < 0 ||
      cleanNilai > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Lengkapi mata kuliah, kelas, semester, SKS, dan nilai angka 0-100"
      });
    }

    await nilai.update({
      mata_kuliah: cleanMataKuliah,
      kelas: cleanKelas,
      sks: cleanSks,
      nilai_angka: cleanNilai,
      semester: cleanSemester,
      tanggalInput: tanggalInput || nilai.tanggalInput || new Date()
    });

    return res.json({ success: true, data: nilai });
  } catch (err) {
    console.error("update nilai error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengubah data nilai"
    });
  }
};

exports.remove = async (req, res) => {
  try {
    const { nilaiId } = req.params;
    const nilai = await Nilai.findByPk(nilaiId);

    if (!nilai) {
      return res.status(404).json({ success: false, message: "Data nilai tidak ditemukan" });
    }

    if (!canAccessUserResource(req.user, nilai.user_id)) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    await nilai.destroy();
    return res.json({ success: true, message: "Data nilai berhasil dihapus" });
  } catch (err) {
    console.error("delete nilai error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus data nilai"
    });
  }
};
