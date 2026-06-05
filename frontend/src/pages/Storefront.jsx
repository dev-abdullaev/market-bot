import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Header } from "../components/shop/Header";
import { Hero } from "../components/shop/Hero";
import { CategorySection } from "../components/shop/CategorySection";
import { CatalogSkeleton } from "../components/shop/Skeletons";
import { CartDrawer } from "../components/shop/CartDrawer";
import { Button } from "../components/ui/Button";
import { useCart } from "../hooks/useCart";
import { fetchShop, fetchCatalog } from "../lib/api";

export default function Storefront() {
  const { slug = "demo-shop" } = useParams();
  const nav = useNavigate();
  const cart = useCart();

  const [store, setStore] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [cartOpen, setCartOpen] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [shop, cats] = await Promise.all([
        fetchShop(slug).catch(() => null),
        fetchCatalog(slug),
      ]);
      setStore(shop);
      setCategories(cats);
      setStatus("ready");
    } catch (err) {
      console.error("Failed to load shop", err);
      setStatus("error");
    }
  }, [slug]);

  useEffect(() => {
    // Data fetch on mount / slug change; setState lives inside the async
    // callback, which is the intended pattern for syncing with an external API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const currency = store?.currency_code || "UZS";
  const cardMode = store?.showcase_config?.product_card_mode || "wide";
  const handleAdd = useCallback((product) => cart.add(product, 1), [cart]);

  return (
    <div className="min-h-svh bg-muted">
      <Header
        storeName={store?.name}
        count={cart.count}
        onOpenCart={() => setCartOpen(true)}
      />

      <Hero store={store} />

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:py-10">
        {status === "loading" && <CatalogSkeleton />}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background p-10 text-center shadow-soft">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" strokeWidth={2} />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold">
                Katalogni yuklab bo'lmadi
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Server bilan bog'lanishda xatolik yuz berdi.
              </p>
            </div>
            <Button variant="primary" onClick={load} className="rounded-full">
              <RefreshCw className="h-4 w-4" />
              Qayta urinish
            </Button>
          </div>
        )}

        {status === "ready" && categories.length === 0 && (
          <div className="rounded-2xl border border-border bg-background p-10 text-center shadow-soft">
            <p className="font-display text-lg font-extrabold">
              Mahsulotlar topilmadi
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Bu do'konda hozircha mahsulotlar yo'q.
            </p>
          </div>
        )}

        {status === "ready" &&
          categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              currency={currency}
              onAdd={handleAdd}
              cardMode={cardMode}
            />
          ))}
      </main>

      <footer className="border-t border-border bg-background px-4 py-8 text-center text-xs text-muted-foreground">
        <p>{store?.name || "Market"} · Telegram mini-app · frontend-v2 demo</p>
      </footer>

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        currency={currency}
        onCheckout={() => {
          setCartOpen(false);
          nav(`/shop/${slug}/checkout`);
        }}
      />
    </div>
  );
}
