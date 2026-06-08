// routes/notifikasi.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notifikasi = require('../models/Notifikasi');

// GET /api/notifikasi/:userId
router.get('/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && String(req.user.id) !== String(req.params.userId)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const data = await Notifikasi.findAll({
      where: { user_id: req.params.userId },
      order: [['tanggalKirim', 'DESC']]
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil notifikasi' });
  }
});

// POST /api/notifikasi/kirim - kirim motivasi (admin atau system)
router.post('/kirim', auth, async (req, res) => {
  try {
    const { user_id, pesan, tipe } = req.body;

    // Admin bisa kirim ke siapa saja, mahasiswa hanya terima
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang bisa kirim notifikasi' });
    }

    const notif = await Notifikasi.create({
      user_id,
      pesan,
      tipe: tipe || 'motivasi',
      tanggalKirim: new Date(),
      dibaca: false
    });

    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengirim notifikasi' });
  }
});

// PUT /api/notifikasi/:notifID/baca - tandai sudah dibaca
router.put('/:notifID/baca', auth, async (req, res) => {
  try {
    const notif = await Notifikasi.findByPk(req.params.notifID);
    if (!notif) return res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan' });

    if (String(notif.user_id) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    await notif.update({ dibaca: true });
    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update notifikasi' });
  }
});

// PUT /api/notifikasi/:userId/baca-semua
router.put('/:userId/baca-semua', auth, async (req, res) => {
  try {
    if (String(req.user.id) !== String(req.params.userId) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    await Notifikasi.update({ dibaca: true }, { where: { user_id: req.params.userId } });
    res.json({ success: true, message: 'Semua notifikasi ditandai dibaca' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update notifikasi' });
  }
});

module.exports = router;
