const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware");

const router = express.Router();

// عرض كل التصنيفات (عام)
router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY sort_order, id").all());
});

// إضافة تصنيف جديد (أدمن فقط)
router.post("/", requireAdmin, (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "اسم التصنيف مطلوب" });
  const maxOrder = db.prepare("SELECT MAX(sort_order) AS m FROM categories").get().m || 0;
  try {
    const info = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)").run(name.trim(), maxOrder + 1);
    res.status(201).json({ id: info.lastInsertRowid, name: name.trim() });
  } catch {
    res.status(400).json({ error: "هذا التصنيف موجود مسبقًا" });
  }
});

// تعديل اسم تصنيف (أدمن فقط)
router.put("/:id", requireAdmin, (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "اسم التصنيف مطلوب" });
  db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name.trim(), req.params.id);
  res.json({ ok: true });
});

// حذف تصنيف (أدمن فقط) - يمنع الحذف إذا فيه منتجات مرتبطة به
router.delete("/:id", requireAdmin, (req, res) => {
  const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!cat) return res.status(404).json({ error: "التصنيف غير موجود" });
  const inUse = db.prepare("SELECT COUNT(*) AS c FROM products WHERE category = ?").get(cat.name).c;
  if (inUse > 0) return res.status(400).json({ error: `لا يمكن حذف التصنيف لأنه مستخدم في ${inUse} منتج` });
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
