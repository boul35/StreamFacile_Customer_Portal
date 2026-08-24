const crypto = require("crypto");
const env = require("../config/env");

const CSRF_COOKIE = "sf_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfMiddleware(req, res, next) {
  let token = req.cookies ? req.cookies[CSRF_COOKIE] : null;

  if (!token) {
    token = crypto.randomBytes(24).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "lax",
      path: "/"
    });
  }

  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method) || env.nodeEnv === "test") {
    return next();
  }

  const submitted = req.body && req.body._csrf;
  if (!submitted || submitted !== token) {
    return res.status(403).render("error", {
      title: "Accès refusé — StreamFacile",
      code: 403,
      message: "Jeton de sécurité invalide. Rechargez la page et réessayez."
    });
  }

  next();
}

module.exports = { csrfMiddleware, CSRF_COOKIE };
