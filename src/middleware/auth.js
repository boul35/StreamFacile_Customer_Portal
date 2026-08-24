function requireAuth(req, res, next) {
  if (!req.session || !req.session.customerId) {
    return res.redirect("/connexion");
  }
  next();
}

function attachCustomer(req, res, next) {
  res.locals.customerId = req.session ? req.session.customerId : null;
  next();
}

module.exports = { requireAuth, attachCustomer };
