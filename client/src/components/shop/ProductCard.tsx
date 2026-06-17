"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgePercent } from "lucide-react";
import Link from "next/link";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import type { Product } from "@/lib/shop/ecommerce-api";
import { formatInr, getProductPrice } from "@/lib/shop/format";

function primaryVariant(product: Product) {
  return (
    product.variants.find((variant) => variant.stock > 0) ||
    product.variants[0] || {
      id: product.id,
      sku: product.sku,
      variantLabel: "Standard",
      stock: product.totalStock,
      price: getProductPrice(product),
    }
  );
}

export function ProductCard({ product }: { product: Product }) {
  const price = getProductPrice(product);
  const variant = primaryVariant(product);
  const image = product.images?.[0];
  const stockLevel =
    product.totalStock === 0
      ? "Sold out"
      : product.totalStock <= 8
        ? `${product.totalStock} left`
        : "In stock";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl"
    >
      <Link href={`/shop/products/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-linear-to-br from-blue-50 via-white to-orange-50">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-slate-500">
              {product.category}
            </div>
          )}
          {product.salePrice ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white">
              <BadgePercent className="h-3.5 w-3.5" />
              Sale
            </span>
          ) : null}
        </div>
      </Link>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {product.category}
            </p>
            <Link
              href={`/shop/products/${product.id}`}
              className="mt-1 block text-base font-bold leading-tight text-slate-950 hover:text-orange-600"
            >
              {product.name}
            </Link>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {stockLevel}
          </span>
        </div>

        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
          {product.description}
        </p>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-slate-950">
              {formatInr(price)}
            </div>
            {product.salePrice ? (
              <div className="text-xs font-medium text-slate-400 line-through">
                {formatInr(product.basePrice)}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/shop/products/${product.id}`}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              aria-label={`View ${product.name}`}
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
            <AddToCartButton
              compact
              item={{
                productId: product.id,
                variantId: variant.id,
                sku: variant.sku,
                name: product.name,
                category: product.category,
                image,
                variantLabel: variant.variantLabel,
                unitPrice: variant.price || price,
                quantity: 1,
                stock: variant.stock,
              }}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
