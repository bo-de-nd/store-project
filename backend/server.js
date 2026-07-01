require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./db"); // تهيئة قاعدة البيانات وإنشاء الجداول عند أول تشغيل

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const settingsRoutes = require("./routes/settings");
const categoryRoutes = require("./routes/categories");
const uploadRoutes = require("./routes/upload");
const shareRoutes = require("./routes/share");

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => res.json({ ok: true, store: process.env.STORE_NAME }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/share", shareRoutes);

app.use((req, res) => res.status(404).json({ error: "المسار غير موجود" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`));
