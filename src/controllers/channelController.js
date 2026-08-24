const { body, validationResult } = require("express-validator");
const { pool } = require("../config/db");
const auth = require("../services/auth");

async function getSelectionContext(customerId) {
  const customer = await auth.findById(customerId);
  if (!customer) throw new Error("Client introuvable");

  const { rows: counts } = await pool.query(
    `SELECT count(*)::int AS selected FROM customer_channels WHERE customer_id = $1`,
    [customerId]
  );

  return {
    customer,
    maxChannels: customer.max_channels,
    selected: counts[0].selected
  };
}

async function showCatalog(req, res) {
  const customerId = req.session.customerId;
  const search = (req.query.recherche || "").toString().trim();
  const category = (req.query.categorie || "Toutes").toString().trim();

  const ctx = await getSelectionContext(customerId);

  const { rows: categories } = await pool.query(
    `SELECT DISTINCT category FROM channels WHERE is_active = TRUE ORDER BY category`
  );

  const conditions = ["ch.is_active = TRUE"];
  const params = [customerId];
  let idx = 2;

  if (category !== "Toutes") {
    conditions.push(`ch.category = $${idx++}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`(ch.name ILIKE $${idx} OR ch.category ILIKE $${idx})`);
    params.push(`%${search}%`);
  }

  const { rows: channels } = await pool.query(
    `SELECT ch.id, ch.name, ch.category, ch.language, ch.logo_url, ch.external_id,
            EXISTS (
              SELECT 1 FROM customer_channels cc
               WHERE cc.customer_id = $1 AND cc.channel_id = ch.id
            ) AS selected
       FROM channels ch
      WHERE ${conditions.join(" AND ")}
      ORDER BY ch.category, ch.name`,
    params
  );

  res.render("channels", {
    title: "Catalogue de chaînes — StreamFacile",
    categories: ["Toutes", ...categories.map((c) => c.category)],
    activeCategory: category,
    search,
    channels,
    maxChannels: ctx.maxChannels,
    selected: ctx.selected,
    remaining: Math.max(0, ctx.maxChannels - ctx.selected),
    atLimit: ctx.selected >= ctx.maxChannels
  });
}

const toggleValidators = [
  body("channelId").isInt({ min: 1 }).withMessage("Identifiant de chaîne invalide")
];

async function toggleChannel(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, message: "Requête invalide." });
  }

  const customerId = req.session.customerId;
  const channelId = parseInt(req.body.channelId, 10);

  const { rows: ch } = await pool.query(
    `SELECT id FROM channels WHERE id = $1 AND is_active = TRUE`,
    [channelId]
  );
  if (!ch.length) {
    return res.status(404).json({ ok: false, message: "Chaîne introuvable." });
  }

  const ctx = await getSelectionContext(customerId);

  const { rows: isSelected } = await pool.query(
    `SELECT 1 FROM customer_channels WHERE customer_id = $1 AND channel_id = $2`,
    [customerId, channelId]
  );

  if (isSelected.length) {
    await pool.query(
      `DELETE FROM customer_channels WHERE customer_id = $1 AND channel_id = $2`,
      [customerId, channelId]
    );
    return res.json({
      ok: true,
      selected: false,
      selectedCount: ctx.selected - 1,
      remaining: ctx.maxChannels - (ctx.selected - 1)
    });
  }

  if (ctx.selected >= ctx.maxChannels) {
    return res.status(409).json({
      ok: false,
      message: `Vous avez atteint votre limite de ${ctx.maxChannels} chaînes.`,
      atLimit: true,
      selectedCount: ctx.selected,
      remaining: 0
    });
  }

  await pool.query(
    `INSERT INTO customer_channels (customer_id, channel_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [customerId, channelId]
  );

  const newCount = ctx.selected + 1;
  return res.json({
    ok: true,
    selected: true,
    selectedCount: newCount,
    remaining: ctx.maxChannels - newCount,
    atLimit: newCount >= ctx.maxChannels
  });
}

module.exports = {
  showCatalog,
  toggleChannel,
  toggleValidators,
  getSelectionContext
};
