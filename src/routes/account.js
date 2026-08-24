const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/accountController");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/compte", requireAuth, asyncHandler(ctrl.showAccount));
router.post("/compte/profil", requireAuth, ctrl.profileValidators, asyncHandler(ctrl.updateProfile));
router.post("/compte/mot-de-passe", requireAuth, ctrl.passwordValidators, asyncHandler(ctrl.changePassword));

module.exports = router;