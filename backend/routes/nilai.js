const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const NilaiController = require("../controllers/NilaiController");

router.post("/", auth, NilaiController.create);
router.get("/:userId", auth, NilaiController.findByUser);
router.put("/:nilaiId", auth, NilaiController.update);
router.delete("/:nilaiId", auth, NilaiController.remove);

module.exports = router;
