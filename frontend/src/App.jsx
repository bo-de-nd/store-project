import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search, Heart, ShoppingBag, X, Plus, Minus, Star, Package, TrendingUp, Bell,
  ChevronLeft, ChevronRight, Check, Trash2, Lock, FileText, ListOrdered, Share2,
  Upload, Image as ImageIcon, Tag, Settings as SettingsIcon, LogOut, Palette,
  Truck, MapPin, Phone, User, ArrowRight, Sparkles, ShieldCheck, Clock, Grid,
} from "lucide-react";
import { api } from "./api";

const ADMIN_PATH = "/store-admin-control";
const fmt = (n) => Number(n || 0).toLocaleString("ar-SA") + " ر.ي";

function stockLabel(s) {
  if (s === 0) return { text: "نفذ من المخزون", tone: "out" };
  if (s <= 3)  return { text: `كمية محدودة (${s})`, tone: "low" };
  return { text: "متوفر", tone: "ok" };
}

/* ─────────────────────────────────────── SPLASH ─────────────── */
function SplashScreen({ settings, onDone }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 2200);
    const t2 = setTimeout(onDone, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] transition-opacity duration-500 ${hide ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <div className="flex flex-col items-center gap-5 animate-fadeIn">
        {settings.store_logo
          ? <img src={api.fileUrl(settings.store_logo)} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-2xl" />
          : <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-5xl font-bold text-white shadow-2xl">{settings.store_name?.[0] || "م"}</div>
        }
        <div className="text-center">
          <h1 className="text-white text-3xl font-extrabold tracking-tight drop-shadow">{settings.store_name || "متجري"}</h1>
          <p className="text-white/75 text-base mt-1 font-medium">تسوّق بسهولة وثقة 🛍️</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0ms" }}/>
          <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "150ms" }}/>
          <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "300ms" }}/>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── ROOT ───────────────── */
