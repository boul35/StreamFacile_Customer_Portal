const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/provisioningController");
const { requireAuth } = require("../middleware/auth");

router.get("/approvisionnement", requireAuth, ctrl.showProvisioning);
router.post("/approvisionnement/synchroniser", requireAuth, ctrl.triggerProvisioning);
router.get("/approvisionnement/travail/:id", requireAuth, ctrl.jobStatus);

module.exports = router;
