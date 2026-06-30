const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "أدخل اسم المستخدم وكلمة المرور" });

  const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  const token = jwt.sign({ id: admin.id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, username: admin.username });
});

module.exports = router;
