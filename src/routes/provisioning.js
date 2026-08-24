const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/provisioningController");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/approvisionnement", requireAuth, asyncHandler(ctrl.showProvisioning));
router.post("/approvisionnement/synchroniser", requireAuth, asyncHandler(ctrl.triggerProvisioning));
router.get("/approvisionnement/travail/:id", requireAuth, asyncHandler(ctrl.jobStatus));

module.exports = router;