export default function App() {
  const isAdmin = window.location.pathname.startsWith(ADMIN_PATH);
  const [splashDone, setSplashDone]   = useState(isAdmin);
  const [route, setRoute]             = useState(isAdmin ? "admin" : "shop");
  const [settings, setSettings]       = useState({ store_name: "", store_logo: "", whatsapp: "", primary_color: "#1D4ED8" });
  const [categories, setCategories]   = useState([]);
  const [shippingZones, setShippingZones] = useState([]);
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [cart, setCart]               = useState([]);
  const [favorites, setFavorites]     = useState([]);
  const [cartOpen, setCartOpen]       = useState(false);
  const [productOpen, setProductOpen] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminToken, setAdminToken]   = useState(localStorage.getItem("admin_token") || "");

  const setBrand = (color) => {
    const c = color || "#1D4ED8";
    document.documentElement.style.setProperty("--brand", c);
    document.documentElement.style.setProperty("--brand-dark", shadeColor(c, -20));
  };

  function shadeColor(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, (n >> 16) + pct * 2.55 | 0));
    const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + pct * 2.55 | 0));
    const b = Math.min(255, Math.max(0, (n & 0xff) + pct * 2.55 | 0));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([api.getProducts(), api.getSettings(), api.getCategories(), api.getShippingZones()])
      .then(([p, s, c, sz]) => { setProducts(p); setSettings(s); setCategories(c); setShippingZones(sz); setBrand(s.primary_color); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAll();
    const pid = new URLSearchParams(window.location.search).get("product");
    if (pid) api.getProducts().then((list) => { const f = list.find(p => p.id === pid); if (f) setProductOpen(f); });
  }, []);

  const addToCart = (item) =>
    setCart(c => {
      const ex = c.find(x => x.id === item.id && x.size === item.size);
      return ex ? c.map(x => x === ex ? { ...x, qty: x.qty + item.qty } : x) : [...c, item];
    });

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 font-sans" style={{ "--brand": "#1D4ED8", "--brand-dark": "#1e3a8a" }}>
      {!splashDone && <SplashScreen settings={settings} onDone={() => setSplashDone(true)} />}

      {route !== "admin" && (
        <>
          <TopBar settings={settings} route={route} setRoute={setRoute} cartCount={cart.reduce((s, c) => s + c.qty, 0)} onCartClick={() => setCartOpen(true)} />
          {route === "shop"     && <ShopView products={products} categories={categories} loading={loading} favorites={favorites} setFavorites={setFavorites} onOpenProduct={setProductOpen} settings={settings} />}
          {route === "myorders" && <MyOrdersView />}

          {productOpen && (
            <ProductModal product={productOpen} settings={settings}
              onClose={() => { setProductOpen(null); window.history.replaceState({}, "", "/"); }}
              onAddToCart={(i) => { addToCart(i); setProductOpen(null); setCartOpen(true); }}
            />
          )}
          {cartOpen && <CartDrawer cart={cart} products={products} setCart={setCart} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />}
          {checkoutOpen && <CheckoutModal cart={cart} products={products} settings={settings} shippingZones={shippingZones}
            onClose={() => setCheckoutOpen(false)} onConfirmed={() => { setCart([]); setCheckoutOpen(false); loadAll(); }} />}

          <footer className="mt-16 bg-white border-t border-slate-100 py-8 text-center text-xs text-slate-400">
            <Logo settings={settings} size={32} className="mx-auto mb-2" />
            <p className="font-semibold text-slate-600 mb-1">{settings.store_name}</p>
            <p>تجربة تسوق منظمة ومريحة عبر واتساب</p>
          </footer>
        </>
      )}

      {route === "admin" && (adminToken
        ? <AdminView token={adminToken} settings={settings} categories={categories} shippingZones={shippingZones}
            onLogout={() => { localStorage.removeItem("admin_token"); setAdminToken(""); }}
            onChanged={loadAll} />
        : <AdminLogin onLogin={(t) => { localStorage.setItem("admin_token", t); setAdminToken(t); }} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────── LOGO ───────────────── */
function Logo({ settings, size = 36, className = "" }) {
  if (settings.store_logo)
    return <img src={api.fileUrl(settings.store_logo)} alt="" className={`rounded-full object-cover border-2 border-white/20 ${className}`} style={{ width: size, height: size }} />;
  return (
    <div className={`rounded-full bg-[var(--brand)] text-white flex items-center justify-center font-black ${className}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {settings.store_name?.[0] || "م"}
    </div>
  );
}

/* ─────────────────────────────────────── TOP BAR ───────────── */
function TopBar({ settings, route, setRoute, cartCount, onCartClick }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <header className={`sticky top-0 z-30 transition-shadow ${scrolled ? "shadow-md bg-white" : "bg-white/95 backdrop-blur"}`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <button className="flex items-center gap-2.5" onClick={() => setRoute("shop")}>
          <Logo settings={settings} size={38} />
          <span className="font-extrabold text-lg text-slate-800">{settings.store_name}</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setRoute("myorders")} className="hidden sm:flex text-xs items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)] transition">
            <ListOrdered size={13} /> طلباتي
          </button>
          <button onClick={onCartClick} className="relative w-9 h-9 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shadow-sm hover:shadow-md transition">
            <ShoppingBag size={17} />
            {cartCount > 0 && <span className="absolute -top-1 -left-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────── HERO ───────────────── */
function HeroBanner({ settings }) {
  return (
    <div className="bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-14 flex flex-col sm:flex-row items-center gap-8">
        <div className="flex-1 text-center sm:text-right">
          <p className="text-white/70 text-sm font-medium mb-2 tracking-wide uppercase">مرحبًا بك في</p>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-3">{settings.store_name || "متجري"}</h2>
          <p className="text-white/80 text-base mb-6">اكتشف أجمل المنتجات، واطلب بسهولة عبر واتساب</p>
          <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
            <Pill icon={<ShieldCheck size={14}/>} text="جودة مضمونة" />
            <Pill icon={<Truck size={14}/>} text="توصيل لكل المحافظات" />
            <Pill icon={<Clock size={14}/>} text="استجابة سريعة" />
          </div>
        </div>
        <div className="shrink-0">
          <Logo settings={settings} size={110} className="shadow-2xl !border-4 !border-white/30" />
        </div>
      </div>
    </div>
  );
}
function Pill({ icon, text }) {
  return (
    <span className="flex items-center gap-1.5 bg-white/15 text-white/90 text-xs px-3 py-1.5 rounded-full">
      {icon}{text}
    </span>
  );
}

/* ─────────────────────────────────────── SHOP VIEW ─────────── */
function ShopView({ products, categories, loading, favorites, setFavorites, onOpenProduct, settings }) {
  const [query,    setQuery]    = useState("");
  const [cat,      setCat]      = useState("الكل");
  const [sort,     setSort]     = useState("default");
  const [showFavs, setShowFavs] = useState(false);
  const catRef = useRef(null);

  const filtered = useMemo(() => {
    let list = products.filter(p =>
      (cat === "الكل" || p.category === cat) &&
      p.name.includes(query) &&
      (!showFavs || favorites.includes(p.id))
    );
    if (sort === "asc")  list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, query, cat, sort, showFavs, favorites]);

  const toggleFav = (id) => setFavorites(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  return (
    <div>
      <HeroBanner settings={settings} />

      {/* شريط البحث */}
      <div className="max-w-6xl mx-auto px-4 -mt-5 mb-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث عن أي منتج..."
              className="w-full pr-9 pl-3 py-2.5 text-sm rounded-xl outline-none bg-slate-50 focus:bg-white border border-transparent focus:border-[var(--brand)] transition" />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 outline-none bg-slate-50 shrink-0">
            <option value="default">الترتيب</option>
            <option value="asc">سعر ↑</option>
            <option value="desc">سعر ↓</option>
          </select>
          <button onClick={() => setShowFavs(v => !v)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition ${showFavs ? "bg-rose-50 border-rose-200 text-rose-500" : "border-slate-200 text-slate-400"}`}>
            <Heart size={16} className={showFavs ? "fill-rose-500" : ""} />
          </button>
        </div>
      </div>

      {/* التصنيفات */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <div ref={catRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {["الكل", ...categories.map(c => c.name)].map(name => (
            <button key={name} onClick={() => setCat(name)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition whitespace-nowrap
                ${cat === name ? "bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-[var(--brand)] hover:text-[var(--brand)]"}`}>
              {name === "الكل" && <Grid size={13} />}
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* المنتجات */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Package size={48} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد منتجات مطابقة</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">{filtered.length} منتج</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} isFav={favorites.includes(p.id)} onToggleFav={() => toggleFav(p.id)} onClick={() => onOpenProduct(p)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-slate-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-4 bg-slate-100 rounded w-1/3" />
      </div>
    </div>
  );
}

function ProductCard({ product, isFav, onToggleFav, onClick }) {
  const sl = stockLabel(product.stock);
  return (
    <div className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
      <div className="relative overflow-hidden" onClick={onClick}>
        <img src={api.fileUrl(product.images[0])} alt={product.name}
          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
        <button onClick={e => { e.stopPropagation(); onToggleFav(); }}
          className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow transition hover:scale-110">
          <Heart size={15} className={isFav ? "fill-rose-500 text-rose-500" : "text-slate-400"} />
        </button>
        {sl.tone !== "ok" && (
          <span className={`absolute bottom-2 right-2 text-[10px] px-2.5 py-1 rounded-full font-semibold
            ${sl.tone === "out" ? "bg-slate-800/80 text-white" : "bg-amber-400 text-amber-900"}`}>
            {sl.text}
          </span>
        )}
        {product.stock > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2 opacity-0 group-hover:opacity-100 transition">
            <span className="bg-[var(--brand)] text-white text-xs px-3 py-1 rounded-full shadow font-medium" onClick={onClick}>
              عرض التفاصيل
            </span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1" onClick={onClick}>
        <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{product.name}</p>
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={11} className={i < Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
          ))}
          <span className="text-[10px] text-slate-400 mr-1">({product.reviews})</span>
        </div>
        <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-50">
          <span className="text-base font-black text-[var(--brand)]">{fmt(product.price)}</span>
          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{product.category}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── PRODUCT MODAL ─────── */
function ProductModal({ product, settings, onClose, onAddToCart }) {
  const [size,   setSize]   = useState(product.sizes?.[0] || "");
  const [qty,    setQty]    = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const sl      = stockLabel(product.stock);
  const disabled = product.stock === 0;

  const share = () => {
    const link = api.shareUrl(product.id);
    const text = `✨ ${product.name}\n💰 ${fmt(product.price)}\n🔗 ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* صور المنتج */}
        <div className="relative">
          <img src={api.fileUrl(product.images[imgIdx] || product.images[0])} alt={product.name} className="w-full h-72 sm:h-80 object-cover sm:rounded-t-3xl" />
          <button onClick={onClose} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow"><X size={18} /></button>
          {product.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {product.images.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)} className={`w-2 h-2 rounded-full transition ${i === imgIdx ? "bg-white" : "bg-white/50"}`} />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-black text-xl text-slate-800 leading-tight">{product.name}</h3>
            <span className="text-xl font-black text-[var(--brand)] shrink-0">{fmt(product.price)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < Math.round(product.rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}
              <span className="text-xs text-slate-400 mr-1">{product.rating} · {product.reviews} تقييم</span>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sl.tone === "out" ? "bg-slate-100 text-slate-500" : sl.tone === "low" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{sl.text}</span>
          </div>

          {product.sizes?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">المقاس</p>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map(s => (
                  <button key={s} onClick={() => setSize(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition ${size === s ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "border-slate-200 text-slate-600 hover:border-[var(--brand)]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3">
            <span className="text-sm font-bold text-slate-700">الكمية</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:border-[var(--brand)] transition"><Minus size={14} /></button>
              <span className="text-lg font-black w-6 text-center">{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="w-9 h-9 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center"><Plus size={14} /></button>
            </div>
          </div>

          <div className="flex gap-2">
            <button disabled={disabled} onClick={() => onAddToCart({ id: product.id, qty, size })}
              className="flex-1 bg-[var(--brand)] disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md transition flex items-center justify-center gap-2">
              <ShoppingBag size={16} /> {disabled ? "غير متوفر" : "إضافة للسلة"}
            </button>
            <button onClick={share} className="w-12 h-12 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition">
              <Share2 size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── CART ───────────────── */
function CartDrawer({ cart, products, setCart, onClose, onCheckout }) {
  const items = cart.map(c => ({ ...c, product: products.find(p => p.id === c.id) })).filter(i => i.product);
  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex justify-end" onClick={onClose}>
      <div className="bg-white w-full sm:w-[400px] h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-lg">السلة <span className="text-sm font-normal text-slate-400">({items.length} منتج)</span></h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
              <p>سلتك فارغة</p>
            </div>
          ) : items.map((i, idx) => (
            <div key={idx} className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <img src={api.fileUrl(i.product.images[0])} className="w-16 h-16 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold line-clamp-1">{i.product.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">المقاس: {i.size} · الكمية: {i.qty}</p>
                <p className="text-sm font-black text-[var(--brand)] mt-1">{fmt(i.product.price * i.qty)}</p>
              </div>
              <button onClick={() => setCart(c => c.filter((_, x) => x !== idx))} className="text-rose-400 hover:text-rose-600 transition self-start mt-1"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">الإجمالي (قبل الشحن)</span>
              <span className="font-black text-lg text-[var(--brand)]">{fmt(total)}</span>
            </div>
            <button onClick={onCheckout} className="w-full bg-[var(--brand)] text-white py-3.5 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md transition flex items-center justify-center gap-2">
              إتمام الطلب <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── CHECKOUT ──────────── */
function CheckoutModal({ cart, products, settings, shippingZones, onClose, onConfirmed }) {
  const [form, setForm] = useState({ name: "", phone: "", city: shippingZones[0]?.city || "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [result, setResult]         = useState(null);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const items = cart.map(c => ({ ...c, product: products.find(p => p.id === c.id) })).filter(i => i.product);
  const subtotal  = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const zone      = shippingZones.find(z => z.city === form.city) || shippingZones.find(z => z.city === "أخرى") || { cost: 0 };
  const shipping  = zone.cost;
  const total     = subtotal + shipping;
  const canSubmit = form.name.trim() && form.phone.trim() && form.address.trim() && !submitting;

  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      const res = await api.createOrder({ customerName: form.name, customerPhone: form.phone, customerCity: form.city, customerAddress: form.address, items: items.map(i => ({ id: i.id, qty: i.qty, size: i.size })), shipping });
      setResult(res);
      onConfirmed();
      window.location.href = res.whatsappLink;
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  if (result) return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><Check size={28} className="text-emerald-500" /></div>
        <h3 className="font-black text-xl mb-1">تم تأكيد طلبك 🎉</h3>
        <p className="text-slate-400 text-sm mb-2">رقم الطلب</p>
        <p className="font-mono font-black text-2xl text-[var(--brand)] mb-4 tracking-widest">{result.order.id}</p>
        <p className="text-xs text-slate-500 mb-5">يتم تحويلك إلى واتساب {settings.store_name} لإتمام الدفع</p>
        <a href={result.whatsappLink} className="block w-full bg-emerald-500 text-white py-3.5 rounded-2xl text-sm font-bold mb-2">فتح واتساب</a>
        <button onClick={onClose} className="text-xs text-slate-400 underline">إغلاق</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-lg">بيانات الشحن</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-xl p-3">{error}</p>}

          <CField icon={<User size={15}/>} label="الاسم الكامل" value={form.name} onChange={v => setF("name", v)} placeholder="مثال: سارة أحمد" />
          <CField icon={<Phone size={15}/>} label="رقم الهاتف" value={form.phone} onChange={v => setF("phone", v)} placeholder="7xxxxxxxx" />

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5 flex items-center gap-1"><MapPin size={13}/>المدينة</label>
            <select value={form.city} onChange={e => setF("city", e.target.value)} className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)] transition bg-white">
              {shippingZones.map(z => (
                <option key={z.id} value={z.city}>{z.city} — {z.cost === 0 ? "مجاني" : fmt(z.cost)}</option>
              ))}
            </select>
          </div>
          <CField icon={<MapPin size={15}/>} label="العنوان التفصيلي" value={form.address} onChange={v => setF("address", v)} placeholder="الحي، الشارع، أقرب نقطة دالة" />

          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            {items.map((i, idx) => (
              <div key={idx} className="flex justify-between text-xs text-slate-500">
                <span>{i.product.name} × {i.qty}</span>
                <span>{fmt(i.product.price * i.qty)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
              <Row label="المجموع الفرعي" value={fmt(subtotal)} />
              <Row label="رسوم الشحن" value={shipping === 0 ? "مجاني 🎉" : fmt(shipping)} />
              <Row label="الإجمالي" value={fmt(total)} bold />
            </div>
          </div>

          <button disabled={!canSubmit} onClick={submit}
            className="w-full bg-[var(--brand)] disabled:bg-slate-200 text-white py-3.5 rounded-2xl text-sm font-bold shadow-sm hover:shadow-md transition flex items-center justify-center gap-2">
            {submitting ? "جاري الإرسال..." : <><Check size={16}/> تأكيد الطلب والانتقال لواتساب</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function CField({ icon, label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 block mb-1.5 flex items-center gap-1">{icon}{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)] transition bg-white" />
    </div>
  );
}
function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? "font-black text-[var(--brand)] text-base pt-1" : "text-sm text-slate-500"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────── MY ORDERS ─────────── */
function MyOrdersView() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = () => { if (!phone.trim()) return; setLoading(true); api.getOrdersByPhone(phone.trim()).then(setOrders).finally(() => setLoading(false)); };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h2 className="font-black text-2xl mb-1 text-center">طلباتي</h2>
      <p className="text-slate-400 text-sm text-center mb-6">ابحث برقم هاتفك لمتابعة طلباتك</p>
      <div className="flex gap-2 mb-6">
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="أدخل رقم الهاتف المستخدم في الطلب"
          className="flex-1 border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[var(--brand)]" />
        <button onClick={search} className="bg-[var(--brand)] text-white text-sm px-5 rounded-2xl font-bold">بحث</button>
      </div>
      {loading && <p className="text-center text-sm text-slate-400">جاري البحث...</p>}
      {orders && orders.length === 0 && <p className="text-center text-sm text-slate-400 py-10">لا توجد طلبات بهذا الرقم</p>}
      <div className="space-y-3">
        {orders?.map(o => (
          <div key={o.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono font-bold text-slate-700">{o.id}</span>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${o.status === "تم التسليم" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>{o.status}</span>
            </div>
            <ul className="text-xs text-slate-400 mb-2 space-y-0.5">
              {o.items.map((i, idx) => <li key={idx}>• {i.name} ({i.size}) × {i.qty}</li>)}
            </ul>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
              <span className="font-black text-[var(--brand)]">{fmt(o.total)}</span>
              <a href={api.invoiceUrl(o.id)} target="_blank" rel="noreferrer"
                className="text-xs text-slate-500 underline flex items-center gap-1 hover:text-[var(--brand)]">
                <FileText size={12}/> الفاتورة
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── ADMIN LOGIN ────────── */
function AdminLogin({ onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true); setErr("");
    try { const r = await api.login(u, p); onLogin(r.token); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xs p-8 shadow-2xl text-center">
        <Lock size={32} className="mx-auto mb-3 text-[var(--brand)]" />
        <h2 className="font-black text-xl mb-5">دخول الإدارة</h2>
        {err && <p className="text-xs text-rose-600 bg-rose-50 rounded-xl p-2.5 mb-3">{err}</p>}
        <div className="space-y-3 text-right mb-4">
          <CField label="اسم المستخدم" icon={<User size={13}/>} value={u} onChange={setU} placeholder="admin" />
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">كلمة المرور</label>
            <input type="password" value={p} onChange={e => setP(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
        </div>
        <button onClick={submit} disabled={loading} className="w-full bg-[var(--brand)] text-white py-3 rounded-2xl font-bold text-sm">
          {loading ? "..." : "دخول"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── ADMIN PANEL ────────── */
function AdminView({ settings, categories, shippingZones, onLogout, onChanged }) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [cats, setCats]       = useState(categories);
  const [zones, setZones]     = useState(shippingZones);
  const [stats, setStats]     = useState(null);
  const [authErr, setAuthErr] = useState(false);

  const refresh = () => {
    Promise.all([api.getAllOrders(), api.getProducts(), api.getStats(), api.getCategories(), api.getShippingZones()])
      .then(([o, p, s, c, z]) => { setOrders(o); setProducts(p); setStats(s); setCats(c); setZones(z); })
      .catch(e => { if (e.message.includes("غير مصرح") || e.message.includes("منتهية")) setAuthErr(true); });
  };

  useEffect(() => { refresh(); }, []);
  if (authErr) { onLogout(); return null; }

  const TABS = [["orders","الطلبات",ListOrdered],["products","المنتجات",Package],["categories","التصنيفات",Tag],["shipping","الشحن",Truck],["settings","الإعدادات",SettingsIcon]];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* رأس لوحة التحكم */}
      <div className="bg-[var(--brand)] text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo settings={settings} size={36} />
            <div>
              <p className="font-black text-base leading-tight">{settings.store_name}</p>
              <p className="text-white/60 text-[11px]">لوحة التحكم</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-2 rounded-full transition">
            <LogOut size={13}/> خروج
          </button>
        </div>
        {/* تبويبات */}
        <div className="max-w-6xl mx-auto px-2 flex gap-0 overflow-x-auto">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 shrink-0 transition whitespace-nowrap
                ${tab === k ? "border-white text-white" : "border-transparent text-white/60 hover:text-white/80"}`}>
              <Icon size={13}/>{label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {/* إحصائيات */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              ["مبيعات اليوم", fmt(stats.todaySales), TrendingUp, "blue"],
              ["مبيعات الشهر", fmt(stats.monthSales), TrendingUp, "indigo"],
              ["إجمالي المبيعات", fmt(stats.totalSales), Package, "violet"],
              ["تنبيهات مخزون", stats.lowStock.length + stats.outOfStock.length, Bell, stats.lowStock.length + stats.outOfStock.length > 0 ? "rose" : "slate"],
            ].map(([label, value, Icon, color]) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-xl bg-${color}-50 flex items-center justify-center mb-2`}>
                  <Icon size={15} className={`text-${color}-500`} />
                </div>
                <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
                <p className="font-black text-base text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        )}

        {stats?.topProducts?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
            <p className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1.5"><Sparkles size={13} className="text-amber-400"/> الأكثر مبيعًا</p>
            <div className="flex flex-wrap gap-2">
              {stats.topProducts.map((t, i) => (
                <span key={i} className="text-xs bg-[var(--brand)]/10 text-[var(--brand)] px-3 py-1.5 rounded-full font-semibold">#{i+1} {t.name} ({t.qty})</span>
              ))}
            </div>
          </div>
        )}

        {tab === "orders"     && <OrdersTab orders={orders} onChanged={refresh} />}
        {tab === "products"   && <ProductsTab products={products} categories={cats} onChanged={() => { refresh(); onChanged(); }} />}
        {tab === "categories" && <CategoriesTab categories={cats} onChanged={() => { refresh(); onChanged(); }} />}
        {tab === "shipping"   && <ShippingTab zones={zones} onChanged={() => { refresh(); onChanged(); }} />}
        {tab === "settings"   && <SettingsTab settings={settings} onChanged={() => { refresh(); onChanged(); }} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── ORDERS TAB ─────────── */
function OrdersTab({ orders, onChanged }) {
  const [confirmId, setConfirmId] = useState(""); const [msg, setMsg] = useState("");
  const updateStatus = async (id, status) => { await api.updateOrderStatus(id, status); onChanged(); };
  const confirm = async () => {
    try { await api.confirmPayment(confirmId); setMsg("✅ تم تأكيد الدفع"); setConfirmId(""); onChanged(); }
    catch (e) { setMsg("❌ " + e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p className="text-xs font-bold text-slate-500 mb-2">تأكيد استلام الدفع برقم الطلب</p>
        <div className="flex gap-2">
          <input value={confirmId} onChange={e => setConfirmId(e.target.value)} placeholder="ORD-XXXXX"
            className="flex-1 text-sm border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-[var(--brand)]" />
          <button onClick={confirm} className="bg-emerald-500 text-white text-xs px-4 rounded-xl font-bold">تأكيد</button>
        </div>
        {msg && <p className="text-xs text-slate-500 mt-2">{msg}</p>}
      </div>
      {orders.length === 0
        ? <p className="text-center text-slate-400 py-16">لا توجد طلبات بعد</p>
        : orders.map(o => (
          <div key={o.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-mono font-black text-slate-700">{o.id}</span>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${o.paymentConfirmed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                {o.paymentConfirmed ? "✓ تم الدفع" : "⏳ انتظار الدفع"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><User size={11}/>{o.customer_name} · {o.customer_phone} · {o.customer_city}</p>
            <ul className="text-xs text-slate-400 mb-2 space-y-0.5">
              {o.items.map((i, idx) => <li key={idx}>• {i.name} ({i.size}) × {i.qty}</li>)}
            </ul>
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <span className="font-black text-[var(--brand)]">{fmt(o.total)}</span>
              <div className="flex items-center gap-2">
                <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
                  <option>قيد المعالجة</option><option>تم الشحن</option><option>تم التسليم</option>
                </select>
                <a href={api.invoiceUrl(o.id)} target="_blank" rel="noreferrer"
                  className="text-xs text-slate-500 underline flex items-center gap-1"><FileText size={12}/> فاتورة</a>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

/* ─────────────────────────────────────── SHIPPING TAB ────────── */
function ShippingTab({ zones, onChanged }) {
  const [form, setForm] = useState({ city: "", cost: 0, notes: "" });
  const [editing, setEditing] = useState(null);
  const [error, setError]     = useState("");

  const add = async () => {
    if (!form.city.trim()) return;
    try { await api.createShippingZone(form); setForm({ city: "", cost: 0, notes: "" }); onChanged(); }
    catch (e) { setError(e.message); }
  };
  const save = async () => {
    try { await api.updateShippingZone(editing.id, editing); setEditing(null); onChanged(); }
    catch (e) { setError(e.message); }
  };
  const remove = async (id) => { await api.deleteShippingZone(id); onChanged(); };

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-xl p-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p className="text-sm font-black text-slate-700 mb-3 flex items-center gap-1.5"><Plus size={15}/> إضافة منطقة شحن جديدة</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">اسم المدينة</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="مثال: إب"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">رسوم الشحن (ر.ي) — 0 = مجاني</label>
            <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: Number(e.target.value) || 0 }))} min="0"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
        </div>
        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظة (اختياري) مثال: يشمل كل مناطق المحافظة"
          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)] mb-3" />
        <button onClick={add} className="bg-[var(--brand)] text-white text-sm px-5 py-2 rounded-xl font-bold">إضافة</button>
      </div>

      <div className="space-y-2">
        {zones.map(z => (
          <div key={z.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            {editing?.id === z.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={editing.city} onChange={e => setEditing(ev => ({ ...ev, city: e.target.value }))}
                    className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
                  <input type="number" value={editing.cost} onChange={e => setEditing(ev => ({ ...ev, cost: Number(e.target.value) || 0 }))} min="0"
                    className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
                </div>
                <input value={editing.notes} onChange={e => setEditing(ev => ({ ...ev, notes: e.target.value }))}
                  className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
                <div className="flex gap-2">
                  <button onClick={save} className="bg-emerald-500 text-white text-xs px-4 py-1.5 rounded-lg font-bold">حفظ</button>
                  <button onClick={() => setEditing(null)} className="border border-slate-200 text-xs px-4 py-1.5 rounded-lg">إلغاء</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-700 flex items-center gap-1.5"><MapPin size={13} className="text-[var(--brand)]"/>{z.city}</p>
                  <p className="text-sm font-black text-[var(--brand)] mt-0.5">{z.cost === 0 ? "مجاني 🎉" : fmt(z.cost)}</p>
                  {z.notes && <p className="text-xs text-slate-400 mt-0.5">{z.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing({ ...z })} className="text-xs text-[var(--brand)] underline">تعديل</button>
                  <button onClick={() => remove(z.id)} className="text-rose-500"><Trash2 size={14}/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── CATEGORIES TAB ─────── */
function CategoriesTab({ categories, onChanged }) {
  const [name, setName] = useState(""); const [error, setError] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    try { await api.createCategory(name); setName(""); onChanged(); } catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    try { await api.deleteCategory(id); onChanged(); } catch (e) { setError(e.message); }
  };
  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-xl p-3">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="اسم التصنيف الجديد"
            className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]" />
          <button onClick={add} className="bg-[var(--brand)] text-white text-sm px-5 rounded-xl font-bold flex items-center gap-1"><Plus size={14}/>إضافة</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(c => (
          <div key={c.id} className="bg-white border-2 border-slate-200 rounded-2xl pl-3 pr-2 py-2 flex items-center gap-2 shadow-sm">
            <Tag size={13} className="text-[var(--brand)]"/>
            <span className="text-sm font-semibold">{c.name}</span>
            <button onClick={() => remove(c.id)} className="w-5 h-5 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center hover:bg-rose-100 transition"><X size={11}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── SETTINGS TAB ────────── */
function SettingsTab({ settings, onChanged }) {
  const [form, setForm]     = useState(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const logoRef  = useRef(); const prodImgRef = useRef();

  useEffect(() => setForm(settings), [settings]);

  const uploadLogo = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const r = await api.uploadImage(file); setForm(f => ({ ...f, store_logo: r.url })); } catch {}
  };
  const save = async () => {
    setSaving(true); setMsg("");
    try { await api.updateSettings(form); setMsg("✅ تم الحفظ بنجاح"); onChanged(); }
    catch (e) { setMsg("❌ " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 max-w-md space-y-5">
      {msg && <p className="text-xs bg-slate-50 rounded-xl p-3">{msg}</p>}

      <div>
        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1"><ImageIcon size={12}/>شعار المتجر</p>
        <div className="flex items-center gap-3">
          {form.store_logo
            ? <img src={api.fileUrl(form.store_logo)} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200" />
            : <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center"><ImageIcon size={22} className="text-slate-300"/></div>
          }
          <button onClick={() => logoRef.current.click()} className="text-xs border-2 border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-1.5 font-semibold hover:border-[var(--brand)] transition">
            <Upload size={13}/> رفع شعار جديد
          </button>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
        </div>
      </div>

      <CField label="اسم المتجر" icon={<Sparkles size={13}/>} value={form.store_name} onChange={v => setForm(f => ({ ...f, store_name: v }))} />
      <CField label="رقم واتساب (بدون +)" icon={<Phone size={13}/>} value={form.whatsapp} onChange={v => setForm(f => ({ ...f, whatsapp: v }))} placeholder="9677xxxxxxx" />

      <div>
        <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Palette size={12}/>اللون الرئيسي للمنصة</p>
        <div className="flex items-center gap-3">
          <input type="color" value={form.primary_color || "#1D4ED8"} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
            className="w-12 h-12 rounded-xl cursor-pointer border-2 border-slate-200 p-0.5" />
          <div className="flex gap-2">
            {["#1D4ED8","#7C3AED","#059669","#DC2626","#D97706","#0891B2"].map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, primary_color: c }))}
                className="w-8 h-8 rounded-full border-2 transition hover:scale-110"
                style={{ background: c, borderColor: form.primary_color === c ? "#fff" : c, outline: form.primary_color === c ? `2px solid ${c}` : "none" }} />
            ))}
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full bg-[var(--brand)] text-white py-3.5 rounded-2xl font-bold text-sm hover:shadow-md transition">
        {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────── PRODUCTS TAB ────────── */
function ProductsTab({ products, categories, onChanged }) {
  const [editing, setEditing] = useState(null);
  const remove = async (id) => { await api.deleteProduct(id); onChanged(); };
  return (
    <div className="space-y-3">
      <button onClick={() => setEditing({ id: null, name: "", category: categories[0]?.name || "", price: 0, color: "", sizes: [], stock: 0, images: [] })}
        className="w-full bg-[var(--brand)] text-white py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition">
        <Plus size={15}/> إضافة منتج جديد
      </button>
      {products.map(p => (
        <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex gap-3 items-center">
          {p.images[0]
            ? <img src={api.fileUrl(p.images[0])} className="w-14 h-14 rounded-xl object-cover shrink-0" />
            : <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><ImageIcon size={18} className="text-slate-300"/></div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 line-clamp-1">{p.name}</p>
            <p className="text-xs text-slate-400">{fmt(p.price)} · مخزون: {p.stock} · {p.category}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditing(p)} className="text-xs text-[var(--brand)] font-bold border border-[var(--brand)]/30 px-3 py-1.5 rounded-lg hover:bg-[var(--brand)]/5 transition">تعديل</button>
            <button onClick={() => remove(p.id)} className="text-rose-500 border border-rose-200 p-1.5 rounded-lg hover:bg-rose-50 transition"><Trash2 size={13}/></button>
          </div>
        </div>
      ))}
      {editing && <ProductEditModal product={editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </div>
  );
}

function ProductEditModal({ product, categories, onClose, onSaved }) {
  const [form, setForm]       = useState(product);
  const [error, setError]     = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadImg = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try { const r = await api.uploadImage(file); set("images", [r.url]); }
    catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    try {
      if (form.id) await api.updateProduct(form.id, form);
      else await api.createProduct(form);
      onSaved();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><ChevronLeft size={16}/></button>
          <h3 className="font-black">{form.id ? "تعديل المنتج" : "منتج جديد"}</h3>
          <span className="w-8"/>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-xs text-rose-600 bg-rose-50 rounded-xl p-3">{error}</p>}

          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">صورة المنتج</p>
            <div className="flex items-center gap-3">
              {form.images?.[0]
                ? <img src={api.fileUrl(form.images[0])} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200"/>
                : <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center"><ImageIcon size={24} className="text-slate-300"/></div>
              }
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                className="text-xs border-2 border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-1.5 font-semibold hover:border-[var(--brand)] transition">
                <Upload size={13}/> {uploading ? "جاري الرفع..." : "رفع صورة"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImg}/>
            </div>
          </div>

          <CField label="اسم المنتج" icon={<Package size={13}/>} value={form.name} onChange={v => set("name", v)} placeholder="مثال: فستان سهرة" />
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5 flex items-center gap-1"><Tag size={12}/>التصنيف</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--brand)]">
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <CField label="السعر (ر.ي)" icon={<ChevronRight size={13}/>} value={form.price} onChange={v => set("price", Number(v) || 0)} placeholder="0"/>
          <CField label="اللون" icon={<Palette size={13}/>} value={form.color} onChange={v => set("color", v)} placeholder="مثال: أسود"/>
          <CField label="المقاسات (مفصولة بفاصلة)" icon={<Grid size={13}/>} value={(form.sizes||[]).join(",")} onChange={v => set("sizes", v.split(",").map(s => s.trim()).filter(Boolean))} placeholder="S,M,L أو 38,39,40"/>
          <CField label="الكمية المتوفرة" icon={<Package size={13}/>} value={form.stock} onChange={v => set("stock", Number(v) || 0)} placeholder="0"/>

          <button onClick={save} disabled={!form.name || !form.price}
            className="w-full bg-[var(--brand)] disabled:bg-slate-200 text-white py-3.5 rounded-2xl font-bold text-sm hover:shadow-md transition mt-2">
            حفظ المنتج
          </button>
        </div>
      </div>
    </div>
  );
}
