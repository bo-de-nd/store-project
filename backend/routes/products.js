const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware");

const router = express.Router();

function parseProduct(row) {
  return {
    ...row,
    sizes: JSON.parse(row.sizes || "[]"),
    images: JSON.parse(row.images || "[]"),
  };
}

// عرض كل المنتجات (عام - للعملاء)
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  res.json(rows.map(parseProduct));
});

// عرض منتج واحد
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "المنتج غير موجود" });
  res.json(parseProduct(row));
});

// إضافة منتج (أدمن فقط)
router.post("/", requireAdmin, (req, res) => {
  const { id, name, category, price, color, sizes, stock, images } = req.body || {};
  if (!name || !category || !price) return res.status(400).json({ error: "الاسم والتصنيف والسعر مطلوبة" });

  const productId = id || "p" + Date.now();
  db.prepare(`INSERT INTO products (id,name,category,price,color,sizes,stock,images,rating,reviews)
    VALUES (@id,@name,@category,@price,@color,@sizes,@stock,@images,0,0)`).run({
    id: productId,
    name,
    category,
    price,
    color: color || "",
    sizes: JSON.stringify(sizes || []),
    stock: stock || 0,
    images: JSON.stringify(images || []),
  });

  res.status(201).json(parseProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(productId)));
});

// تعديل منتج (أدمن فقط)
router.put("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });

  const { name, category, price, color, sizes, stock, images } = req.body || {};
  db.prepare(`UPDATE products SET name=?, category=?, price=?, color=?, sizes=?, stock=?, images=? WHERE id=?`).run(
    name ?? existing.name,
    category ?? existing.category,
    price ?? existing.price,
    color ?? existing.color,
    JSON.stringify(sizes ?? JSON.parse(existing.sizes || "[]")),
    stock ?? existing.stock,
    JSON.stringify(images ?? JSON.parse(existing.images || "[]")),
    req.params.id
  );

  res.json(parseProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id)));
});

// حذف منتج (أدمن فقط)
router.delete("/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
