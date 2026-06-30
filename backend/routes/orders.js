const express = require("express");
const PDFDocument = require("pdfkit");
const db = require("../db");
const { requireAdmin } = require("../middleware");

const router = express.Router();

function genOrderId() {
  return "ORD-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function parseOrder(row) {
  return { ...row, items: JSON.parse(row.items || "[]"), paymentConfirmed: !!row.payment_confirmed };
}

// إنشاء طلب جديد (عام - من العميل عند إتمام الطلب)
router.post("/", (req, res) => {
  const { customerName, customerPhone, customerCity, customerAddress, items, shipping } = req.body || {};
  if (!customerName || !customerPhone || !customerAddress || !items?.length) {
    return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
  }

  // التحقق من المخزون وحساب الإجمالي من بيانات قاعدة البيانات (وليس من الفرونت إند) لمنع التلاعب بالسعر
  const checked = [];
  let subtotal = 0;
  for (const item of items) {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.id);
    if (!product) return res.status(400).json({ error: `منتج غير موجود: ${item.id}` });
    if (product.stock < item.qty) return res.status(400).json({ error: `الكمية غير متوفرة لمنتج: ${product.name}` });
    checked.push({ productId: product.id, name: product.name, size: item.size, qty: item.qty, price: product.price });
    subtotal += product.price * item.qty;
  }

  const shippingFee = Number(shipping) || 0;
  const total = subtotal + shippingFee;
  const orderId = genOrderId();

  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO orders (id, customer_name, customer_phone, customer_city, customer_address, items, subtotal, shipping, total)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      orderId, customerName, customerPhone, customerCity || "", customerAddress, JSON.stringify(checked), subtotal, shippingFee, total
    );
    for (const item of checked) {
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.qty, item.productId);
    }
  });
  tx();

  const order = parseOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId));

  // رابط واتساب جاهز برسالة معبأة مسبقًا لإرسالها لصاحبة المتجر
  const message = `طلب جديد ${orderId}\nالاسم: ${customerName}\nالمدينة: ${customerCity || "-"}\nالمنتجات:\n${checked
    .map((i) => `- ${i.name} (${i.size}) × ${i.qty}`)
    .join("\n")}\nالإجمالي: ${total} ر.ي`;
  const whatsappLink = `https://wa.me/${process.env.STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;

  res.status(201).json({ order, whatsappLink });
});

// تتبع الطلبات عبر رقم الهاتف (عام - صفحة "طلباتي")
router.get("/by-phone/:phone", (req, res) => {
  const rows = db.prepare("SELECT * FROM orders WHERE customer_phone = ? ORDER BY created_at DESC").all(req.params.phone);
  res.json(rows.map(parseOrder));
});

// عرض كل الطلبات (أدمن فقط)
router.get("/", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json(rows.map(parseOrder));
});

// تحديث حالة الطلب (أدمن فقط)
router.patch("/:id/status", requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!["قيد المعالجة", "تم الشحن", "تم التسليم"].includes(status)) {
    return res.status(400).json({ error: "حالة غير صحيحة" });
  }
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

// تأكيد استلام الدفع برقم الطلب (أدمن فقط)
router.post("/confirm-payment", requireAdmin, (req, res) => {
  const { orderId } = req.body || {};
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get((orderId || "").trim());
  if (!order) return res.status(404).json({ error: "رقم الطلب غير موجود" });
  db.prepare("UPDATE orders SET payment_confirmed = 1 WHERE id = ?").run(order.id);
  res.json({ ok: true, order: parseOrder({ ...order, payment_confirmed: 1 }) });
});

// إصدار فاتورة PDF لطلب معيّن
router.get("/:id/invoice", (req, res) => {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "الطلب غير موجود" });
  const order = parseOrder(row);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=invoice-${order.id}.pdf`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);

  doc.fontSize(18).text(`${process.env.STORE_NAME || "المتجر"} - فاتورة`, { align: "right" });
  doc.moveDown();
  doc.fontSize(11).text(`رقم الطلب: ${order.id}`, { align: "right" });
  doc.text(`التاريخ: ${order.created_at}`, { align: "right" });
  doc.text(`العميل: ${order.customer_name} - ${order.customer_phone}`, { align: "right" });
  doc.text(`العنوان: ${order.customer_city} - ${order.customer_address}`, { align: "right" });
  doc.moveDown();

  order.items.forEach((i) => {
    doc.text(`${i.name} (${i.size}) × ${i.qty} = ${i.price * i.qty} ر.ي`, { align: "right" });
  });

  doc.moveDown();
  doc.text(`المجموع الفرعي: ${order.subtotal} ر.ي`, { align: "right" });
  doc.text(`الشحن: ${order.shipping} ر.ي`, { align: "right" });
  doc.fontSize(13).text(`الإجمالي: ${order.total} ر.ي`, { align: "right" });

  doc.end();
});

// إحصائيات مبسطة للوحة الأدمن
router.get("/stats/summary", requireAdmin, (req, res) => {
  const confirmed = db.prepare("SELECT * FROM orders WHERE payment_confirmed = 1").all();
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = confirmed.filter((o) => o.created_at.startsWith(today)).reduce((s, o) => s + o.total, 0);
  const monthSales = confirmed
    .filter((o) => o.created_at.slice(0, 7) === today.slice(0, 7))
    .reduce((s, o) => s + o.total, 0);
  const totalSales = confirmed.reduce((s, o) => s + o.total, 0);

  const allItems = db.prepare("SELECT items FROM orders").all().flatMap((r) => JSON.parse(r.items));
  const counts = {};
  allItems.forEach((i) => (counts[i.name] = (counts[i.name] || 0) + i.qty));
  const topProducts = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));

  const lowStock = db.prepare("SELECT id, name, stock FROM products WHERE stock > 0 AND stock <= 3").all();
  const outOfStock = db.prepare("SELECT id, name FROM products WHERE stock = 0").all();

  res.json({ todaySales, monthSales, totalSales, topProducts, lowStock, outOfStock });
});

module.exports = router;
