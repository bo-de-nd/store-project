const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function authHeaders() {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "حدث خطأ غير متوقع");
  return data;
}

const J = (payload) => ({ "Content-Type": "application/json" });

export const api = {
  // ── إعدادات المتجر ──────────────────────────────────────────
  getSettings:    () => fetch(`${API_URL}/settings`).then(handle),
  updateSettings: (p) => fetch(`${API_URL}/settings`, { method: "PUT", headers: { ...J(), ...authHeaders() }, body: JSON.stringify(p) }).then(handle),

  // ── تصنيفات ─────────────────────────────────────────────────
  getCategories:  ()     => fetch(`${API_URL}/categories`).then(handle),
  createCategory: (name) => fetch(`${API_URL}/categories`, { method: "POST", headers: { ...J(), ...authHeaders() }, body: JSON.stringify({ name }) }).then(handle),
  deleteCategory: (id)   => fetch(`${API_URL}/categories/${id}`, { method: "DELETE", headers: authHeaders() }).then(handle),

  // ── مناطق الشحن ─────────────────────────────────────────────
  getShippingZones:    ()        => fetch(`${API_URL}/shipping`).then(handle),
  createShippingZone:  (payload) => fetch(`${API_URL}/shipping`, { method: "POST", headers: { ...J(), ...authHeaders() }, body: JSON.stringify(payload) }).then(handle),
  updateShippingZone:  (id, p)   => fetch(`${API_URL}/shipping/${id}`, { method: "PUT", headers: { ...J(), ...authHeaders() }, body: JSON.stringify(p) }).then(handle),
  deleteShippingZone:  (id)      => fetch(`${API_URL}/shipping/${id}`, { method: "DELETE", headers: authHeaders() }).then(handle),

  // ── رفع صور ─────────────────────────────────────────────────
  uploadImage: (file) => {
    const fd = new FormData();
    fd.append("image", file);
    return fetch(`${API_URL}/upload`, { method: "POST", headers: authHeaders(), body: fd }).then(handle);
  },
  fileUrl:  (path)      => (path?.startsWith("http") ? path : `${API_URL.replace("/api", "")}${path || ""}`),
  shareUrl: (productId) => `${API_URL.replace("/api", "")}/share/product/${productId}`,

  // ── منتجات ──────────────────────────────────────────────────
  getProducts:   ()       => fetch(`${API_URL}/products`).then(handle),
  createProduct: (p)      => fetch(`${API_URL}/products`, { method: "POST", headers: { ...J(), ...authHeaders() }, body: JSON.stringify(p) }).then(handle),
  updateProduct: (id, p)  => fetch(`${API_URL}/products/${id}`, { method: "PUT", headers: { ...J(), ...authHeaders() }, body: JSON.stringify(p) }).then(handle),
  deleteProduct: (id)     => fetch(`${API_URL}/products/${id}`, { method: "DELETE", headers: authHeaders() }).then(handle),

  // ── طلبات ───────────────────────────────────────────────────
  createOrder:      (payload) => fetch(`${API_URL}/orders`, { method: "POST", headers: J(), body: JSON.stringify(payload) }).then(handle),
  getOrdersByPhone: (phone)   => fetch(`${API_URL}/orders/by-phone/${encodeURIComponent(phone)}`).then(handle),
  getAllOrders:      ()        => fetch(`${API_URL}/orders`, { headers: authHeaders() }).then(handle),
  updateOrderStatus:(id, st)  => fetch(`${API_URL}/orders/${id}/status`, { method: "PATCH", headers: { ...J(), ...authHeaders() }, body: JSON.stringify({ status: st }) }).then(handle),
  confirmPayment:   (orderId) => fetch(`${API_URL}/orders/confirm-payment`, { method: "POST", headers: { ...J(), ...authHeaders() }, body: JSON.stringify({ orderId }) }).then(handle),
  invoiceUrl:       (orderId) => `${API_URL}/orders/${orderId}/invoice`,
  getStats:         ()        => fetch(`${API_URL}/orders/stats/summary`, { headers: authHeaders() }).then(handle),

  // ── مصادقة ──────────────────────────────────────────────────
  login: (username, password) => fetch(`${API_URL}/auth/login`, { method: "POST", headers: J(), body: JSON.stringify({ username, password }) }).then(handle),
};
