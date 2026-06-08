// routes/admin.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Mahasiswa, Nilai, JamBelajar, Notifikasi } = require('../models');

// Middleware: hanya admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengakses ini' });
  }
  next();
};

// GET /api/admin/mahasiswa - list semua mahasiswa
router.get('/mahasiswa', auth, adminOnly, async (req, res) => {
  try {
    const data = await Mahasiswa.findAll({
      attributes: ['mahasiswaID', 'nama', 'email', 'nim', 'jurusan', 'tanggalDaftar', 'isVerified'],
      order: [['tanggalDaftar', 'DESC']]
    });
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data mahasiswa' });
  }
});

// PUT /api/admin/mahasiswa/:id/verifikasi - verifikasi akun mahasiswa
router.put('/mahasiswa/:id/verifikasi', auth, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // true/false

    const mahasiswa = await Mahasiswa.findByPk(id);
    if (!mahasiswa) return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });

    await mahasiswa.update({ isVerified: status !== undefined ? status : true });

    // Kirim notifikasi ke mahasiswa
    const pesanNotif = status === false
      ? 'Akun kamu telah dinonaktifkan oleh admin. Hubungi admin untuk informasi lebih lanjut.'
      : 'Akun kamu telah diverifikasi oleh admin. Selamat belajar! 🎉';

    await Notifikasi.create({
      user_id: id,
      pesan: pesanNotif,
      tipe: 'info',
      tanggalKirim: new Date(),
      dibaca: false
    });

    res.json({ success: true, message: `Mahasiswa berhasil ${status === false ? 'dinonaktifkan' : 'diverifikasi'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update verifikasi' });
  }
});

// DELETE /api/admin/mahasiswa/:id - hapus akun mahasiswa
router.delete('/mahasiswa/:id', auth, adminOnly, async (req, res) => {
  try {
    const mahasiswa = await Mahasiswa.findByPk(req.params.id);
    if (!mahasiswa) return res.status(404).json({ success: false, message: 'Mahasiswa tidak ditemukan' });

    await mahasiswa.destroy();
    res.json({ success: true, message: 'Akun mahasiswa berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus mahasiswa' });
  }
});

// POST /api/admin/notifikasi/broadcast - kirim notifikasi ke semua mahasiswa
router.post('/notifikasi/broadcast', auth, adminOnly, async (req, res) => {
  try {
    const { pesan, tipe } = req.body;
    if (!pesan) return res.status(400).json({ success: false, message: 'Pesan wajib diisi' });

    const semuaMahasiswa = await Mahasiswa.findAll({ attributes: ['mahasiswaID'] });

    const notifData = semuaMahasiswa.map(m => ({
      user_id: m.mahasiswaID,
      pesan,
      tipe: tipe || 'motivasi',
      tanggalKirim: new Date(),
      dibaca: false
    }));

    await Notifikasi.bulkCreate(notifData);
    res.json({ success: true, message: `Notifikasi dikirim ke ${semuaMahasiswa.length} mahasiswa` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal broadcast notifikasi' });
  }
});

// GET /api/admin/stats - statistik ringkasan untuk admin
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalMahasiswa = await Mahasiswa.count();
    const terverifikasi = await Mahasiswa.count({ where: { isVerified: true } });
    const belumVerifikasi = totalMahasiswa - terverifikasi;
    const totalNilai = await Nilai.count();
    const totalJamBelajar = await JamBelajar.count();

    res.json({
      success: true,
      data: { totalMahasiswa, terverifikasi, belumVerifikasi, totalNilai, totalJamBelajar }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik' });
  }
});

module.exports = router;
