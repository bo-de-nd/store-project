import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search, Heart, ShoppingBag, X, Plus, Minus, Star, Package, TrendingUp, Bell,
  ChevronLeft, Check, Trash2, Lock, FileText, ListOrdered, Share2, Upload,
  Image as ImageIcon, Tag, Settings as SettingsIcon, LayoutGrid, LogOut, Palette,
} from "lucide-react";
import { api } from "./api";

const ADMIN_PATH = "/store-admin-control";
const fmt = (n) => Number(n || 0).toLocaleString("ar") + " ر.ي";
const SHIPPING_BY_CITY = { "صنعاء": 1000, "عدن": 2500, "تعز": 2000, "أخرى": 3000 };

function stockLabel(stock) {
  if (stock === 0) return { text: "نفذ من المخزون", tone: "out" };
  if (stock <= 3) return { text: `كمية محدودة (${stock})`, tone: "low" };
  return { text: "متوفر", tone: "ok" };
}

const isAdminRoute = () => window.location.pathname.startsWith(ADMIN_PATH);

export default function App() {
  const [route, setRoute] = useState(isAdminRoute() ? "admin" : "shop");
  const [settings, setSettings] = useState({ store_name: "متجري", store_logo: "", whatsapp: "", primary_color: "#1D4ED8" });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem("admin_token") || "");

  const loadShopData = () => {
    setLoading(true);
    Promise.all([api.getProducts(), api.getSettings(), api.getCategories()])
      .then(([p, s, c]) => { setProducts(p); setSettings(s); setCategories(c); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadShopData();
    // فتح منتج مباشرة إذا جاء الرابط من مشاركة (?product=ID)
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("product");
    if (pid) {
      api.getProducts().then((list) => {
        const found = list.find((p) => p.id === pid);
        if (found) setProductOpen(found);
      });
    }
  }, []);

  useEffect(() => {
    if (settings.primary_color) {
      document.documentElement.style.setProperty("--brand", settings.primary_color);
    }
  }, [settings.primary_color]);

  return (
    <div dir="rtl" className="min-h-screen bg-white text-[#0F172A] font-sans" style={{ "--brand": settings.primary_color || "#1D4ED8" }}>
      {route !== "admin" && (
        <>
          <TopBar settings={settings} route={route} setRoute={setRoute} cartCount={cart.reduce((s, c) => s + c.qty, 0)} onCartClick={() => setCartOpen(true)} />
          {error && <div className="bg-red-50 text-red-600 text-xs text-center py-2 px-4">تعذر الاتصال بالخادم: {error}</div>}

          {route === "shop" && (
            <ShopView products={products} categories={categories} loading={loading} favorites={favorites} setFavorites={setFavorites} onOpenProduct={setProductOpen} />
          )}
          {route === "myorders" && <MyOrdersView />}

          {productOpen && (
            <ProductModal
              product={productOpen}
              settings={settings}
              onClose={() => { setProductOpen(null); window.history.replaceState({}, "", "/"); }}
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

          {cartOpen && <CartDrawer cart={cart} products={products} setCart={setCart} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />}

          {checkoutOpen && (
            <CheckoutModal cart={cart} products={products} settings={settings} onClose={() => setCheckoutOpen(false)} onConfirmed={() => { setCart([]); setCheckoutOpen(false); loadShopData(); }} />
          )}

          <footer className="text-center text-[11px] text-slate-400 py-6">
            {settings.store_name} · تجربة تسوق منظمة عبر واتساب
          </footer>
        </>
      )}

      {route === "admin" &&
        (adminToken ? (
          <AdminView token={adminToken} settings={settings} onSettingsChanged={loadShopData} onLogout={() => { localStorage.removeItem("admin_token"); setAdminToken(""); }} onProductsChanged={loadShopData} />
        ) : (
          <AdminLogin onLogin={(t) => { localStorage.setItem("admin_token", t); setAdminToken(t); }} />
        ))}
    </div>
  );
}

function Logo({ settings, size = 36 }) {
  if (settings.store_logo) {
    return <img src={api.fileUrl(settings.store_logo)} alt={settings.store_name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-[var(--brand)] text-white flex items-center justify-center font-bold" style={{ width: size, height: size }}>
      {settings.store_name?.[0] || "م"}
    </div>
  );
}

function TopBar({ settings, route, setRoute, cartCount, onCartClick }) {
  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <button className="flex items-center gap-2" onClick={() => setRoute("shop")}>
          <Logo settings={settings} />
          <span className="font-bold text-lg tracking-tight">{settings.store_name}</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setRoute("myorders")} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center gap-1">
            <ListOrdered size={13} /> طلباتي
          </button>
          {route === "shop" && (
            <button onClick={onCartClick} className="relative w-9 h-9 rounded-full bg-[var(--brand)] text-white flex items-center justify-center">
              <ShoppingBag size={16} />
              {cartCount > 0 && <span className="absolute -top-1 -left-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopView({ products, categories, loading, favorites, setFavorites, onOpenProduct }) {
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

  if (loading) return <div className="text-center py-20 text-sm text-slate-400">جاري تحميل المنتجات...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      <div className="relative mb-4">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن منتج..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-9 pl-3 text-sm outline-none focus:border-[var(--brand)]" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 -mx-1 px-1">
        <button onClick={() => setCat("الكل")} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${cat === "الكل" ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-slate-600 border-slate-200"}`}>الكل</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCat(c.name)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${cat === c.name ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-slate-600 border-slate-200"}`}>{c.name}</button>
        ))}
      </div>

      <div className="flex justify-end mb-3">
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
          <option value="default">الترتيب الافتراضي</option>
          <option value="price_asc">السعر: من الأقل</option>
          <option value="price_desc">السعر: من الأعلى</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">لا توجد منتجات مطابقة</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const sl = stockLabel(p.stock);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
                <div className="relative cursor-pointer" onClick={() => onOpenProduct(p)}>
                  <img src={api.fileUrl(p.images[0])} alt={p.name} className="w-full h-32 sm:h-40 object-cover" />
                  <button onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }} className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                    <Heart size={14} className={favorites.includes(p.id) ? "fill-rose-500 text-rose-500" : "text-[var(--brand)]"} />
                  </button>
                  {sl.tone !== "ok" && <span className={`absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full ${sl.tone === "out" ? "bg-slate-800/80 text-white" : "bg-rose-500 text-white"}`}>{sl.text}</span>}
                </div>
                <div className="p-2.5 flex flex-col gap-1 flex-1 cursor-pointer" onClick={() => onOpenProduct(p)}>
                  <span className="text-xs font-medium leading-snug line-clamp-2">{p.name}</span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Star size={10} className="fill-amber-400 text-amber-400" /> {p.rating} ({p.reviews})
                  </div>
                  <span className="text-sm font-bold text-[var(--brand)] mt-auto">{fmt(p.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductModal({ product, settings, onClose, onAddToCart }) {
  const [size, setSize] = useState(product.sizes[0]);
  const [qty, setQty] = useState(1);
  const [shared, setShared] = useState(false);
  const sl = stockLabel(product.stock);
  const disabled = product.stock === 0;

  const share = () => {
    const link = api.shareUrl(product.id);
    const text = `شاهد هذا المنتج: ${product.name} - ${fmt(product.price)}\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={api.fileUrl(product.images[0])} className="w-full h-64 object-cover" alt={product.name} />
          <button onClick={onClose} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <h3 className="font-bold text-lg">{product.name}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Star size={12} className="fill-amber-400 text-amber-400" /> {product.rating} · {product.reviews} تقييم
          </div>
          <p className="text-xl font-bold text-[var(--brand)]">{fmt(product.price)}</p>
          <span className={`inline-block text-xs px-2 py-1 rounded-full ${sl.tone === "out" ? "bg-slate-100" : sl.tone === "low" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{sl.text}</span>

          {product.sizes?.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5 text-slate-500">المقاس</p>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={`px-3 py-1.5 rounded-lg text-xs border ${size === s ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "border-slate-200"}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-slate-500">الكمية</p>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-1">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-1.5"><Minus size={12} /></button>
              <span className="text-sm w-5 text-center">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="p-1.5"><Plus size={12} /></button>
            </div>
          </div>

          <button disabled={disabled} onClick={() => onAddToCart({ id: product.id, qty, size })} className="w-full bg-[var(--brand)] disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium mt-2">
            {disabled ? "غير متوفر حاليًا" : "إضافة إلى السلة"}
          </button>

          <button onClick={share} className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded-xl py-2.5">
            <Share2 size={13} /> {shared ? "تم النسخ والمشاركة" : "مشاركة المنتج عبر واتساب"}
          </button>
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
      <div className="bg-white w-full sm:w-96 h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold">سلة المشتريات</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center mt-10">السلة فارغة</p>
          ) : (
            items.map((i, idx) => (
              <div key={idx} className="flex gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <img src={api.fileUrl(i.product.images[0])} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{i.product.name}</p>
                  <p className="text-xs text-slate-400">المقاس: {i.size} · الكمية: {i.qty}</p>
                  <p className="text-sm font-bold text-[var(--brand)] mt-1">{fmt(i.product.price * i.qty)}</p>
                </div>
                <button onClick={() => setCart((c) => c.filter((_, x) => x !== idx))} className="text-rose-500"><Trash2 size={15} /></button>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="flex justify-between text-sm font-bold"><span>الإجمالي</span><span>{fmt(total)}</span></div>
            <button onClick={onCheckout} className="w-full bg-[var(--brand)] text-white py-3 rounded-xl text-sm font-medium">إتمام الطلب</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({ cart, products, settings, onClose, onConfirmed }) {
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
        customerName: name, customerPhone: phone, customerCity: city, customerAddress: address,
        items: items.map((i) => ({ id: i.id, qty: i.qty, size: i.size })), shipping,
      });
      setResult(res);
      onConfirmed();
      // توجيه مباشر وتلقائي لواتساب صاحبة المتجر
      window.location.href = res.whatsappLink;
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
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3"><Check size={26} /></div>
          <h3 className="font-bold text-lg mb-1">تم إنشاء طلبك</h3>
          <p className="text-sm text-slate-400 mb-1">رقم الطلب</p>
          <p className="font-mono font-bold text-lg mb-4 tracking-wide">{result.order.id}</p>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">يتم تحويلك الآن إلى واتساب {settings.store_name} لإتمام الدفع عبر الكريمي.</p>
          <a href={result.whatsappLink} className="block bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium mb-2">فتح واتساب يدويًا</a>
          <button onClick={onClose} className="text-xs text-slate-400 underline">إغلاق</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold">بيانات الشحن</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2">{error}</p>}
          <Field label="الاسم الكامل" value={name} onChange={setName} placeholder="مثال: سارة أحمد" />
          <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="7xxxxxxxx" />
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">المدينة</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
              {Object.keys(SHIPPING_BY_CITY).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="العنوان التفصيلي" value={address} onChange={setAddress} placeholder="الحي، الشارع، أقرب نقطة دالة" />

          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1 mt-2">
            <Row label="المجموع الفرعي" value={fmt(subtotal)} />
            <Row label="رسوم الشحن" value={fmt(shipping)} />
            <Row label="الإجمالي" value={fmt(total)} bold />
          </div>

          <button disabled={!canSubmit} onClick={submit} className="w-full bg-[var(--brand)] disabled:bg-slate-200 text-white py-3 rounded-xl text-sm font-medium mt-2">
            {submitting ? "جاري الإرسال..." : "تأكيد الطلب والتحويل لواتساب"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
    </div>
  );
}

function Row({ label, value, bold }) {
  return <div className={`flex justify-between ${bold ? "font-bold text-[var(--brand)]" : "text-slate-500"}`}><span>{label}</span><span>{value}</span></div>;
}

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
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="أدخل رقم هاتفك" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
        <button onClick={search} className="bg-[var(--brand)] text-white text-xs px-4 rounded-lg">بحث</button>
      </div>

      {loading && <p className="text-center text-sm text-slate-400">جاري البحث...</p>}
      {orders && orders.length === 0 && <p className="text-center text-sm text-slate-400">لا توجد طلبات بهذا الرقم</p>}

      <div className="space-y-3">
        {orders?.map((o) => (
          <div key={o.id} className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 text-sm">
            <div className="flex justify-between mb-1">
              <span className="font-mono font-bold">{o.id}</span>
              <span className="text-xs text-[var(--brand)]">{o.status}</span>
            </div>
            <ul className="text-xs text-slate-400 list-disc pr-4 mb-1">
              {o.items.map((i, idx) => <li key={idx}>{i.name} ({i.size}) × {i.qty}</li>)}
            </ul>
            <p className="font-bold text-[var(--brand)]">{fmt(o.total)}</p>
            <a href={api.invoiceUrl(o.id)} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline flex items-center gap-1 mt-1 w-fit">
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-xs w-full px-4 py-10 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
        <Lock size={28} className="mx-auto mb-3 text-[var(--brand)]" />
        <h2 className="font-bold text-lg mb-4">دخول لوحة التحكم</h2>
        {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2 mb-3">{error}</p>}
        <div className="space-y-3 text-right">
          <Field label="اسم المستخدم" value={username} onChange={setUsername} />
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">كلمة المرور</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>
        <button onClick={submit} disabled={loading} className="w-full bg-[var(--brand)] text-white py-2.5 rounded-xl text-sm font-medium mt-4">{loading ? "..." : "دخول"}</button>
      </div>
    </div>
  );
}

function AdminView({ token, settings, onLogout, onProductsChanged, onSettingsChanged }) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [authError, setAuthError] = useState(false);

  const refreshAll = () => {
    Promise.all([api.getAllOrders(), api.getProducts(), api.getStats(), api.getCategories()])
      .then(([o, p, s, c]) => { setOrders(o); setProducts(p); setStats(s); setCategories(c); })
      .catch((e) => { if (e.message.includes("غير مصرح") || e.message.includes("منتهية")) setAuthError(true); });
  };

  useEffect(() => { refreshAll(); }, []);

  if (authError) { onLogout(); return null; }

  const tabs = [
    ["orders", "الطلبات", ListOrdered],
    ["products", "المنتجات", Package],
    ["categories", "التصنيفات", Tag],
    ["settings", "الإعدادات", SettingsIcon],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo settings={settings} size={32} />
            <span className="font-bold">لوحة تحكم {settings.store_name}</span>
          </div>
          <button onClick={onLogout} className="text-xs text-rose-600 flex items-center gap-1"><LogOut size={13} /> خروج</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            <StatCard label="مبيعات اليوم" value={fmt(stats.todaySales)} icon={<TrendingUp size={14} />} />
            <StatCard label="مبيعات الشهر" value={fmt(stats.monthSales)} icon={<TrendingUp size={14} />} />
            <StatCard label="إجمالي المبيعات" value={fmt(stats.totalSales)} icon={<Package size={14} />} />
            <StatCard label="تنبيهات مخزون" value={`${stats.lowStock.length + stats.outOfStock.length}`} icon={<Bell size={14} />} alert={stats.lowStock.length + stats.outOfStock.length > 0} />
          </div>
        )}

        {stats?.topProducts?.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl p-3 mb-5">
            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><TrendingUp size={13} /> الأكثر مبيعًا</p>
            <div className="flex flex-wrap gap-2">
              {stats.topProducts.map((t, i) => (
                <span key={i} className="text-xs bg-[var(--brand)]/10 text-[var(--brand)] px-2.5 py-1 rounded-full">{t.name} × {t.qty}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-1 mb-4 border-b border-slate-200 overflow-x-auto">
          {tabs.map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 shrink-0 ${tab === k ? "border-[var(--brand)] text-[var(--brand)]" : "border-transparent text-slate-400"}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === "orders" && <OrdersTab orders={orders} onChanged={refreshAll} />}
        {tab === "products" && <ProductsTab products={products} categories={categories} onChanged={() => { refreshAll(); onProductsChanged(); }} />}
        {tab === "categories" && <CategoriesTab categories={categories} onChanged={refreshAll} />}
        {tab === "settings" && <SettingsTab settings={settings} onChanged={() => { refreshAll(); onSettingsChanged(); }} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, alert }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? "bg-rose-50 border-rose-200" : "bg-white border-slate-100"}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">{icon}{label}</div>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

function OrdersTab({ orders, onChanged }) {
  const [confirmId, setConfirmId] = useState("");
  const [msg, setMsg] = useState("");

  const updateStatus = async (id, status) => { await api.updateOrderStatus(id, status); onChanged(); };
  const confirmPayment = async () => {
    try { await api.confirmPayment(confirmId); setMsg("تم تأكيد الدفع بنجاح"); setConfirmId(""); onChanged(); }
    catch (e) { setMsg(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-100 rounded-xl p-3">
        <div className="flex gap-2">
          <input value={confirmId} onChange={(e) => setConfirmId(e.target.value)} placeholder="أدخل رقم الطلب لتأكيد استلام الدفع" className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none" />
          <button onClick={confirmPayment} className="bg-emerald-600 text-white text-xs px-3 rounded-lg font-medium">تأكيد الدفع</button>
        </div>
        {msg && <p className="text-xs text-slate-500 mt-2">{msg}</p>}
      </div>

      {orders.length === 0 ? <p className="text-sm text-slate-400 text-center py-10">لا توجد طلبات بعد</p> : orders.map((o) => (
        <div key={o.id} className="bg-white border border-slate-100 rounded-xl p-3 text-sm">
          <div className="flex justify-between items-start mb-1">
            <span className="font-mono font-bold">{o.id}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.paymentConfirmed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{o.paymentConfirmed ? "تم تأكيد الدفع" : "بانتظار الدفع"}</span>
          </div>
          <p className="text-xs text-slate-500">{o.customer_name} · {o.customer_phone} · {o.customer_city}</p>
          <ul className="text-xs text-slate-400 my-1.5 list-disc pr-4">{o.items.map((i, idx) => <li key={idx}>{i.name} ({i.size}) × {i.qty}</li>)}</ul>
          <p className="font-bold text-[var(--brand)] mb-2">{fmt(o.total)}</p>
          <div className="flex items-center gap-2">
            <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
              <option>قيد المعالجة</option><option>تم الشحن</option><option>تم التسليم</option>
            </select>
            <a href={api.invoiceUrl(o.id)} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline flex items-center gap-1"><FileText size={12} /> الفاتورة</a>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoriesTab({ categories, onChanged }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    try { await api.createCategory(name); setName(""); onChanged(); } catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    try { await api.deleteCategory(id); onChanged(); } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-100 rounded-xl p-3">
        {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم التصنيف الجديد، مثال: حلويات" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
          <button onClick={add} className="bg-[var(--brand)] text-white text-xs px-4 rounded-lg flex items-center gap-1"><Plus size={13} /> إضافة</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-full pr-3 pl-1.5 py-1 text-sm flex items-center gap-2">
            <LayoutGrid size={13} className="text-[var(--brand)]" /> {c.name}
            <button onClick={() => remove(c.id)} className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center"><X size={11} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ settings, onChanged }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileRef = useRef();

  useEffect(() => setForm(settings), [settings]);

  const uploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await api.uploadImage(file);
      setForm((f) => ({ ...f, store_logo: res.url }));
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.updateSettings(form);
      setSuccess(true);
      onChanged();
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 max-w-md space-y-4">
      {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2">{error}</p>}
      {success && <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg p-2">تم الحفظ بنجاح</p>}

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1.5">شعار المتجر</label>
        <div className="flex items-center gap-3">
          {form.store_logo ? <img src={api.fileUrl(form.store_logo)} className="w-14 h-14 rounded-full object-cover border" /> : <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center"><ImageIcon size={20} className="text-slate-400" /></div>}
          <button onClick={() => fileRef.current.click()} className="text-xs border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-1.5"><Upload size={13} /> رفع شعار</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
        </div>
      </div>

      <Field label="اسم المتجر" value={form.store_name} onChange={(v) => setForm((f) => ({ ...f, store_name: v }))} />
      <Field label="رقم واتساب المتجر (بدون +)" value={form.whatsapp} onChange={(v) => setForm((f) => ({ ...f, whatsapp: v }))} placeholder="9677xxxxxxx" />

      <div>
        <label className="text-xs font-medium text-slate-500 block mb-1.5 flex items-center gap-1"><Palette size={13} /> اللون الرئيسي</label>
        <div className="flex items-center gap-2">
          <input type="color" value={form.primary_color || "#1D4ED8"} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-10 h-10 rounded-lg border border-slate-200" />
          <span className="text-xs text-slate-400">{form.primary_color}</span>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full bg-[var(--brand)] text-white py-2.5 rounded-xl text-sm font-medium">{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</button>
    </div>
  );
}

function ProductsTab({ products, categories, onChanged }) {
  const [editing, setEditing] = useState(null);
  const remove = async (id) => { await api.deleteProduct(id); onChanged(); };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setEditing({ id: null, name: "", category: categories[0]?.name || "", price: 0, color: "", sizes: [], stock: 0, images: [] })}
        className="w-full bg-[var(--brand)] text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> إضافة منتج جديد
      </button>

      {products.map((p) => (
        <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-3 flex gap-3">
          {p.images[0] ? <img src={api.fileUrl(p.images[0])} className="w-14 h-14 rounded-lg object-cover" /> : <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center"><ImageIcon size={18} className="text-slate-300" /></div>}
          <div className="flex-1">
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-xs text-slate-400">{fmt(p.price)} · مخزون: {p.stock} · {p.category}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setEditing(p)} className="text-xs text-[var(--brand)] underline">تعديل</button>
            <button onClick={() => remove(p.id)} className="text-rose-500"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}

      {editing && <ProductEditModal product={editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </div>
  );
}

function ProductEditModal({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(product);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uploadProductImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadImage(file);
      set("images", [res.url]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

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
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <button onClick={onClose}><ChevronLeft size={18} /></button>
          <h3 className="font-bold">{form.id ? "تعديل المنتج" : "منتج جديد"}</h3>
          <span className="w-4" />
        </div>
        <div className="p-4 space-y-3">
          {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-lg p-2">{error}</p>}

          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">صورة المنتج</label>
            <div className="flex items-center gap-3">
              {form.images?.[0] ? <img src={api.fileUrl(form.images[0])} className="w-16 h-16 rounded-lg object-cover border" /> : <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center"><ImageIcon size={20} className="text-slate-400" /></div>}
              <button onClick={() => fileRef.current.click()} disabled={uploading} className="text-xs border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-1.5"><Upload size={13} /> {uploading ? "جاري الرفع..." : "رفع صورة من الجهاز"}</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadProductImage} />
            </div>
          </div>

          <Field label="اسم المنتج" value={form.name} onChange={(v) => set("name", v)} placeholder="مثال: فستان سهرة" />
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">التصنيف</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <Field label="السعر (ر.ي)" value={form.price} onChange={(v) => set("price", Number(v) || 0)} placeholder="0" />
          <Field label="اللون" value={form.color} onChange={(v) => set("color", v)} placeholder="مثال: أسود" />
          <Field label="المقاسات (مفصولة بفاصلة)" value={(form.sizes || []).join(",")} onChange={(v) => set("sizes", v.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="S,M,L" />
          <Field label="الكمية المتوفرة" value={form.stock} onChange={(v) => set("stock", Number(v) || 0)} placeholder="0" />

          <button onClick={save} disabled={!form.name || !form.price} className="w-full bg-[var(--brand)] disabled:bg-slate-200 text-white py-3 rounded-xl text-sm font-medium mt-2">حفظ المنتج</button>
        </div>
      </div>
    </div>
  );
}
