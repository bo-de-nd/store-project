import React, { useState, useEffect, useMemo } from "react";
import { Search, Heart, ShoppingBag, X, Plus, Minus, Star, Package, TrendingUp, Bell, ChevronLeft, Check, Trash2, Lock, FileText, ListOrdered } from "lucide-react";
import { api } from "./api";

const CATEGORIES = ["الكل", "ملابس", "أحذية", "عطور"];
const SHIPPING_BY_CITY = { "صنعاء": 1000, "عدن": 2500, "تعز": 2000, "أخرى": 3000 };
const STORE_NAME = "متجر لمسة";

const fmt = (n) => Number(n || 0).toLocaleString("ar") + " ر.ي";

function stockLabel(stock) {
  if (stock === 0) return { text: "نفذ من المخزون", tone: "out" };
  if (stock <= 3) return { text: `كمية محدودة (${stock})`, tone: "low" };
  return { text: "متوفر", tone: "ok" };
}

export default function App() {
  const [view, setView] = useState("shop"); // shop | myorders | admin
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem("admin_token") || "");

  const loadProducts = () => {
    setLoading(true);
    api
      .getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FBF8F4] text-[#2A2420] font-sans">
      <TopBar view={view} setView={setView} cartCount={cart.reduce((s, c) => s + c.qty, 0)} onCartClick={() => setCartOpen(true)} isAdmin={!!adminToken} />

      {error && <div className="bg-[#C0573B]/10 text-[#C0573B] text-xs text-center py-2 px-4">تعذر الاتصال بالخادم: {error}. تأكد أن الباك إند يعمل.</div>}

      {view === "shop" && (
        <ShopView products={products} loading={loading} favorites={favorites} setFavorites={setFavorites} onOpenProduct={setProductOpen} />
      )}
      {view === "myorders" && <MyOrdersView />}
      {view === "admin" &&
        (adminToken ? (
          <AdminView
            token={adminToken}
            onLogout={() => {
              localStorage.removeItem("admin_token");
              setAdminToken("");
            }}
            onProductsChanged={loadProducts}
          />
        ) : (
          <AdminLogin
            onLogin={(t) => {
              localStorage.setItem("admin_token", t);
              setAdminToken(t);
            }}
          />
        ))}

      {productOpen && (
        <ProductModal
          product={productOpen}
          onClose={() => setProductOpen(null)}
          onAddToCart={(item) => {
            setCart((c) => {
              const existing = c.find((x) => x.id === item.id && x.size === item.size);
              if (existing) return c.map((x) => (x === existing ? { ...x, qty: x.qty + item.qty } : x));
              return [...c, item];
            });
            setProductOpen(null);
            setCartOpen(true);
          }}
        />
      )}

      {cartOpen && (
        <CartDrawer cart={cart} products={products} setCart={setCart} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
      )}

      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          products={products}
          onClose={() => setCheckoutOpen(false)}
          onConfirmed={() => {
            setCart([]);
            setCheckoutOpen(false);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

function TopBar({ view, setView, cartCount, onCartClick, isAdmin }) {
  return (
    <div className="sticky top-0 z-30 bg-[#FBF8F4]/95 backdrop-blur border-b border-[#E7DFD3]">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView("shop")}>
          <div className="w-9 h-9 rounded-full bg-[#8B6F47] text-white flex items-center justify-center font-bold">ل</div>
          <span className="font-bold text-lg tracking-tight">{STORE_NAME}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("myorders")} className="text-xs px-3 py-1.5 rounded-full border border-[#D8CBB8] text-[#6B5B47] hover:bg-[#F0E9DD] transition flex items-center gap-1">
            <ListOrdered size={13} /> طلباتي
          </button>
          <button onClick={() => setView(view === "admin" ? "shop" : "admin")} className="text-xs px-3 py-1.5 rounded-full border border-[#D8CBB8] text-[#6B5B47] hover:bg-[#F0E9DD] transition">
            {view === "admin" ? "العودة للمتجر" : isAdmin ? "لوحة التحكم" : "دخول الإدارة"}
          </button>
          {view === "shop" && (
            <button onClick={onCartClick} className="relative w-9 h-9 rounded-full bg-[#8B6F47] text-white flex items-center justify-center">
              <ShoppingBag size={16} />
              {cartCount > 0 && <span className="absolute -top-1 -left-1 bg-[#C0573B] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopView({ products, loading, favorites, setFavorites, onOpenProduct }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("الكل");
  const [sort, setSort] = useState("default");

  const filtered = useMemo(() => {
    let list = products.filter((p) => (cat === "الكل" || p.category === cat) && p.name.includes(query));
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, query, cat, sort]);

  const toggleFav = (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  if (loading) return <div className="text-center py-20 text-sm text-[#A8957B]">جاري تحميل المنتجات...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8957B]" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن منتج..." className="w-full bg-white border border-[#E7DFD3] rounded-xl py-2.5 pr-9 pl-3 text-sm outline-none focus:border-[#8B6F47]" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${cat === c ? "bg-[#8B6F47] text-white border-[#8B6F47]" : "bg-white text-[#6B5B47] border-[#E7DFD3]"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="flex justify-end mb-3">
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs bg-white border border-[#E7DFD3] rounded-lg px-2 py-1.5 outline-none">
          <option value="default">الترتيب الافتراضي</option>
          <option value="price_asc">السعر: من الأقل</option>
          <option value="price_desc">السعر: من الأعلى</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#A8957B] text-sm">لا توجد منتجات مطابقة</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const sl = stockLabel(p.stock);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-[#E7DFD3] overflow-hidden flex flex-col">
                <div className="relative cursor-pointer" onClick={() => onOpenProduct(p)}>
                  <img src={p.images[0]} alt={p.name} className="w-full h-32 sm:h-40 object-cover" />
                  <button onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                    <Heart size={14} className={favorites.includes(p.id) ? "fill-[#C0573B] text-[#C0573B]" : "text-[#8B6F47]"} />
                  </button>
                  {sl.tone !== "ok" && <span className={`absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full ${sl.tone === "out" ? "bg-[#2A2420]/80 text-white" : "bg-[#C0573B] text-white"}`}>{sl.text}</span>}
                </div>
                <div className="p-2.5 flex flex-col gap-1 flex-1 cursor-pointer" onClick={() => onOpenProduct(p)}>
                  <span className="text-xs font-medium leading-snug line-clamp-2">{p.name}</span>
                  <div className="flex items-center gap-1 text-[10px] text-[#A8957B]">
                    <Star size={10} className="fill-[#D9A441] text-[#D9A441]" /> {p.rating} ({p.reviews})
                  </div>
                  <span className="text-sm font-bold text-[#8B6F47] mt-auto">{fmt(p.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onAddToCart }) {
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);
  const sl = stockLabel(product.stock);
  const disabled = product.stock === 0;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={product.images[0]} className="w-full h-64 object-cover" alt={product.name} />
          <button onClick={onClose} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <h3 className="font-bold text-lg">{product.name}</h3>
          <div className="flex items-center gap-2 text-xs text-[#A8957B]">
            <Star size={12} className="fill-[#D9A441] text-[#D9A441]" /> {product.rating} · {product.reviews} تقييم
          </div>
          <p className="text-xl font-bold text-[#8B6F47]">{fmt(product.price)}</p>
          <span className={`inline-block text-xs px-2 py-1 rounded-full ${sl.tone === "out" ? "bg-[#2A2420]/10" : sl.tone === "low" ? "bg-[#C0573B]/10 text-[#C0573B]" : "bg-[#3D7A4D]/10 text-[#3D7A4D]"}`}>{sl.text}</span>

          {product.sizes?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5 text-[#6B5B47]">المقاس</p>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={`px-3 py-1.5 rounded-lg text-xs border ${size === s ? "bg-[#8B6F47] text-white border-[#8B6F47]" : "border-[#E7DFD3]"}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-[#6B5B47]">الكمية</p>
            <div className="flex items-center gap-2 border border-[#E7DFD3] rounded-lg px-1">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-1.5"><Minus size={12} /></button>
              <span className="text-sm w-5 text-center">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="p-1.5"><Plus size={12} /></button>
            </div>
          </div>

          <button disabled={disabled} onClick={() => onAddToCart({ id: product.id, qty, size })} className="w-full bg-[#8B6F47] disabled:bg-[#D8CBB8] disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium mt-2">
            {disabled ? "غير متوفر حاليًا" : "إضافة إلى السلة"}
          </button>

          <a href={`https://wa.me/?text=${encodeURIComponent(`شاهد هذا المنتج: ${product.name} - ${fmt(product.price)}`)}`} target="_blank" rel="noreferrer" className="block text-center text-xs text-[#6B5B47] underline pt-1">
            مشاركة المنتج عبر واتساب
          </a>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cart, products, setCart, onClose, onCheckout }) {
  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.id) })).filter((i) => i.product);
  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="bg-[#FBF8F4] w-full sm:w-96 h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[#E7DFD3]">
          <h3 className="font-bold">سلة المشتريات</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-[#A8957B] text-center mt-10">السلة فارغة</p>
          ) : (
            items.map((i, idx) => (
              <div key={idx} className="flex gap-3 bg-white p-2.5 rounded-xl border border-[#E7DFD3]">
                <img src={i.product.images[0]} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{i.product.name}</p>
                  <p className="text-xs text-[#A8957B]">المقاس: {i.size} · الكمية: {i.qty}</p>
                  <p className="text-sm font-bold text-[#8B6F47] mt-1">{fmt(i.product.price * i.qty)}</p>
                </div>
                <button onClick={() => setCart((c) => c.filter((_, x) => x !== idx))} className="text-[#C0573B]"><Trash2 size={15} /></button>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-[#E7DFD3] space-y-3">
            <div className="flex justify-between text-sm font-bold"><span>الإجمالي</span><span>{fmt(total)}</span></div>
            <button onClick={onCheckout} className="w-full bg-[#8B6F47] text-white py-3 rounded-xl text-sm font-medium">إتمام الطلب</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({ cart, products, onClose, onConfirmed }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("صنعاء");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.id) })).filter((i) => i.product);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const shipping = SHIPPING_BY_CITY[city] ?? SHIPPING_BY_CITY["أخرى"];
  const total = subtotal + shipping;
  const canSubmit = name.trim() && phone.trim() && address.trim() && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.createOrder({
        customerName: name,
        customerPhone: phone,
        customerCity: city,
        customerAddress: address,
        items: items.map((i) => ({ id: i.id, qty: i.qty, size: i.size })),
        shipping,
      });
      setResult(res);
      onConfirmed();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-full bg-[#3D7A4D]/10 text-[#3D7A4D] flex items-center justify-center mx-auto mb-3"><Check size={26} /></div>
          <h3 className="font-bold text-lg mb-1">تم إنشاء طلبك</h3>
          <p className="text-sm text-[#A8957B] mb-1">رقم الطلب</p>
          <p className="font-mono font-bold text-lg mb-4 tracking-wide">{result.order.id}</p>
          <p className="text-xs text-[#6B5B47] mb-4 leading-relaxed">أكمل الآن التواصل عبر واتساب مع {STORE_NAME} لتأكيد الطلب وإتمام الدفع عبر الكريمي.</p>
          <a href={result.whatsappLink} target="_blank" rel="noreferrer" className="block bg-[#3D7A4D] text-white py-3 rounded-xl text-sm font-medium mb-2">متابعة عبر واتساب</a>
          <button onClick={onClose} className="text-xs text-[#A8957B] underline">إغلاق</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[#E7DFD3]">
          <h3 className="font-bold">بيانات الشحن</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {error && <p className="text-xs text-[#C0573B] bg-[#C0573B]/10 rounded-lg p-2">{error}</p>}
          <Field label="الاسم الكامل" value={name} onChange={setName} placeholder="مثال: سارة أحمد" />
          <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="7xxxxxxxx" />
          <div>
            <label className="text-xs font-medium text-[#6B5B47] block mb-1">المدينة</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-[#E7DFD3] rounded-lg px-3 py-2 text-sm outline-none">
              {Object.keys(SHIPPING_BY_CITY).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="العنوان التفصيلي" value={address} onChange={setAddress} placeholder="الحي، الشارع، أقرب نقطة دالة" />

          <div className="bg-[#F7F2EA] rounded-xl p-3 text-sm space-y-1 mt-2">
            <Row label="المجموع الفرعي" value={fmt(subtotal)} />
            <Row label="رسوم الشحن" value={fmt(shipping)} />
            <Row label="الإجمالي" value={fmt(total)} bold />
          </div>

          <button disabled={!canSubmit} onClick={submit} className="w-full bg-[#8B6F47] disabled:bg-[#D8CBB8] text-white py-3 rounded-xl text-sm font-medium mt-2">
            {submitting ? "جاري الإرسال..." : "تأكيد الطلب والمتابعة عبر واتساب"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium text-[#6B5B47] block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-[#E7DFD3] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8B6F47]" />
    </div>
  );
}

function Row({ label, value, bold }) {
  return <div className={`flex justify-between ${bold ? "font-bold text-[#8B6F47]" : "text-[#6B5B47]"}`}><span>{label}</span><span>{value}</span></div>;
}

// صفحة "طلباتي" - تتبع الطلبات برقم الهاتف
function MyOrdersView() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = () => {
    if (!phone.trim()) return;
    setLoading(true);
    api.getOrdersByPhone(phone.trim()).then(setOrders).finally(() => setLoading(false));
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h2 className="font-bold text-lg mb-3 text-center">تتبع طلباتي</h2>
      <div className="flex gap-2 mb-5">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="أدخل رقم هاتفك" className="flex-1 border border-[#E7DFD3] rounded-lg px-3 py-2 text-sm outline-none" />
        <button onClick={search} className="bg-[#8B6F47] text-white text-xs px-4 rounded-lg">بحث</button>
      </div>

      {loading && <p className="text-center text-sm text-[#A8957B]">جاري البحث...</p>}

      {orders && orders.length === 0 && <p className="text-center text-sm text-[#A8957B]">لا توجد طلبات بهذا الرقم</p>}

      <div className="space-y-3">
        {orders?.map((o) => (
          <div key={o.id} className="bg-white border border-[#E7DFD3] rounded-xl p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="font-mono font-bold">{o.id}</span>
              <span className="text-xs text-[#8B6F47]">{o.status}</span>
            </div>
            <ul className="text-xs text-[#A8957B] list-disc pr-4 mb-1">
              {o.items.map((i, idx) => <li key={idx}>{i.name} ({i.size}) × {i.qty}</li>)}
            </ul>
            <p className="font-bold text-[#8B6F47]">{fmt(o.total)}</p>
            <a href={api.invoiceUrl(o.id)} target="_blank" rel="noreferrer" className="text-xs text-[#6B5B47] underline flex items-center gap-1 mt-1 w-fit">
              <FileText size={12} /> عرض الفاتورة
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.login(username, password);
      onLogin(res.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xs mx-auto px-4 py-16 text-center">
      <Lock size={28} className="mx-auto mb-3 text-[#8B6F47]" />
      <h2 className="font-bold text-lg mb-4">دخول لوحة التحكم</h2>
      {error && <p className="text-xs text-[#C0573B] bg-[#C0573B]/10 rounded-lg p-2 mb-3">{error}</p>}
      <div className="space-y-3 text-right">
        <Field label="اسم المستخدم" value={username} onChange={setUsername} />
        <div>
          <label className="text-xs font-medium text-[#6B5B47] block mb-1">كلمة المرور</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-[#E7DFD3] rounded-lg px-3 py-2 text-sm outline-none" />
        </div>
      </div>
      <button onClick={submit} disabled={loading} className="w-full bg-[#8B6F47] text-white py-2.5 rounded-xl text-sm font-medium mt-4">{loading ? "..." : "دخول"}</button>
    </div>
  );
}

function AdminView({ token, onLogout, onProductsChanged }) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [authError, setAuthError] = useState(false);

  const refreshAll = () => {
    Promise.all([api.getAllOrders(), api.getProducts(), api.getStats()])
      .then(([o, p, s]) => { setOrders(o); setProducts(p); setStats(s); })
      .catch((e) => { if (e.message.includes("غير مصرح") || e.message.includes("منتهية")) setAuthError(true); });
  };

  useEffect(() => { refreshAll(); }, []);

  if (authError) {
    onLogout();
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="flex justify-end mb-2">
        <button onClick={onLogout} className="text-xs text-[#C0573B] underline">تسجيل الخروج</button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard label="مبيعات اليوم" value={fmt(stats.todaySales)} icon={<TrendingUp size={14} />} />
          <StatCard label="إجمالي المبيعات" value={fmt(stats.totalSales)} icon={<Package size={14} />} />
          <StatCard label="تنبيهات مخزون" value={`${stats.lowStock.length + stats.outOfStock.length}`} icon={<Bell size={14} />} alert={stats.lowStock.length + stats.outOfStock.length > 0} />
        </div>
      )}

      <div className="flex gap-2 mb-4 border-b border-[#E7DFD3]">
        {[["orders", "الطلبات"], ["products", "المنتجات"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? "border-[#8B6F47] text-[#8B6F47]" : "border-transparent text-[#A8957B]"}`}>{label}</button>
        ))}
      </div>

      {tab === "orders" ? (
        <OrdersTab orders={orders} onChanged={refreshAll} />
      ) : (
        <ProductsTab products={products} onChanged={() => { refreshAll(); onProductsChanged(); }} />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, alert }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? "bg-[#C0573B]/10 border-[#C0573B]/30" : "bg-white border-[#E7DFD3]"}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-[#A8957B] mb-1">{icon}{label}</div>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

function OrdersTab({ orders, onChanged }) {
  const [confirmId, setConfirmId] = useState("");
  const [msg, setMsg] = useState("");

  const updateStatus = async (id, status) => { await api.updateOrderStatus(id, status); onChanged(); };
  const confirmPayment = async () => {
    try {
      await api.confirmPayment(confirmId);
      setMsg("تم تأكيد الدفع بنجاح");
      setConfirmId("");
      onChanged();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E7DFD3] rounded-xl p-3">
        <div className="flex gap-2">
          <input value={confirmId} onChange={(e) => setConfirmId(e.target.value)} placeholder="أدخل رقم الطلب لتأكيد استلام الدفع" className="flex-1 text-sm border border-[#E7DFD3] rounded-lg px-3 py-2 outline-none" />
          <button onClick={confirmPayment} className="bg-[#3D7A4D] text-white text-xs px-3 rounded-lg font-medium">تأكيد الدفع</button>
        </div>
        {msg && <p className="text-xs text-[#6B5B47] mt-2">{msg}</p>}
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-[#A8957B] text-center py-10">لا توجد طلبات بعد</p>
      ) : (
        orders.map((o) => (
          <div key={o.id} className="bg-white border border-[#E7DFD3] rounded-xl p-3 text-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="font-mono font-bold">{o.id}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.paymentConfirmed ? "bg-[#3D7A4D]/10 text-[#3D7A4D]" : "bg-[#D9A441]/15 text-[#9A7B1E]"}`}>{o.paymentConfirmed ? "تم تأكيد الدفع" : "بانتظار الدفع"}</span>
            </div>
            <p className="text-xs text-[#6B5B47]">{o.customer_name} · {o.customer_phone} · {o.customer_city}</p>
            <ul className="text-xs text-[#A8957B] my-1.5 list-disc pr-4">
              {o.items.map((i, idx) => <li key={idx}>{i.name} ({i.size}) × {i.qty}</li>)}
            </ul>
            <p className="font-bold text-[#8B6F47] mb-2">{fmt(o.total)}</p>
            <div className="flex items-center gap-2">
              <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} className="text-xs border border-[#E7DFD3] rounded-lg px-2 py-1.5 outline-none">
                <option>قيد المعالجة</option>
                <option>تم الشحن</option>
                <option>تم التسليم</option>
              </select>
              <a href={api.invoiceUrl(o.id)} target="_blank" rel="noreferrer" className="text-xs text-[#6B5B47] underline flex items-center gap-1"><FileText size={12} /> الفاتورة</a>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ProductsTab({ products, onChanged }) {
  const [editing, setEditing] = useState(null);

  const remove = async (id) => { await api.deleteProduct(id); onChanged(); };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setEditing({ id: null, name: "", category: "ملابس", price: 0, color: "", sizes: [], stock: 0, images: ["https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600"] })}
        className="w-full bg-[#8B6F47] text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> إضافة منتج جديد
      </button>

      {products.map((p) => (
        <div key={p.id} className="bg-white border border-[#E7DFD3] rounded-xl p-3 flex gap-3">
          <img src={p.images[0]} className="w-14 h-14 rounded-lg object-cover" />
          <div className="flex-1">
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-xs text-[#A8957B]">{fmt(p.price)} · مخزون: {p.stock}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setEditing(p)} className="text-xs text-[#8B6F47] underline">تعديل</button>
            <button onClick={() => remove(p.id)} className="text-[#C0573B]"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      {editing && <ProductEditModal product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </div>
  );
}

function ProductEditModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState(product);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      if (form.id) await api.updateProduct(form.id, form);
      else await api.createProduct(form);
      onSaved();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[#E7DFD3]">
          <button onClick={onClose}><ChevronLeft size={18} /></button>
          <h3 className="font-bold">{form.id ? "تعديل المنتج" : "منتج جديد"}</h3>
          <span className="w-4" />
        </div>
        <div className="p-4 space-y-3">
          {error && <p className="text-xs text-[#C0573B] bg-[#C0573B]/10 rounded-lg p-2">{error}</p>}
          <Field label="اسم المنتج" value={form.name} onChange={(v) => set("name", v)} placeholder="مثال: فستان سهرة" />
          <div>
            <label className="text-xs font-medium text-[#6B5B47] block mb-1">التصنيف</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full border border-[#E7DFD3] rounded-lg px-3 py-2 text-sm outline-none">
              {CATEGORIES.filter((c) => c !== "الكل").map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Field label="السعر (ر.ي)" value={form.price} onChange={(v) => set("price", Number(v) || 0)} placeholder="0" />
          <Field label="اللون" value={form.color} onChange={(v) => set("color", v)} placeholder="مثال: أسود" />
          <Field label="المقاسات (مفصولة بفاصلة)" value={(form.sizes || []).join(",")} onChange={(v) => set("sizes", v.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="S,M,L" />
          <Field label="الكمية المتوفرة" value={form.stock} onChange={(v) => set("stock", Number(v) || 0)} placeholder="0" />
          <Field label="رابط الصورة" value={form.images?.[0] || ""} onChange={(v) => set("images", [v])} placeholder="https://..." />

          <button onClick={save} disabled={!form.name || !form.price} className="w-full bg-[#8B6F47] disabled:bg-[#D8CBB8] text-white py-3 rounded-xl text-sm font-medium mt-2">حفظ المنتج</button>
        </div>
      </div>
    </div>
  );
}
