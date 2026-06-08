// routes/badge.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Badge = require('../models/Badge');
const JamBelajar = require('../models/JamBelajar');
const Nilai = require('../models/Nilai');
const { Op } = require('sequelize');

// Daftar semua badge yang tersedia di sistem
const ALL_BADGES = [
  { namaBadge: 'Pemula Rajin', deskripsi: 'Belajar minimal 1 jam selama 3 hari berturut-turut', tipe: 'konsistensi' },
  { namaBadge: 'Konsisten Seminggu', deskripsi: 'Belajar setiap hari selama 7 hari berturut-turut', tipe: 'streak' },
  { namaBadge: 'Maratonist', deskripsi: 'Total 50 jam belajar tercatat', tipe: 'jam_belajar' },
  { namaBadge: 'Nilai Gemilang', deskripsi: 'Mendapatkan nilai ≥ 85 di semua mata kuliah', tipe: 'nilai' },
  { namaBadge: 'IPK Cumlaude', deskripsi: 'Rata-rata nilai mencapai IPK ≥ 3.75', tipe: 'nilai' },
  { namaBadge: 'Pejuang Belajar', deskripsi: 'Total 100 jam belajar tercatat', tipe: 'jam_belajar' },
  { namaBadge: 'Juara Semester', deskripsi: 'IPK semester ≥ 3.50', tipe: 'spesial' },
  { namaBadge: 'Super Konsisten', deskripsi: 'Belajar setiap hari selama 30 hari', tipe: 'streak' },
];

// GET /api/badge/:userId - ambil badge yang sudah diperoleh
router.get('/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && String(req.user.id) !== String(req.params.userId)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const earned = await Badge.findAll({
      where: { user_id: req.params.userId },
      order: [['tanggalDiperoleh', 'DESC']]
    });

    // Kembalikan semua badge + status earned
    const result = ALL_BADGES.map(b => ({
      ...b,
      earned: earned.some(e => e.namaBadge === b.namaBadge),
      tanggalDiperoleh: earned.find(e => e.namaBadge === b.namaBadge)?.tanggalDiperoleh || null
    }));

    res.json({ success: true, data: result, earnedCount: earned.length, totalCount: ALL_BADGES.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data badge' });
  }
});

// POST /api/badge/check - cek dan berikan badge yang layak
router.post('/check', auth, async (req, res) => {
  try {
    if (req.user.role !== 'mahasiswa') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const userId = req.user.id;
    const newBadges = [];

    // Ambil data existing badges
    const existing = await Badge.findAll({ where: { user_id: userId } });
    const earnedNames = existing.map(b => b.namaBadge);

    // Cek total jam belajar
    const allJam = await JamBelajar.findAll({ where: { user_id: userId } });
    const totalMenit = allJam.reduce((s, j) => s + (j.durasi || 0), 0);
    const totalJam = totalMenit / 60;

    // Badge: 50 jam
    if (totalJam >= 50 && !earnedNames.includes('Maratonist')) {
      await Badge.create({ user_id: userId, namaBadge: 'Maratonist', deskripsi: 'Total 50 jam belajar tercatat', tipe: 'jam_belajar', tanggalDiperoleh: new Date() });
      newBadges.push('Maratonist');
    }
    // Badge: 100 jam
    if (totalJam >= 100 && !earnedNames.includes('Pejuang Belajar')) {
      await Badge.create({ user_id: userId, namaBadge: 'Pejuang Belajar', deskripsi: 'Total 100 jam belajar tercatat', tipe: 'jam_belajar', tanggalDiperoleh: new Date() });
      newBadges.push('Pejuang Belajar');
    }

    // Cek streak belajar 3 hari
    if (!earnedNames.includes('Pemula Rajin') && allJam.length > 0) {
      const tanggalSet = new Set(allJam.map(j => j.tanggal));
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (tanggalSet.has(key)) streak++; else break;
      }
      if (streak >= 3) {
        await Badge.create({ user_id: userId, namaBadge: 'Pemula Rajin', deskripsi: 'Belajar minimal 1 jam selama 3 hari berturut-turut', tipe: 'konsistensi', tanggalDiperoleh: new Date() });
        newBadges.push('Pemula Rajin');
      }
    }

    // Cek nilai rata-rata
    const allNilai = await Nilai.findAll({ where: { user_id: userId } });
    if (allNilai.length > 0) {
      const rataRata = allNilai.reduce((s, n) => s + (n.nilai_angka || 0), 0) / allNilai.length;
      const ipkEq = (rataRata / 100) * 4;

      if (rataRata >= 85 && !earnedNames.includes('Nilai Gemilang') && allNilai.every(n => n.nilai_angka >= 85)) {
        await Badge.create({ user_id: userId, namaBadge: 'Nilai Gemilang', deskripsi: 'Mendapatkan nilai ≥ 85 di semua mata kuliah', tipe: 'nilai', tanggalDiperoleh: new Date() });
        newBadges.push('Nilai Gemilang');
      }
      if (ipkEq >= 3.75 && !earnedNames.includes('IPK Cumlaude')) {
        await Badge.create({ user_id: userId, namaBadge: 'IPK Cumlaude', deskripsi: 'Rata-rata nilai mencapai IPK ≥ 3.75', tipe: 'nilai', tanggalDiperoleh: new Date() });
        newBadges.push('IPK Cumlaude');
      }
    }

    res.json({ success: true, newBadges, message: newBadges.length > 0 ? `Selamat! Kamu mendapat ${newBadges.length} badge baru!` : 'Tidak ada badge baru saat ini' });
  } catch (err) {
    console.error('check badge error:', err);
    res.status(500).json({ success: false, message: 'Gagal cek badge' });
  }
});

module.exports = router;
