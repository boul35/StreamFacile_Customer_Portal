const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, ctrl.showDashboard);

module.exports = router;
