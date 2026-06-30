require("dotenv").config();
const express = require("express");
const cors = require("cors");

require("./db"); // تهيئة قاعدة البيانات وإنشاء الجداول عند أول تشغيل

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, store: process.env.STORE_NAME }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.use((req, res) => res.status(404).json({ error: "المسار غير موجود" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`));
