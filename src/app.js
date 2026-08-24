const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const path = require("path");
const env = require("./config/env");
const { attachCustomer } = require("./middleware/auth");
const { deviceTracker } = require("./middleware/device");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const channelRoutes = require("./routes/channels");
const provisioningRoutes = require("./routes/provisioning");
const accountRoutes = require("./routes/account");
const supportRoutes = require("./routes/support");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 7 }
  })
);

app.use(attachCustomer);
app.use(deviceTracker);

app.use((req, res, next) => {
  res.locals.customerName = req.session ? req.session.customerName : null;
  res.locals.currentPath = req.path;
  next();
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
