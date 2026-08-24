const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/channelController");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/chaines", requireAuth, asyncHandler(ctrl.showCatalog));
router.post("/chaines/basculer", requireAuth, ctrl.toggleValidators, asyncHandler(ctrl.toggleChannel));

module.exports = router;