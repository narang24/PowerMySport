import ShopWaitlist from "../../../components/shop/ShopWaitlist";

export default function ShopPage() {
  const isShopLive = process.env.NEXT_PUBLIC_SHOP_IS_LIVE === "true";

  // If the shop isn't launched yet, show the waitlist capture page.
  if (!isShopLive) {
    return <ShopWaitlist />;
  }

  // The actual shop component when it launches
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
          Welcome to the PowerMySport Shop!
        </h1>
        <p className="text-lg text-slate-600">
          We are officially live. Start browsing gear now.
        </p>
      </div>
    </div>
  );
}
