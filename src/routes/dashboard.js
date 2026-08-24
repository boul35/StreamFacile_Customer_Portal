const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/", requireAuth, asyncHandler(ctrl.showDashboard));

module.exports = router;