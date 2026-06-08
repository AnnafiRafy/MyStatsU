// routes/insight.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const JamBelajar = require('../models/JamBelajar');
const Insight = require('../models/Insight');
const { Op } = require('sequelize');

const parseAnalisis = (value) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const formatInsight = (insight) => {
  const item = insight.toJSON ? insight.toJSON() : insight;
  const analisis = parseAnalisis(item.analisis);

  return {
    ...item,
    totalJamBelajar: analisis.totalJamBelajar || 0,
    rataRataHarian: analisis.rataRataHarian || 0
  };
};

// GET /api/insight/:userId - ambil semua insight mahasiswa
router.get('/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && String(req.user.id) !== String(req.params.userId)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const data = await Insight.findAll({
      where: { user_id: req.params.userId },
      order: [['tanggalGenerate', 'DESC']]
    });

    res.json({ success: true, data: data.map(formatInsight) });
  } catch (err) {
    console.error('get insight error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data insight' });
  }
});

// POST /api/insight/generate - generate insight mingguan otomatis dari data jam belajar
router.post('/generate', auth, async (req, res) => {
  try {
    if (req.user.role !== 'mahasiswa') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const userId = req.user.id;

    // Ambil 7 hari terakhir
    const tujuhHariLalu = new Date();
    tujuhHariLalu.setDate(tujuhHariLalu.getDate() - 7);

    const jamData = await JamBelajar.findAll({
      where: {
        user_id: userId,
        tanggal: { [Op.gte]: tujuhHariLalu }
      }
    });

    const totalJam = jamData.reduce((sum, j) => sum + (j.durasi || 0), 0) / 60;
    const rataRata = jamData.length > 0 ? totalJam / 7 : 0;

    // Generate rekomendasi berdasarkan data
    let rekomendasi = '';
    if (totalJam === 0) {
      rekomendasi = 'Kamu belum mencatat jam belajar minggu ini. Mulai catat aktivitas belajarmu agar bisa mendapatkan insight yang lebih akurat!';
    } else if (totalJam < 10) {
      rekomendasi = `Total ${totalJam.toFixed(1)} jam belajar minggu ini (rata-rata ${rataRata.toFixed(1)} jam/hari). Tingkatkan durasi belajarmu minimal 2 jam per hari untuk hasil optimal.`;
    } else if (totalJam < 20) {
      rekomendasi = `Bagus! ${totalJam.toFixed(1)} jam belajar minggu ini (${rataRata.toFixed(1)} jam/hari). Pertahankan konsistensi dan coba tingkatkan sedikit lagi untuk performa maksimal.`;
    } else {
      rekomendasi = `Luar biasa! ${totalJam.toFixed(1)} jam belajar minggu ini (${rataRata.toFixed(1)} jam/hari). Kamu sangat konsisten! Pastikan kamu juga cukup istirahat agar konsentrasi tetap optimal.`;
    }

    // Cek apakah sudah ada insight minggu ini
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const periodeLabel = `Minggu ${startOfWeek.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    const existing = await Insight.findOne({
      where: { user_id: userId, periode: periodeLabel }
    });

    let insight;
    if (existing) {
      await existing.update({
        rekomendasi,
        analisis: JSON.stringify({ totalJamBelajar: totalJam, rataRataHarian: rataRata }),
        tanggalGenerate: new Date()
      });
      insight = existing;
    } else {
      insight = await Insight.create({
        user_id: userId,
        periode: periodeLabel,
        rekomendasi,
        analisis: JSON.stringify({ totalJamBelajar: totalJam, rataRataHarian: rataRata }),
        tanggalGenerate: new Date()
      });
    }

    res.json({ success: true, data: formatInsight(insight) });
  } catch (err) {
    console.error('generate insight error:', err);
    res.status(500).json({ success: false, message: 'Gagal generate insight' });
  }
});

module.exports = router;
