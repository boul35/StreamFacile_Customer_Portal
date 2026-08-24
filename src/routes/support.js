const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/supportController");
const { requireAuth } = require("../middleware/auth");

router.get("/support", requireAuth, ctrl.showSupport);
router.post("/support/creer", requireAuth, ctrl.ticketValidators, ctrl.createTicket);
router.get("/support/tickets", requireAuth, ctrl.listTickets);

module.exports = router;
