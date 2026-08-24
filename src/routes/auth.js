const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const ctrl = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives. Réessayez dans quelques minutes." }
});

router.get("/connexion", asyncHandler(ctrl.showLogin));
router.post("/connexion", authLimiter, ctrl.loginValidators, asyncHandler(ctrl.login));
router.get("/inscription", asyncHandler(ctrl.showRegister));
router.post("/inscription", authLimiter, ctrl.registerValidators, asyncHandler(ctrl.register));
router.get("/deconnexion", requireAuth, asyncHandler(ctrl.logout));

module.exports = router;
