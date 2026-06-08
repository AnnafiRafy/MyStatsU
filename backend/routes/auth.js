const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const AuthController = require("../controllers/AuthController");

router.post("/register", AuthController.registerMahasiswa);
router.post("/login", AuthController.loginMahasiswa);
router.post("/admin/login", AuthController.loginAdmin);
router.get("/me", auth, AuthController.getMe);

module.exports = router;
