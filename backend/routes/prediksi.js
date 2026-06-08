// routes/prediksi.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Prediksi = require('../models/Prediksi');
const Nilai = require('../models/Nilai');
const JamBelajar = require('../models/JamBelajar');

const formatPrediksi = (prediksi) => {
  const item = prediksi.toJSON ? prediksi.toJSON() : prediksi;
  const ipkPrediksi = Number(item.akurasi || 0);

  return {
    ...item,
    hasilPrediksi: `Prediksi IPK akhir semester kamu adalah ${ipkPrediksi.toFixed(2)} (${item.hasilPrediksi}).`,
    ipkPrediksi,
    semester: null,
    tanggalHitung: item.tanggalPrediksi
  };
};

// GET /api/prediksi/:userId
router.get('/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && String(req.user.id) !== String(req.params.userId)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const data = await Prediksi.findAll({
      where: { user_id: req.params.userId },
      order: [['tanggalPrediksi', 'DESC']]
    });

    res.json({ success: true, data: data.map(formatPrediksi) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data prediksi' });
  }
});

// POST /api/prediksi/hitung - hitung prediksi performa akhir semester
router.post('/hitung', auth, async (req, res) => {
  try {
    if (req.user.role !== 'mahasiswa') {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }

    const userId = req.user.id;
    const { semester } = req.body;

    // Ambil data nilai
    const nilaiQuery = semester ? { user_id: userId, semester } : { user_id: userId };
    const allNilai = await Nilai.findAll({ where: nilaiQuery });

    if (allNilai.length === 0) {
      return res.status(400).json({ success: false, message: 'Belum ada data nilai yang bisa diprediksi' });
    }

    // Hitung IPK sementara
    let totalBobot = 0, totalSks = 0;
    const gradePoints = { 'A': 4.0, 'AB': 3.5, 'B': 3.0, 'BC': 2.5, 'C': 2.0, 'D': 1.0, 'E': 0 };

    allNilai.forEach(n => {
      const nilai = n.nilai_angka;
      let grade = 'E';
      if (nilai >= 85) grade = 'A';
      else if (nilai >= 80) grade = 'AB';
      else if (nilai >= 75) grade = 'B';
      else if (nilai >= 70) grade = 'BC';
      else if (nilai >= 60) grade = 'C';
      else if (nilai >= 50) grade = 'D';

      const sks = n.sks || 3;
      totalBobot += gradePoints[grade] * sks;
      totalSks += sks;
    });

    const ipkSementara = totalSks > 0 ? totalBobot / totalSks : 0;
    const nilaiRataRata = allNilai.reduce((s, n) => s + (n.nilai_angka || 0), 0) / allNilai.length;

    // Faktor jam belajar minggu terakhir
    const sebulanLalu = new Date(); sebulanLalu.setDate(sebulanLalu.getDate() - 30);
    const jamBulanIni = await JamBelajar.findAll({ where: { user_id: userId } });
    const totalJamBulanIni = jamBulanIni.reduce((s, j) => s + (j.durasi || 0), 0) / 60;

    // Prediksi sederhana berbasis tren
    let multiplier = 1.0;
    if (totalJamBulanIni >= 40) multiplier = 1.05;
    else if (totalJamBulanIni >= 20) multiplier = 1.02;
    else if (totalJamBulanIni < 5) multiplier = 0.97;

    const ipkPrediksi = Math.min(4.0, ipkSementara * multiplier);

    // Generate deskripsi prediksi
    let hasilPrediksi = '';
    let prediksiKategori = '';
    if (ipkPrediksi >= 3.75) { prediksiKategori = 'Cumlaude'; }
    else if (ipkPrediksi >= 3.50) { prediksiKategori = 'Sangat Memuaskan'; }
    else if (ipkPrediksi >= 3.00) { prediksiKategori = 'Memuaskan'; }
    else if (ipkPrediksi >= 2.50) { prediksiKategori = 'Cukup Baik'; }
    else { prediksiKategori = 'Perlu Peningkatan'; }

    hasilPrediksi = `Berdasarkan ${allNilai.length} mata kuliah dengan rata-rata nilai ${nilaiRataRata.toFixed(1)} dan ${totalJamBulanIni.toFixed(0)} jam belajar tercatat, prediksi IPK akhir semester kamu adalah ${ipkPrediksi.toFixed(2)} (${prediksiKategori}). `;

    if (ipkPrediksi < 3.0) {
      hasilPrediksi += 'Tingkatkan intensitas belajar dan fokus pada mata kuliah dengan nilai terendah untuk meningkatkan performa.';
    } else if (ipkPrediksi < 3.5) {
      hasilPrediksi += 'Pertahankan konsistensi belajar untuk menjaga atau meningkatkan performa saat ini.';
    } else {
      hasilPrediksi += 'Performa akademik kamu sangat baik! Pertahankan pola belajar yang sudah bagus ini.';
    }

    // Simpan prediksi
    const prediksi = await Prediksi.create({
      user_id: userId,
      nilaiRataRata,
      hasilPrediksi: prediksiKategori,
      tanggalPrediksi: new Date(),
      akurasi: ipkPrediksi,
      metodePrediksi: 'tren_jam_belajar'
    });

    res.json({ success: true, data: formatPrediksi(prediksi), ipkSementara, ipkPrediksi, prediksiKategori });
  } catch (err) {
    console.error('hitung prediksi error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghitung prediksi' });
  }
});

module.exports = router;
