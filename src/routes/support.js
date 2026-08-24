const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/supportController");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/support", requireAuth, asyncHandler(ctrl.showSupport));
router.post("/support/creer", requireAuth, ctrl.ticketValidators, asyncHandler(ctrl.createTicket));
router.get("/support/tickets", requireAuth, asyncHandler(ctrl.listTickets));

module.exports = router;