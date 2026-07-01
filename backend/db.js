const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "store.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  color TEXT,
  sizes TEXT,            -- JSON array
  stock INTEGER NOT NULL DEFAULT 0,
  images TEXT,           -- JSON array of URLs
  rating REAL DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  percent_off INTEGER NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  items TEXT NOT NULL,        -- JSON array [{productId,name,size,qty,price}]
  subtotal INTEGER NOT NULL,
  shipping INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'قيد المعالجة',
  payment_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// إنشاء حساب الأدمن من بيانات .env عند أول تشغيل فقط
function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const existing = db.prepare("SELECT * FROM admins WHERE username = ?").get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(username, hash);
    console.log(`✔ تم إنشاء حساب الأدمن: ${username}`);
  }
}

// إضافة منتجات تجريبية إذا كانت قاعدة البيانات فارغة
function seedProducts() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (count > 0) return;
  const seed = [
    ["p1", "عباية تطريز يدوي", "ملابس", 18000, "أسود", ["S", "M", "L"], 6],
    ["p2", "فستان سهرة مطرز", "ملابس", 32000, "كحلي", ["M", "L", "XL"], 2],
    ["p3", "حذاء كعب كلاسيك", "أحذية", 12500, "بيج", ["37", "38", "39", "40"], 0],
    ["p4", "عطر ورد عماني", "عطور", 9500, "-", ["50ml", "100ml"], 15],
  ];
  const insert = db.prepare(`INSERT INTO products (id,name,category,price,color,sizes,stock,images,rating,reviews)
    VALUES (@id,@name,@category,@price,@color,@sizes,@stock,@images,@rating,@reviews)`);
  for (const [id, name, category, price, color, sizes, stock] of seed) {
    insert.run({
      id, name, category, price, color,
      sizes: JSON.stringify(sizes),
      stock,
      images: JSON.stringify(["https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600"]),
      rating: 4.5,
      reviews: 0,
    });
  }
}

function seedSettings() {
  const defaults = {
    store_name: process.env.STORE_NAME || "متجري",
    store_logo: "",
    whatsapp: process.env.STORE_WHATSAPP || "",
    primary_color: "#1D4ED8",
  };
  const insert = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(defaults)) insert.run(k, v);
}

function seedCategories() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM categories").get().c;
  if (count > 0) return;
  const insert = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)");
  ["ملابس", "أحذية", "عطور"].forEach((name, i) => insert.run(name, i));
}

ensureAdmin();
seedProducts();
seedSettings();
seedCategories();

module.exports = db;
