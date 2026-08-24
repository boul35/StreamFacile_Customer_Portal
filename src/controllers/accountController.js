const { body, validationResult } = require("express-validator");
const { pool } = require("../config/db");
const auth = require("../services/auth");

async function getAccountData(customerId) {
  const customer = await auth.findById(customerId);

  const { rows: devices } = await pool.query(
    `SELECT id, device_name, device_type, platform, last_active_at, created_at
       FROM devices
      WHERE customer_id = $1
      ORDER BY last_active_at DESC NULLS LAST`,
    [customerId]
  );

  const { rows: counts } = await pool.query(
    `SELECT count(*)::int AS selected FROM customer_channels WHERE customer_id = $1`,
    [customerId]
  );

  return {
    customer,
    devices,
    selectedChannels: counts[0].selected,
    renewalDate: customer.renewal_date
  };
}

async function showAccount(req, res) {
  const data = await getAccountData(req.session.customerId);
  const notice =
    req.query.modifie ? "Votre profil a été mis à jour." :
    req.query.mdp ? "Votre mot de passe a été changé." : "";

  res.render("account", {
    title: "Mon compte — StreamFacile",
    customer: data.customer,
    devices: data.devices,
    selectedChannels: data.selectedChannels,
    notice: notice,
    errors: [],
    values: {}
  });
}

const profileValidators = [
  body("name").trim().notEmpty().withMessage("Le nom est requis.").isLength({ max: 120 }),
  body("email").isEmail().withMessage("Courriel invalide.").normalizeEmail(),
  body("phone").optional({ checkFalsy: true }).isLength({ max: 40 })
];

async function updateProfile(req, res) {
  const errors = validationResult(req);
  const data = await getAccountData(req.session.customerId);

  if (!errors.isEmpty()) {
    return res.status(400).render("account", {
      title: "Mon compte — StreamFacile",
      customer: data.customer,
      devices: data.devices,
      selectedChannels: data.selectedChannels,
      errors: errors.array(),
      values: req.body
    });
  }

  const { email } = req.body;
  const existing = await auth.findByEmail(email);
  if (existing && existing.id !== req.session.customerId) {
    return res.status(400).render("account", {
      title: "Mon compte — StreamFacile",
      customer: data.customer,
      devices: data.devices,
      selectedChannels: data.selectedChannels,
      errors: [{ msg: "Ce courriel est déjà utilisé par un autre compte." }],
      values: req.body
    });
  }

  await pool.query(
    `UPDATE customers SET name = $1, email = $2, phone = $3, updated_at = now()
      WHERE id = $4`,
    [req.body.name, email, req.body.phone || null, req.session.customerId]
  );

  req.session.customerName = req.body.name;
  res.redirect("/compte?modifie=1");
}

const passwordValidators = [
  body("currentPassword").notEmpty().withMessage("Mot de passe actuel requis."),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Le nouveau mot de passe doit contenir au moins 8 caractères.")
];

async function changePassword(req, res) {
  const errors = validationResult(req);
  const data = await getAccountData(req.session.customerId);

  if (!errors.isEmpty()) {
    return res.status(400).render("account", {
      title: "Mon compte — StreamFacile",
      customer: data.customer,
      devices: data.devices,
      selectedChannels: data.selectedChannels,
      errors: errors.array(),
      values: {}
    });
  }

  const customer = await auth.findById(req.session.customerId);
  const ok = await auth.verifyPassword(req.body.currentPassword, customer.password_hash);
  if (!ok) {
    return res.status(400).render("account", {
      title: "Mon compte — StreamFacile",
      customer: data.customer,
      devices: data.devices,
      selectedChannels: data.selectedChannels,
      errors: [{ msg: "Le mot de passe actuel est incorrect." }],
      values: {}
    });
  }

  const hash = await auth.hashPassword(req.body.newPassword);
  await pool.query(
    `UPDATE customers SET password_hash = $1, updated_at = now() WHERE id = $2`,
    [hash, req.session.customerId]
  );

  res.redirect("/compte?mdp=1");
}

module.exports = {
  showAccount,
  updateProfile,
  changePassword,
  profileValidators,
  passwordValidators
};
