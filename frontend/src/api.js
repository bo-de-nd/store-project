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

export const api = {
  // منتجات
  getProducts: () => fetch(`${API_URL}/products`).then(handle),
  createProduct: (p) =>
    fetch(`${API_URL}/products`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(p) }).then(handle),
  updateProduct: (id, p) =>
    fetch(`${API_URL}/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(p) }).then(handle),
  deleteProduct: (id) => fetch(`${API_URL}/products/${id}`, { method: "DELETE", headers: authHeaders() }).then(handle),

  // طلبات
  createOrder: (payload) =>
    fetch(`${API_URL}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(handle),
  getOrdersByPhone: (phone) => fetch(`${API_URL}/orders/by-phone/${encodeURIComponent(phone)}`).then(handle),
  getAllOrders: () => fetch(`${API_URL}/orders`, { headers: authHeaders() }).then(handle),
  updateOrderStatus: (id, status) =>
    fetch(`${API_URL}/orders/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ status }) }).then(handle),
  confirmPayment: (orderId) =>
    fetch(`${API_URL}/orders/confirm-payment`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ orderId }) }).then(handle),
  invoiceUrl: (orderId) => `${API_URL}/orders/${orderId}/invoice`,
  getStats: () => fetch(`${API_URL}/orders/stats/summary`, { headers: authHeaders() }).then(handle),

  // مصادقة
  login: (username, password) =>
    fetch(`${API_URL}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) }).then(handle),
};
