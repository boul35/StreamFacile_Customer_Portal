const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/channelController");
const { requireAuth } = require("../middleware/auth");

router.get("/chaines", requireAuth, ctrl.showCatalog);
router.post("/chaines/basculer", requireAuth, ctrl.toggleValidators, ctrl.toggleChannel);

module.exports = router;
