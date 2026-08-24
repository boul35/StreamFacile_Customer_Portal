const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const path = require("path");
const env = require("./config/env");
const { pool } = require("./config/db");
const { attachCustomer } = require("./middleware/auth");
const { deviceTracker } = require("./middleware/device");
const { csrfMiddleware } = require("./middleware/csrf");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const channelRoutes = require("./routes/channels");
const provisioningRoutes = require("./routes/provisioning");
const accountRoutes = require("./routes/account");
const supportRoutes = require("./routes/support");

const app = express();

const sessionStore = new pgSession({
  pool,
  tableName: "session",
  createTableIfMissing: true
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

if (env.isProd) {
  app.set("trust proxy", 1);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(attachCustomer);
app.use(csrfMiddleware);
app.use(deviceTracker);

app.use((req, res, next) => {
  res.locals.customerName = req.session ? req.session.customerName : null;
  res.locals.currentPath = req.path;
  next();
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "error", db: "down" });
  }
});

app.use("/", authRoutes);
app.use("/", dashboardRoutes);
app.use("/", channelRoutes);
app.use("/", provisioningRoutes);
app.use("/", accountRoutes);
app.use("/", supportRoutes);

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page introuvable — StreamFacile",
    code: 404,
    message: "La page demandée est introuvable."
  });
});

app.use((err, req, res, next) => {
  console.error("[app]", err.message);
  res.status(500).render("error", {
    title: "Erreur — StreamFacile",
    code: 500,
    message: "Une erreur inattendue s'est produite. Veuillez réessayer."
  });
});

module.exports = app;
