const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

router.get("/connexion", ctrl.showLogin);
router.post("/connexion", ctrl.loginValidators, ctrl.login);
router.get("/inscription", ctrl.showRegister);
router.post("/inscription", ctrl.registerValidators, ctrl.register);
router.get("/deconnexion", requireAuth, ctrl.logout);

module.exports = router;
