"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  Coffee,
  CreditCard,
  Heart,
  MapPin,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import {
  categories,
  menuItems,
  rupiah,
  type CategoryFilter,
  type MenuItem,
} from "../data/menu";
import { API_BASE_URL } from "../config";

type Page = "beranda" | "favorit" | "pesanan";
type Drawer = "keranjang" | "checkout" | "preview" | null;
type Payment = "qris" | "transfer" | "cash";
type RemovalRequest = { kind: "cart" | "favorite"; item: MenuItem };
type ActionNotice = { kind: "cart" | "favorite"; message: string };

export default function CustomerPage() {
  const params = useSearchParams();
  const meja = (params.get("meja") || "01").trim().slice(0, 16);
  const [page, setPage] = useState<Page>("beranda");
  const [category, setCategory] = useState<string>("Semua Menu");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [viewReady, setViewReady] = useState(false);
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [toast, setToast] = useState<{ name: string; quantity: number } | null>(null);
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [removalRequest, setRemovalRequest] = useState<RemovalRequest | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [payment, setPayment] = useState<Payment>("qris");

  // Backend Integration States
  const [menuList, setMenuList] = useState<MenuItem[]>(menuItems);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [orderTab, setOrderTab] = useState<"ongoing" | "past">("ongoing");

  const categoryListRef = useRef<HTMLDivElement>(null);
  const [categoryScroll, setCategoryScroll] = useState({ left: false, right: false });

  // 1. Ambil Menu Asli dari Backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/customer/menu`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped: MenuItem[] = json.data.map((item: any) => ({
            id: String(item.id),
            name: item.nama_menu,
            category: item.kategori || "Kopi",
            description: item.deskripsi || "Menu spesial pilihan dari TapKasir",
            price: item.harga_jual,
            image:
              item.kategori === "Makanan"
                ? "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=85"
                : "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=85",
            available: item.status_ketersediaan === "tersedia",
          }));
          setMenuList(mapped);
        }
      })
      .catch((err) => {
        console.warn("Menggunakan data menu lokal (backend offline):", err);
      });
  }, []);

  // 2. Fetch Active Order jika ada order_id di localStorage
  const fetchActiveOrder = (orderId?: number | string) => {
    const id = orderId || (typeof window !== "undefined" ? localStorage.getItem("active_order_id") : null);
    if (!id) return;

    fetch(`${API_BASE_URL}/api/customer/order/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          setActiveOrder(json.data);
          if (createdOrder && createdOrder.pesanan && createdOrder.pesanan.id === json.data.id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setCreatedOrder((prev: any) => ({ ...prev, pesanan: json.data }));
          }
        }
      })
      .catch((err) => console.warn("Gagal refresh status pesanan:", err));
  };

  useEffect(() => {
    fetchActiveOrder();
    const timer = setInterval(() => {
      fetchActiveOrder();
    }, 4000);
    return () => clearInterval(timer);
  }, []);


const isModalOpen = drawer !== null || detail !== null;

  
useEffect(() => {
  const frame = requestAnimationFrame(() => {
    try {
      const stored = sessionStorage.getItem("tapkasir-view");

      if (stored) {
        const saved = JSON.parse(stored);

        if (["beranda", "favorit", "pesanan"].includes(saved.page)) {
          setPage(saved.page);
        }

        const product = menuItems.find(
          (item) => item.id === saved.detailId
        );

        if (product) {
          setDetail(product);
          setDrawer(null);
        } else if (
          ["keranjang", "checkout", "preview"].includes(saved.drawer)
        ) {
          setDrawer(saved.drawer);
        }

        if (saved.cart && typeof saved.cart === "object") {
          setCart(saved.cart);
        }

        if (Array.isArray(saved.favorites)) {
          setFavorites(saved.favorites);
        }

        if (typeof saved.detailQuantity === "number") {
          setDetailQuantity(saved.detailQuantity);
        }

        if (typeof saved.customerName === "string") {
          setCustomerName(saved.customerName);
        }

        if (typeof saved.customerPhone === "string") {
          setCustomerPhone(saved.customerPhone);
        }

        if (["qris", "transfer", "cash"].includes(saved.payment)) {
          setPayment(saved.payment);
        }

        if (typeof saved.search === "string") {
          setSearch(saved.search);
        }

        if (typeof saved.searchOpen === "boolean") {
          setSearchOpen(saved.searchOpen);
        }

        if (categories.includes(saved.category)) {
          setCategory(saved.category);
        }

        if (saved.orderTab === "ongoing" || saved.orderTab === "past") {
          setOrderTab(saved.orderTab);
        }
      }
    } catch (error) {
      console.error("Gagal memulihkan tampilan:", error);
    } finally {
      setViewReady(true);
    }
  });

  return () => cancelAnimationFrame(frame);
}, []);

  // Simpan seluruh tampilan setelah proses pemulihan selesai.
  // Tanpa efek ini, sessionStorage terus berisi drawer lama (misalnya "keranjang").
  useEffect(() => {
    if (!viewReady) return;

    try {
      sessionStorage.setItem(
        "tapkasir-view",
        JSON.stringify({
          page,
          drawer,
          detailId: detail?.id ?? null,
          detailQuantity,
          category,
          searchOpen,
          search,
          favorites,
          cart,
          customerName,
          customerPhone,
          payment,
          orderTab,
        })
      );
    } catch (error) {
      console.error("Gagal menyimpan tampilan TapKasir:", error);
    }
  }, [
    viewReady, page, drawer, detail, detailQuantity, category,
    searchOpen, search, favorites, cart, customerName, customerPhone,
    payment, orderTab,
  ]);

  useEffect(() => {
    if (!isModalOpen) return;

    const body = document.body;
    const scrollY = window.scrollY;

    const previousStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      Object.assign(body.style, previousStyles);

      const html = document.documentElement;
      const previousBehavior = html.style.scrollBehavior;

      html.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      html.style.scrollBehavior = previousBehavior;
    };
  }, [isModalOpen]);


  useEffect(() => {
    if (searchOpen && page === "beranda") {
      document.getElementById("menu")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [searchOpen, page]);


  // Tampilkan petunjuk geser hanya saat daftar kategori lebih lebar dari layar.
  useEffect(() => {
    const list = categoryListRef.current;
    if (!list) return;

    const updateScroll = () => {
      const maxScroll = list.scrollWidth - list.clientWidth;
      setCategoryScroll({
        left: list.scrollLeft > 6,
        right: maxScroll > 6 && list.scrollLeft < maxScroll - 6,
      });
    };

    updateScroll();
    list.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    const observer = new ResizeObserver(updateScroll);
    observer.observe(list);

    return () => {
      list.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      observer.disconnect();
    };
  }, [page]);

  // Pengingat ditampilkan sementara setelah produk berhasil masuk keranjang.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const dynamicCategories = useMemo(() => {
    const set = new Set<string>(["Semua Menu"]);
    menuList.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [menuList]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (!removalRequest) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRemovalRequest(null);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [removalRequest]);

  const cartItems = useMemo(
    () => menuList.filter((item) => (cart[item.id] || 0) > 0),
    [cart, menuList]
  );
  const totalQuantity = cartItems.reduce((sum, item) => sum + cart[item.id], 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * cart[item.id], 0);

  const visibleItems = menuList.filter((item) => {
    const correctPage = page !== "favorit" || favorites.includes(item.id);
    const correctCategory = category === "Semua Menu" || item.category === category;
    const correctSearch = `${item.name} ${item.description}`
      .toLowerCase()
      .includes(search.toLowerCase().trim());
    return correctPage && correctCategory && correctSearch;
  });

  function changeQuantity(id: string, difference: number) {
    const item = menuItems.find((entry) => entry.id === id);
    const currentQuantity = cart[id] || 0;
    if (item && currentQuantity > 0 && currentQuantity + difference <= 0) {
      setRemovalRequest({ kind: "cart", item });
      return;
    }

    setCart((current) => {
      const next = { ...current };
      const quantity = Math.max(0, (next[id] || 0) + difference);
      if (quantity === 0) delete next[id];
      else next[id] = quantity;
      return next;
    });
  }

  function requestCartRemoval(item: MenuItem) {
    setRemovalRequest({ kind: "cart", item });
  }

  function confirmRemoval() {
    if (!removalRequest) return;
    const { kind, item } = removalRequest;
    if (kind === "cart") {
      setCart((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setActionNotice({ kind: "cart", message: `${item.name} dihapus dari keranjang.` });
    } else {
      setFavorites((current) => current.filter((id) => id !== item.id));
      setActionNotice({ kind: "favorite", message: `${item.name} dihapus dari favorit.` });
    }
    setRemovalRequest(null);
  }

  function openDetail(item: MenuItem) {
    setDetailQuantity(1);
    setToast(null);
    setDrawer(null);
    setDetail(item);
  }

  function addDetailToCart() {
    if (!detail || !detail.available) return;
    const quantity = detailQuantity;
    const item = detail;

    setCart((current) => ({
      ...current,
      [item.id]: (current[item.id] || 0) + quantity,
    }));
    setDetail(null);
    setToast({ name: item.name, quantity });
  }

  function toggleFavorite(item: MenuItem) {
    if (favorites.includes(item.id)) {
      setRemovalRequest({ kind: "favorite", item });
      return;
    }
    setFavorites((current) => current.includes(item.id) ? current : [...current, item.id]);
    setActionNotice({ kind: "favorite", message: `${item.name} ditambahkan ke favorit.` });
  }

  function openPage(nextPage: Page) {
    setPage(nextPage);
    setCategory("Semua Menu");
    setSearch("");
    setSearchOpen(false);
    setDetail(null);
    setDrawer(null);
    setToast(null);
    if (nextPage === "pesanan") {
      fetchActiveOrder();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToMenu() {
    setPage("beranda");
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!meja || !customerName.trim() || !customerPhone.trim() || totalQuantity === 0) return;

    setSubmitting(true);
    setOrderError(null);

    try {
      const mejaNum = parseInt(meja, 10) || 1;
      const payload = {
        nomor_meja: mejaNum,
        nama_pelanggan: customerName.trim(),
        nomor_telepon: customerPhone.trim(),
        metode_pembayaran: payment === "cash" ? "tunai" : "qris",
        items: cartItems.map((item) => ({
          menu_id: Number(item.id) || 1,
          kuantitas: cart[item.id],
        })),
      };

      const res = await fetch(`${API_BASE_URL}/api/customer/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memproses pesanan");
      }

      setCreatedOrder(json.data);
      setActiveOrder(json.data.pesanan);
      if (typeof window !== "undefined") {
        localStorage.setItem("active_order_id", String(json.data.pesanan.id));
      }
      setCart({});
      setDrawer("preview");
    } catch (err: unknown) {
      setOrderError(
        err instanceof Error ? err.message : "Gagal menghubungi backend"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function bayarQRIS(orderId: number) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/customer/order/${orderId}/bayar-qris`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal verifikasi pembayaran QRIS");
      fetchActiveOrder(orderId);
      alert("Pembayaran QRIS Berhasil! Pesanan diteruskan ke dapur.");
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Gagal memverifikasi pembayaran QRIS"
      )
    }
  }

  async function batalkanPesanan(orderId: number) {
    const alasan = prompt("Masukkan alasan pembatalan pesanan:", "Salah pesan menu");
    if (!alasan) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/customer/order/${orderId}/batal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alasan_batal: alasan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membatalkan pesanan");
      fetchActiveOrder(orderId);
      alert("Pesanan berhasil dibatalkan.");
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Gagal membatalkan pesanan"
      );
    }
  }

  function closeModal() {
    setDrawer(null);
    setDetail(null);
    setOrderError(null);
  }

  
  if (!viewReady) {
    return (
      <div
        className="tk-simple-loading"
        role="status"
        aria-label="Memuat halaman"
      >
        <div className="tk-simple-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  
  if (!viewReady) {
    return (
      <div
        className="tk-simple-loading"
        role="status"
        aria-label="Memuat halaman"
      >
        <div className="tk-simple-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="tk-app">
      <header className="tk-header">
        <div className="tk-header-inner">
          <nav className="tk-header-nav" aria-label="Navigasi pelanggan">
            <button className={page === "beranda" ? "tk-nav-active" : ""} onClick={() => openPage("beranda")}>Beranda</button>
            <button className={page === "pesanan" ? "tk-nav-active" : ""} onClick={() => openPage("pesanan")}>Pesanan</button>
            <button className={page === "favorit" ? "tk-nav-active" : ""} onClick={() => openPage("favorit")}>Favorit</button>
          </nav>
          <button className="tk-logo" onClick={() => openPage("beranda")} aria-label="Kembali ke beranda">
            <span className="tk-logo-icon"><Coffee size={22} /></span>
            <span>tap<span>kasir</span><i>.</i></span>
          </button>
          <div className="tk-header-right">
            {meja && <span className="tk-table-badge"><MapPin size={14} /> Meja {meja}</span>}
            <button
              type="button"
              className={`tk-search-toggle tk-header-search-button ${searchOpen ? "tk-search-active" : ""}`}
              aria-label={searchOpen ? "Tutup pencarian" : "Cari menu"}
              aria-expanded={searchOpen}
              aria-controls="tk-menu-search"
              onClick={() => {
                setPage("beranda");
                setCategory("Semua Menu");
                setSearchOpen(true);
              }}
            >
              <Search size={17} />
              <span>Cari menu</span>
            </button>
            <button className="tk-icon-button tk-cart-icon" aria-label="Buka keranjang" onClick={() => setDrawer("keranjang")}>
              <ShoppingBag size={20} />
              {totalQuantity > 0 && <span className="tk-counter">{totalQuantity}</span>}
            </button>
          </div>
        </div>
      </header>

      {page === "beranda" && (
        <section className="tk-hero" aria-label="Selamat datang">
          <div className="tk-hero-copy">
            <span className="tk-eyebrow"><span /> YOUR COFFEE MOMENT</span>
            <h1>Pesan Langsung<br /><em>Dari Mejamu</em></h1>
            <p>Nikmati menu kopi dan hidangan istimewa tanpa perlu antre di kasir. Pilih pesananmu sekarang!</p>
            <button className="tk-primary" onClick={goToMenu}>Jelajahi Menu <ArrowRight size={17} /></button>
            <div className="tk-hero-note">
              <MapPin size={16} />
              <span>Pemesanan otomatis terhubung ke Meja {meja || "01"}</span>
            </div>
          </div>
          <div className="tk-hero-photo" role="img" aria-label="Interior kafe bernuansa hangat"></div>
        </section>
      )}

      {page === "pesanan" ? (
        <section className="tk-orders-page">
          <header className="tk-orders-heading">
            <span className="tk-kicker">PESANANMU</span>
          </header>

          <div className="tk-orders-tabs" role="tablist" aria-label="Jenis pesanan">
            <button
              type="button"
              role="tab"
              id="tk-tab-ongoing"
              aria-selected={orderTab === "ongoing"}
              aria-controls="tk-orders-panel"
              className={orderTab === "ongoing" ? "tk-order-tab-active" : ""}
              onClick={() => setOrderTab("ongoing")}
            >
              Berlangsung
            </button>
            <button
              type="button"
              role="tab"
              id="tk-tab-past"
              aria-selected={orderTab === "past"}
              aria-controls="tk-orders-panel"
              className={orderTab === "past" ? "tk-order-tab-active" : ""}
              onClick={() => setOrderTab("past")}
            >
              Riwayat
            </button>
          </div>

          <div
            id="tk-orders-panel"
            role="tabpanel"
            aria-labelledby={orderTab === "ongoing" ? "tk-tab-ongoing" : "tk-tab-past"}
          >
            
          {orderTab === "ongoing" ? (
            activeOrder ? (
              <section
                className="tk-empty-page"
                style={{
                  maxWidth: 540,
                  margin: "32px auto",
                  padding: "0 20px",
                  textAlign: "left",
                }}
              >
                <span className="tk-kicker">STATUS PESANAN TERKINI</span>
                <h2>Pesanan #{activeOrder.id}</h2>

                <div className="tk-receipt" style={{ marginTop: 16 }}>
                  <div>
                    <span>Nama Pelanggan</span>
                    <strong>{activeOrder.nama_pelanggan}</strong>
                  </div>
                  <div>
                    <span>Nomor Meja</span>
                    <strong>Meja {activeOrder.nomor_meja}</strong>
                  </div>
                  <div>
                    <span>Metode Pembayaran</span>
                    <strong>{activeOrder.metode_pembayaran?.toUpperCase()}</strong>
                  </div>
                  <div>
                    <span>Status Pembayaran</span>
                    <strong
                      style={{
                        color: activeOrder.status_pembayaran === "paid"
                          ? "#2e7d32"
                          : "#d9534f",
                      }}
                    >
                      {activeOrder.status_pembayaran === "paid"
                        ? "LUNAS (PAID)"
                        : "BELUM DIBAYAR (UNPAID)"}
                    </strong>
                  </div>
                  <div>
                    <span>Status Pesanan</span>
                    <strong
                      style={{
                        textTransform: "uppercase",
                        color: "#9c6c4a",
                      }}
                    >
                      {activeOrder.status_pesanan}
                    </strong>
                  </div>
                  <div className="tk-receipt-total">
                    <span>Total Biaya</span>
                    <strong>{rupiah(activeOrder.total_harga || 0)}</strong>
                  </div>
                </div>

                {activeOrder.status_pembayaran === "unpaid" &&
                  activeOrder.metode_pembayaran === "qris" &&
                  activeOrder.status_pesanan !== "dibatalkan" && (
                    <button
                      className="tk-primary tk-full"
                      style={{ marginTop: 14 }}
                      onClick={() => bayarQRIS(activeOrder.id)}
                    >
                      <QrCode size={18} /> Simulasi Bayar QRIS Sekarang
                    </button>
                  )}

                {activeOrder.status_pembayaran === "unpaid" &&
                  activeOrder.status_pesanan === "menunggu" && (
                    <button
                      type="button"
                      className="tk-full"
                      style={{
                        marginTop: 10,
                        background: "#fff",
                        border: "1px solid #d9534f",
                        color: "#d9534f",
                        padding: "12px",
                        borderRadius: "10px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                      onClick={() => batalkanPesanan(activeOrder.id)}
                    >
                      Batalkan Pesanan Ini
                    </button>
                  )}

                <button
                  type="button"
                  className="tk-full"
                  style={{
                    marginTop: 10,
                    background: "#f8f1ea",
                    border: "none",
                    color: "#7a5c43",
                    padding: "12px",
                    borderRadius: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onClick={() => fetchActiveOrder(activeOrder.id)}
                >
                  <RefreshCw size={16} /> Perbarui Status
                </button>
              </section>
            ) : totalQuantity > 0 ? (
                <div className="tk-order-draft">
                  <span className="tk-order-status">Belum checkout</span>
                  <h3>Menu masih di keranjang</h3>
                  <div className="tk-order-items">
                    {cartItems.map((item) => (
                      <div className="tk-order-item" key={item.id}>
                        <span>{cart[item.id]} × {item.name}</span>
                        <span>{rupiah(item.price * cart[item.id])}</span>
                      </div>
                    ))}
                  </div>
                  <div className="tk-order-subtotal">
                    <span>Subtotal ({totalQuantity} item)</span>
                    <strong>{rupiah(subtotal)}</strong>
                  </div>
                  <p className="tk-order-note">
                    Menu yang dipilih belum menjadi pesanan aktif dan belum dikirim ke kasir.
                  </p>
                  <button
                    type="button"
                    className="tk-primary tk-full"
                    onClick={() => setDrawer("keranjang")}
                  >
                    <ShoppingBag size={17} /> Buka Keranjang <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="tk-orders-empty">
                  <ShoppingBag size={38} strokeWidth={1.6} />
                  <h3>Belum ada pesanan berlangsung</h3>
                  <p>Menu yang kamu tambahkan akan terlihat di sini sebelum checkout.</p>
                  <button type="button" className="tk-primary" onClick={() => openPage("beranda")}>Jelajahi Menu <ArrowRight size={16} /></button>
                </div>
              )
            ) : (
              <div className="tk-orders-empty">
                <Coffee size={38} strokeWidth={1.6} />
                <h3>Belum ada riwayat pesanan</h3>
              </div>
            )}
          </div>
        </section>
      ) : (
        <main id="menu" className="tk-menu-section">
          <div className="tk-section-head">
            <div>
              <span className="tk-kicker">{page === "favorit" ? "PILIHANMU" : "PILIH SESUAI SELERAMU"}</span>
              <h2>{page === "favorit" ? "Menu favoritmu" : "Temukan menu favoritmu"}</h2>
              <p>{page === "favorit" ? "Semua yang kamu sukai, di satu tempat." : ""}</p>
            </div>
          </div>

          {searchOpen && (
            <div id="tk-menu-search" className="tk-search-wrap" role="search">
              <Search size={18} aria-hidden="true" />
              <input
                type="text"
                inputMode="search"
                aria-label="Cari menu"
                placeholder="Cari espresso, matcha, croissant..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                }}
                autoFocus
              />
              {search && (
                <button type="button" aria-label="Hapus pencarian" onClick={() => setSearch("")}>
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          <div className={`tk-category-bar ${categoryScroll.right ? "tk-category-bar-more" : ""}`}>
            <div className="tk-category-list" role="group" aria-label="Kategori menu" ref={categoryListRef}>
              {dynamicCategories.map((item) => (
                <button
                  key={item}
                  className={`tk-category ${category === item ? "tk-category-selected" : ""}`}
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="tk-empty-result">
              <Heart size={36} />
              <h3>{page === "favorit" ? "Belum ada menu favorit" : "Menu tidak ditemukan"}</h3>
              <p>{page === "favorit" ? "Klik ikon hati pada menu yang kamu sukai." : "Coba kata kunci atau kategori lain."}</p>
            </div>
          ) : (
            <div className="tk-product-grid">
              {visibleItems.map((item) => (
                <article key={item.id} className="tk-product-card">
                  <div className="tk-product-photo" style={{ backgroundImage: `url("${item.image}")` }} role="img" aria-label={item.name}>
                    <button type="button" className="tk-product-photo-open" aria-label={`Lihat detail ${item.name}`} onClick={() => openDetail(item)} />
                    {item.tag && <span className="tk-product-tag">{item.tag}</span>}
                    <button className={`tk-heart ${favorites.includes(item.id) ? "tk-heart-active" : ""}`} aria-label={favorites.includes(item.id) ? `Hapus ${item.name} dari favorit` : `Favoritkan ${item.name}`} onClick={() => toggleFavorite(item)} aria-pressed={favorites.includes(item.id)}>
                      <Heart size={18} fill={favorites.includes(item.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="tk-product-info">
                    <span className="tk-product-category">{item.category}</span>
                    <button className="tk-product-title" onClick={() => openDetail(item)}>{item.name}</button>
                    <div className="tk-product-bottom">
                      <strong>{rupiah(item.price)}</strong>
                      <button className="tk-add" onClick={() => openDetail(item)} disabled={!item.available}><Plus size={16} /> Tambah</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      )}
      
      {page === "beranda" && (
        <footer className="tk-footer">
          <div>
            <strong>tapkasir.</strong>
            <p>Pesan dengan mudah, nikmati waktumu.</p>
          </div>
          <span>Tampilan pelanggan</span>
        </footer>
      )}

      <nav className="tk-bottom-nav" aria-label="Navigasi mobile">
        <button className={page === "beranda" ? "tk-mobile-active" : ""} onClick={() => openPage("beranda")}><Coffee size={20} /> Menu</button>
        <button className={page === "pesanan" ? "tk-mobile-active" : ""} onClick={() => openPage("pesanan")}><ShoppingBag size={20} /> Pesanan</button>
        <button className={page === "favorit" ? "tk-mobile-active" : ""} onClick={() => openPage("favorit")}><Heart size={20} /> Favorit</button>
      </nav>

      {toast && (
        <div className="tk-toast" role="status" aria-live="polite" aria-atomic="true">
          <span className="tk-toast-icon"><Check size={19} /></span>
          <div className="tk-toast-copy">
            <strong>{toast.quantity} × {toast.name} ditambahkan</strong>
            <p>Produk sudah di keranjang. Buka keranjang untuk melanjutkan pesanan.</p>
          </div>
          <button className="tk-toast-action" onClick={() => { setToast(null); setDrawer("keranjang"); }}>
            Lihat keranjang <ArrowRight size={15} />
          </button>
          <button className="tk-toast-dismiss" aria-label="Tutup pengingat" onClick={() => setToast(null)}><X size={17} /></button>
        </div>
      )}

      {actionNotice && (
        <div className={`tk-action-toast ${toast ? "tk-action-toast-raised" : ""}`} role="status" aria-live="polite">
          {actionNotice.kind === "favorite" ? <Heart size={18} fill="currentColor" /> : <Check size={18} />}
          <span>{actionNotice.message}</span>
          <button type="button" aria-label="Tutup notifikasi" onClick={() => setActionNotice(null)}><X size={16} /></button>
        </div>
      )}

      {(drawer || detail) && (
        <div className={`tk-overlay ${detail ? "tk-overlay-detail" : ""}`}>
          <button
            type="button"
            className="tk-overlay-backdrop"
            aria-label="Tutup dialog"
            onClick={() => {
              if (drawer !== "checkout" && drawer !== "preview") closeModal();
            }}
          />
          <section className="tk-modal" role="dialog" aria-modal="true" aria-label={detail ? `Detail ${detail.name}` : "Panel pelanggan"}>
            <div className="tk-modal-titlebar grid min-h-[78px] shrink-0 grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-3 border-b border-[#eee4d9] px-5">
              {drawer === "checkout" || drawer === "preview" ? (
                <button
                  type="button"
                  className="tk-modal-back col-start-1 justify-self-start"
                  aria-label={drawer === "checkout" ? "Kembali ke keranjang" : "Kembali ke checkout"}
                  onClick={() => setDrawer(drawer === "checkout" ? "keranjang" : "checkout")}
                >
                  <ArrowLeft size={19} />
                </button>
              ) : (
                <span aria-hidden="true" />
              )}

              <h2 className="col-start-2 text-center">
                {detail
                  ? "Detail Menu"
                  : drawer === "keranjang"
                    ? "Keranjang"
                    : drawer === "checkout"
                      ? "Checkout"
                      : "Pratinjau Pesanan"}
              </h2>

              {drawer === "checkout" || drawer === "preview" ? (
                <span aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className="tk-modal-close col-start-3 justify-self-end"
                  aria-label="Tutup"
                  onClick={closeModal}
                >
                  <X size={19} />
                </button>
              )}
            </div>
            <div className="tk-modal-body">
              {detail && (
                <div className="tk-detail">
                  <div className="tk-detail-photo" style={{ backgroundImage: `url("${detail.image}")` }} role="img" aria-label={detail.name} />
                  <span className="tk-product-category">{detail.category}</span>
                  <h3>{detail.name}</h3>
                  <p>{detail.description}</p>
                  <div className="tk-detail-price">
                    <span>Harga satuan</span>
                    <strong>{rupiah(detail.price)}</strong>
                  </div>
                  <div className="tk-detail-quantity">
                    <div>
                      <strong>Jumlah pesanan</strong>
                      <small>Atur jumlah sebelum memasukkan ke keranjang</small>
                    </div>
                    <div className="tk-detail-stepper">
                      <button type="button" aria-label="Kurangi jumlah" onClick={() => setDetailQuantity((n) => Math.max(1, n - 1))} disabled={detailQuantity <= 1}><Minus size={17} /></button>
                      <output aria-live="polite">{detailQuantity}</output>
                      <button type="button" aria-label="Tambah jumlah" onClick={() => setDetailQuantity((n) => Math.min(99, n + 1))} disabled={detailQuantity >= 99}><Plus size={17} /></button>
                    </div>
                  </div>
                  <button className="tk-primary tk-full" onClick={addDetailToCart} disabled={!detail.available}>
                    <ShoppingBag size={17} /> Masukkan ke Keranjang · {rupiah(detail.price * detailQuantity)}
                  </button>
                </div>
              )}

              {!detail && drawer === "keranjang" && (
                <div>
                  {cartItems.length === 0 ? (
                    <div className="tk-cart-empty"><ShoppingBag size={42} /><h3>Keranjang masih kosong</h3><p>Pilih menu yang kamu suka terlebih dahulu.</p><button className="tk-primary" onClick={closeModal}>Jelajahi Menu</button></div>
                  ) : (
                    <>
                      <div className="tk-cart-list">
                        {cartItems.map((item) => (
                          <div className="tk-cart-row" key={item.id}>
                            <div className="tk-cart-photo" style={{ backgroundImage: `url("${item.image}")` }} />
                            <div className="tk-cart-description"><strong>{item.name}</strong><span>{rupiah(item.price)}</span><div className="tk-quantity"><button aria-label={`Kurangi ${item.name}`} onClick={() => changeQuantity(item.id, -1)}><Minus size={14} /></button><b>{cart[item.id]}</b><button aria-label={`Tambah ${item.name}`} onClick={() => changeQuantity(item.id, 1)}><Plus size={14} /></button></div></div>
                            <button className="tk-trash" aria-label={`Hapus ${item.name}`} onClick={() => requestCartRemoval(item)}><Trash2 size={17} /></button>
                          </div>
                        ))}
                      </div>
                      <div className="tk-total"><span>Subtotal ({totalQuantity} item)</span><strong>{rupiah(subtotal)}</strong></div>
                      <p className="tk-helper">Harga final dan ketersediaan stok akan dikonfirmasi oleh sistem.</p>
                      <button className="tk-primary tk-full" onClick={() => setDrawer("checkout")}>Lanjut Checkout <ArrowRight size={16} /></button>
                    </>
                  )}
                </div>
              )}

              {!detail && drawer === "checkout" && (
                <form className="tk-checkout" onSubmit={submitCheckout}>
                  <div className="tk-checkout-table"><MapPin size={19} /><span><small>LOKASI PEMESANAN</small><strong>{meja ? `Meja ${meja}` : "Nomor meja belum terdeteksi"}</strong></span></div>
                  {/* {!meja && <p className="tk-warning">Untuk melanjutkan, buka halaman dari QR Code meja. Saat pengembangan, coba URL <code>/?meja=07</code>.</p>} */}
                  {orderError && (
                    <div style={{ background: "#fde8e8", color: "#c62828", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                      {orderError}
                    </div>
                  )}
                  <label>Nama pelanggan<input required maxLength={60} placeholder="Masukkan nama" value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
                  <label>Nomor telepon<input required type="tel" inputMode="tel" pattern="[0-9+ ]{8,16}" title="Masukkan 8–16 karakter berupa angka, spasi, atau tanda +" placeholder="Contoh: 081234567890" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></label>
                  <h3>Metode pembayaran</h3>
                  <div className="tk-payment-list">
                    <button type="button" className={payment === "qris" ? "tk-payment-selected" : ""} onClick={() => setPayment("qris")}><QrCode size={23} /><span><strong>QRIS</strong><small>Bayar dengan e-wallet atau mobile banking</small></span>{payment === "qris" && <Check size={18} />}</button>
                    <button type="button" className={payment === "cash" ? "tk-payment-selected" : ""} onClick={() => setPayment("cash")}><Banknote size={23} /><span><strong>Tunai di kasir</strong><small>Bayar di meja kasir dengan sebutkan nama & nomor meja</small></span>{payment === "cash" && <Check size={18} />}</button>
                  </div>
                  <div className="tk-total"><span>Subtotal</span><strong>{rupiah(subtotal)}</strong></div>
                  <button className="tk-primary tk-full" type="submit" disabled={submitting || totalQuantity === 0}>
                    {submitting ? "Memproses Pesanan..." : "Kirim Pesanan ke Kasir"} <ArrowRight size={16} />
                  </button>
                </form>
              )}

              {!detail && drawer === "preview" && (
                <div className="tk-preview">
                  <span className="tk-preview-icon"><Coffee size={33} /></span>
                  <span className="tk-kicker">PESANAN BERHASIL DIBUAT!</span>
                  <h3>Pesanan #{createdOrder?.pesanan?.id || ""}</h3>
                  <p>{createdOrder?.instruksi || "Pesanan kamu sudah tercatat di sistem."}</p>

                  {createdOrder?.qris_payload && createdOrder?.pesanan?.status_pembayaran === "unpaid" && (
                    <div style={{ margin: "20px auto", textAlign: "center" }}>
                      <img
                        src={createdOrder.qris_payload}
                        alt="QRIS Code"
                        style={{ width: 200, height: 200, margin: "0 auto", borderRadius: 12, border: "2px solid #e0d0c0" }}
                      />
                      <p style={{ marginTop: 8, fontSize: 13, color: "#7a5c43" }}>Scan kode QRIS di atas untuk melakukan pembayaran</p>
                      <button
                        type="button"
                        className="tk-primary tk-full"
                        style={{ marginTop: 12 }}
                        onClick={() => bayarQRIS(createdOrder.pesanan.id)}
                      >
                        Simulasi Bayar QRIS Sekarang
                      </button>
                    </div>
                  )}

                  <div className="tk-receipt">
                    <div><span>Nama</span><strong>{createdOrder?.pesanan?.nama_pelanggan || customerName.trim()}</strong></div>
                    <div><span>Nomor meja</span><strong>Meja {createdOrder?.pesanan?.nomor_meja || meja}</strong></div>
                    <div><span>Nomor telepon</span><strong>{createdOrder?.pesanan?.nomor_telepon || customerPhone.trim()}</strong></div>
                    <div><span>Status Pembayaran</span><strong style={{ color: createdOrder?.pesanan?.status_pembayaran === "paid" ? "#2e7d32" : "#d9534f" }}>{createdOrder?.pesanan?.status_pembayaran?.toUpperCase() || "UNPAID"}</strong></div>
                    <div><span>Status Pesanan</span><strong style={{ textTransform: "uppercase" }}>{createdOrder?.pesanan?.status_pesanan || "MENUNGGU"}</strong></div>
                    <div className="tk-receipt-total"><span>Total Harga</span><strong>{rupiah(createdOrder?.pesanan?.total_harga || subtotal)}</strong></div>
                  </div>

                  <button className="tk-primary tk-full" onClick={() => { setDrawer(null); openPage("pesanan"); }}>
                    Lihat Status di Tab Pesanan <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {removalRequest && (
        <div className="tk-confirm-overlay">
          <button
            type="button"
            className="tk-confirm-backdrop"
            aria-label="Batal menghapus"
            onClick={() => setRemovalRequest(null)}
          />
          <section
            className="tk-confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="tk-confirm-title"
            aria-describedby="tk-confirm-description"
          >
            <div className="tk-confirm-icon">
              {removalRequest.kind === "favorite" ? <Heart size={23} /> : <Trash2 size={23} />}
            </div>
            <h3 id="tk-confirm-title">
              {removalRequest.kind === "favorite" ? "Hapus dari favorit?" : "Hapus dari keranjang?"}
            </h3>
            <p id="tk-confirm-description">
              Yakin ingin menghapus <strong>{removalRequest.item.name}</strong> dari {removalRequest.kind === "favorite" ? "daftar favorit" : "keranjang"}?
            </p>
            <div className="tk-confirm-actions">
              <button type="button" className="tk-confirm-cancel" autoFocus onClick={() => setRemovalRequest(null)}>Batal</button>
              <button type="button" className="tk-confirm-delete" onClick={confirmRemoval}>Ya, hapus</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
