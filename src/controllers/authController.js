const { body, validationResult } = require("express-validator");
const auth = require("../services/auth");

const loginValidators = [
  body("email").isEmail().withMessage("Courriel invalide").normalizeEmail(),
  body("password").notEmpty().withMessage("Mot de passe requis")
];

const registerValidators = [
  body("name").trim().notEmpty().withMessage("Nom requis").isLength({ max: 120 }),
  body("email").isEmail().withMessage("Courriel invalide").normalizeEmail(),
  body("phone").optional({ checkFalsy: true }).isLength({ max: 40 }),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Le mot de passe doit contenir au moins 8 caractères"),
  body("plan").optional().isString()
];

async function showLogin(req, res) {
  if (req.session.customerId) return res.redirect("/");
  res.render("login", {
    title: "Connexion — StreamFacile",
    errors: [],
    values: {}
  });
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("login", {
      title: "Connexion — StreamFacile",
      errors: errors.array(),
      values: req.body
    });
  }

  const customer = await auth.findByEmail(req.body.email);
  if (!customer || !(await auth.verifyPassword(req.body.password, customer.password_hash))) {
    return res.status(401).render("login", {
      title: "Connexion — StreamFacile",
      errors: [{ msg: "Courriel ou mot de passe incorrect." }],
      values: { email: req.body.email }
    });
  }

  if (!customer.is_active) {
    return res.status(403).render("login", {
      title: "Connexion — StreamFacile",
      errors: [{ msg: "Ce compte est désactivé. Contactez le support." }],
      values: { email: req.body.email }
    });
  }

  req.session.customerId = customer.id;
  req.session.customerName = customer.name;
  res.redirect("/");
}

async function showRegister(req, res) {
  if (req.session.customerId) return res.redirect("/");
  res.render("register", {
    title: "Créer un compte — StreamFacile",
    errors: [],
    values: {},
    plans: await auth.listPlans ? auth.listPlans() : []
  });
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render("register", {
      title: "Créer un compte — StreamFacile",
      errors: errors.array(),
      values: req.body
    });
  }

  const existing = await auth.findByEmail(req.body.email);
  if (existing) {
    return res.status(400).render("register", {
      title: "Créer un compte — StreamFacile",
      errors: [{ msg: "Un compte existe déjà avec ce courriel." }],
      values: req.body
    });
  }

  const created = await auth.createCustomer({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    planSlug: req.body.plan || "populaire"
  });

  req.session.customerId = created.id;
  req.session.customerName = created.name;
  res.redirect("/");
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("sf_device");
    res.redirect("/connexion");
  });
}

module.exports = {
  loginValidators,
  registerValidators,
  showLogin,
  login,
  showRegister,
  register,
  logout
};
