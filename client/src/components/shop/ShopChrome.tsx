"use client";

import { motion } from "framer-motion";
import { Package, ReceiptText, ShoppingBag, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { getShopCartTotals, useShopCart } from "@/lib/shop/cart";
import { cn } from "@/utils/cn";

const links = [
  { href: "/shop", label: "Store", icon: ShoppingBag },
  { href: "/shop/cart", label: "Cart", icon: ShoppingCart },
  { href: "/shop/orders", label: "Orders", icon: ReceiptText },
];

export function ShopChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const items = useShopCart();
  const totals = useMemo(() => getShopCartTotals(items), [items]);

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <div className="border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/shop" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Package className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                PowerMySport
              </span>
              <span className="block text-xl font-bold tracking-tight">
                Performance Shop
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 overflow-x-auto">
            {links.map((link) => {
              const Icon = link.icon;
              const active =
                link.href === "/shop"
                  ? pathname === "/shop"
                  : pathname?.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950",
                    active && "bg-slate-950 text-white hover:bg-slate-900 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                  {link.href === "/shop/cart" && totals.itemCount > 0 ? (
                    <motion.span
                      key={totals.itemCount}
                      initial={{ scale: 0.75 }}
                      animate={{ scale: 1 }}
                      className="grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-xs text-white"
                    >
                      {totals.itemCount}
                    </motion.span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
