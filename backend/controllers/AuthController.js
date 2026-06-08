// controllers/AuthController.js
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { Mahasiswa, Admin } = require('../models');
const { JWT_EXPIRES, ensureJwtSecret } = require('../config/jwt');

const signToken = (payload) =>
  jwt.sign(payload, ensureJwtSecret(), { expiresIn: JWT_EXPIRES });

// ── POST /api/auth/register ────────────────────────────────────────────────────
exports.registerMahasiswa = async (req, res) => {
  try {
    const { nama, email, password, nim, jurusan } = req.body;

    if (!nama || !email || !password || !nim) {
      return res.status(400).json({ success: false, message: 'Nama, email, password, dan NIM wajib diisi' });
    }

    const emailExist = await Mahasiswa.findOne({ where: { email } });
    if (emailExist) {
      return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const nimExist = await Mahasiswa.findOne({ where: { nim } });
    if (nimExist) {
      return res.status(409).json({ success: false, message: 'NIM sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const mahasiswa = await Mahasiswa.create({
      nama,
      email,
      password: hashedPassword,
      nim,
      jurusan: jurusan || null,
      tanggalDaftar: new Date(),
      isVerified: true, // set true agar bisa langsung login (demo)
    });

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Silakan login.',
      data: {
        mahasiswaID: mahasiswa.mahasiswaID,
        nama: mahasiswa.nama,
        email: mahasiswa.email,
        nim: mahasiswa.nim,
      },
    });
  } catch (err) {
    console.error('registerMahasiswa error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── POST /api/auth/login ───────────────────────────────────────────────────────
exports.loginMahasiswa = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const mahasiswa = await Mahasiswa.findOne({ where: { email } });
    if (!mahasiswa) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, mahasiswa.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    if (!mahasiswa.isVerified) {
      return res.status(403).json({ success: false, message: 'Akun belum diverifikasi oleh admin' });
    }

    const token = signToken({
      id: mahasiswa.mahasiswaID,
      email: mahasiswa.email,
      role: 'mahasiswa',
    });

    return res.status(200).json({
      success: true,
      message: 'Login berhasil',
      token,
      data: {
        mahasiswaID: mahasiswa.mahasiswaID,
        nama: mahasiswa.nama,
        email: mahasiswa.email,
        nim: mahasiswa.nim,
        jurusan: mahasiswa.jurusan,
        role: 'mahasiswa',
      },
    });
  } catch (err) {
    console.error('loginMahasiswa error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── POST /api/auth/admin/login ─────────────────────────────────────────────────
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const token = signToken({
      id: admin.adminID,
      email: admin.email,
      role: 'admin',
    });

    return res.status(200).json({
      success: true,
      message: 'Login admin berhasil',
      token,
      data: {
        adminID: admin.adminID,
        nama: admin.nama,
        email: admin.email,
        role: 'admin',
      },
    });
  } catch (err) {
    console.error('loginAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── GET /api/auth/me  (protected) ─────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === 'mahasiswa') {
      const mhs = await Mahasiswa.findByPk(id, {
        attributes: { exclude: ['password'] },
      });
      return res.json({ success: true, data: mhs });
    }

    if (role === 'admin') {
      const adm = await Admin.findByPk(id, {
        attributes: { exclude: ['password'] },
      });
      return res.json({ success: true, data: adm });
    }

    return res.status(400).json({ success: false, message: 'Role tidak dikenali' });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};
