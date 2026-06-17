"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal, Sparkles, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import type { Product } from "@/lib/shop/ecommerce-api";
import { getShopCartTotals, useShopCart } from "@/lib/shop/cart";
import { formatInr } from "@/lib/shop/format";
import { cn } from "@/utils/cn";

const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price low" },
  { value: "price_desc", label: "Price high" },
  { value: "newest", label: "Newest" },
];

export function ShopCatalogClient({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [sort, setSort] = useState("featured");
  const cartItems = useShopCart();
  const totals = useMemo(() => getShopCartTotals(cartItems), [cartItems]);

  const categories = useMemo(
    () => ["ALL", ...Array.from(new Set(products.map((item) => item.category)))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = products.filter((product) => {
      const categoryMatch = category === "ALL" || product.category === category;
      const searchMatch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      return categoryMatch && searchMatch;
    });

    return [...next].sort((a, b) => {
      const aPrice = a.salePrice ?? a.basePrice;
      const bPrice = b.salePrice ?? b.basePrice;
      if (sort === "price_asc") return aPrice - bPrice;
      if (sort === "price_desc") return bPrice - aPrice;
      if (sort === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return Number(Boolean(b.salePrice)) - Number(Boolean(a.salePrice));
    });
  }, [category, products, search, sort]);

  const heroProduct = products.find((product) => product.images?.[0]) || products[0];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-2xl sm:p-8"
        >
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-200">
              <Sparkles className="h-3.5 w-3.5" />
              Match-ready gear
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-black tracking-tight sm:text-5xl">
              Shop equipment built for everyday athletes.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Browse curated apparel, accessories, and training essentials with
              instant cart updates and a checkout flow ready for live orders.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#catalog"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600"
              >
                Browse Gear
              </a>
              <Link
                href="/shop/cart"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
              >
                <ShoppingCart className="h-4 w-4" />
                {totals.itemCount ? `${totals.itemCount} in cart` : "View Cart"}
              </Link>
            </div>
          </div>
          {heroProduct?.images?.[0] ? (
            <img
              src={heroProduct.images[0]}
              alt=""
              className="absolute right-0 top-0 hidden h-full w-2/5 object-cover opacity-35 lg:block"
            />
          ) : null}
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Cart Snapshot
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Items</p>
              <p className="mt-1 text-3xl font-black">{totals.itemCount}</p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-sm text-orange-700">Total</p>
              <p className="mt-1 text-2xl font-black text-orange-700">
                {formatInr(totals.total)}
              </p>
            </div>
          </div>
          <Link
            href="/shop/checkout"
            className={cn(
              "mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold transition",
              totals.itemCount
                ? "bg-slate-950 text-white hover:bg-slate-800"
                : "bg-slate-100 text-slate-400",
            )}
          >
            Checkout
          </Link>
        </motion.aside>
      </section>

      <section id="catalog" className="mt-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search gear, apparel, accessories"
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  "h-10 rounded-lg px-3 text-sm font-semibold transition",
                  category === item
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                )}
              >
                {item === "ALL" ? "All" : item}
              </button>
            ))}
          </div>
          <label className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
            <SlidersHorizontal className="h-4 w-4" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="bg-transparent outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-600">
            No products match this search.
          </div>
        ) : (
          <motion.div
            layout
            className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </main>
  );
}
