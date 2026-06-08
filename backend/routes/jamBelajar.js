const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const JamBelajarController = require("../controllers/JamBelajarController");

router.post("/", auth, JamBelajarController.create);
router.get("/:userId", auth, JamBelajarController.findByUser);

module.exports = router;
