const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware");

const router = express.Router();

function getAllSettings() {
  const rows = db.prepare("SELECT * FROM settings").all();
  const obj = {};
  rows.forEach((r) => (obj[r.key] = r.value));
  return obj;
}

// عرض الإعدادات (عام - تحتاجها الواجهة لعرض اسم المتجر والشعار)
router.get("/", (req, res) => {
  res.json(getAllSettings());
});

// تحديث الإعدادات (أدمن فقط)
router.put("/", requireAdmin, (req, res) => {
  const allowedKeys = ["store_name", "store_logo", "whatsapp", "primary_color"];
  const upsert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  for (const key of allowedKeys) {
    if (req.body[key] !== undefined) upsert.run(key, String(req.body[key]));
  }
  res.json(getAllSettings());
});

module.exports = router;
