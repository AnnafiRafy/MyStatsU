const { JamBelajar } = require("../models");

const canAccessUserResource = (authUser, targetUserId) =>
  authUser.role === "admin" || String(authUser.id) === String(targetUserId);

exports.create = async (req, res) => {
  try {
    if (req.user.role !== "mahasiswa") {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const { mata_kuliah, durasi, tanggal, catatan, aktivitas } = req.body;
    const cleanMataKuliah = String(mata_kuliah || "").trim();
    const cleanDurasi = Number.parseInt(durasi, 10);

    if (!cleanMataKuliah || !Number.isInteger(cleanDurasi) || cleanDurasi < 1 || !tanggal) {
      return res.status(400).json({
        success: false,
        message: "Lengkapi mata kuliah, durasi, dan tanggal belajar"
      });
    }

    const data = await JamBelajar.create({
      user_id: req.user.id,
      mata_kuliah: cleanMataKuliah,
      durasi: cleanDurasi,
      tanggal,
      catatan: catatan || aktivitas || null
    });

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("create jam belajar error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan data jam belajar"
    });
  }
};

exports.findByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!canAccessUserResource(req.user, userId)) {
      return res.status(403).json({ success: false, message: "Akses ditolak" });
    }

    const data = await JamBelajar.findAll({
      where: {
        user_id: userId
      }
    });

    return res.json(data);
  } catch (err) {
    console.error("get jam belajar error:", err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data jam belajar"
    });
  }
};
