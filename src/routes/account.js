const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/accountController");
const { requireAuth } = require("../middleware/auth");

router.get("/compte", requireAuth, ctrl.showAccount);
router.post("/compte/profil", requireAuth, ctrl.profileValidators, ctrl.updateProfile);
router.post("/compte/mot-de-passe", requireAuth, ctrl.passwordValidators, ctrl.changePassword);

module.exports = router;
