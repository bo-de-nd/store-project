const express = require("express");
const db = require("../db");

const router = express.Router();

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// صفحة مشاركة للمنتج: تعرض صورة وعنوان وسعر المنتج كمعاينة عند مشاركة الرابط في واتساب،
// ثم تحوّل الزائر تلقائيًا لصفحة المنتج الفعلية في الموقع
router.get("/product/:id", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).send("المنتج غير موجود");

  const settings = db.prepare("SELECT * FROM settings").all().reduce((o, r) => ((o[r.key] = r.value), o), {});
  const images = JSON.parse(product.images || "[]");
  const image = images[0] || "";
  const frontendUrl = process.env.FRONTEND_ORIGIN || "";
  const productPageUrl = `${frontendUrl}/?product=${product.id}`;
  const apiBase = `${req.protocol}://${req.get("host")}`;
  const absoluteImage = image.startsWith("http") ? image : `${apiBase}${image}`;

  res.send(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(product.name)} - ${escapeHtml(settings.store_name || "")}</title>
  <meta property="og:title" content="${escapeHtml(product.name)}" />
  <meta property="og:description" content="${escapeHtml(product.price)} ر.ي - ${escapeHtml(settings.store_name || "")}" />
  <meta property="og:image" content="${escapeHtml(absoluteImage)}" />
  <meta property="og:type" content="product" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0; url=${escapeHtml(productPageUrl)}" />
</head>
<body>
  جاري التحويل... إذا لم يتم تحويلك تلقائيًا، <a href="${escapeHtml(productPageUrl)}">اضغط هنا</a>.
</body>
</html>`);
});

module.exports = router;
