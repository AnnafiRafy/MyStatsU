const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const nilaiRoutes = require("./nilai");
const jamBelajarRoutes = require("./jamBelajar");
const prediksiRoutes = require("./prediksi");
const insightRoutes = require("./insight");
const badgeRoutes = require("./badge");
const notifikasiRoutes = require("./notifikasi");
const adminRoutes = require("./admin");

router.use("/auth", authRoutes);
router.use("/nilai", nilaiRoutes);
router.use("/jam", jamBelajarRoutes);
router.use("/prediksi", prediksiRoutes);
router.use("/insight", insightRoutes);
router.use("/badge", badgeRoutes);
router.use("/notifikasi", notifikasiRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
