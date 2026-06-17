import ShopWaitlist from "../../../components/shop/ShopWaitlist";
import { ShopCatalogClient } from "@/components/shop/ShopCatalogClient";
import { listProducts, type Product } from "@/lib/shop/ecommerce-api";

export default async function ShopPage() {
  const isShopLive = process.env.NEXT_PUBLIC_SHOP_IS_LIVE !== "false";

  // If the shop isn't launched yet, show the waitlist capture page.
  if (!isShopLive) {
    return <ShopWaitlist />;
  }

  const data = await listProducts({
    page: 1,
    limit: 48,
    sortBy: "newest",
  }).catch(() => ({ products: [] as Product[], total: 0, page: 1, pages: 1 }));

  return <ShopCatalogClient products={data.products} />;
}
