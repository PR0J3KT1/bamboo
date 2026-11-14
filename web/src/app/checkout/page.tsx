import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getMenu, getPlaces, toCatalog } from "@/db/queries/menu";
import { getViewer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { displayPhone } from "@/lib/phone";
import { CatalogProvider } from "@/components/order/catalog";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

async function Checkout() {
  await connection();
  const [menu, places, viewer, settings] = await Promise.all([getMenu(), getPlaces(), getViewer(), getSettings()]);
  return (
    <CatalogProvider catalog={toCatalog(menu, viewer.adult)} showBasket={false}>
      <CheckoutForm
        places={places}
        signedIn={!!viewer.user}
        defaultName={viewer.profileComplete ? (viewer.user?.name ?? "") : ""}
        defaultPhone={viewer.user?.phoneNumber ? displayPhone(viewer.user.phoneNumber) : ""}
        closed={settings.ordering.open ? null : settings.ordering.note || "The kitchen isn't taking orders online just now. Call or WhatsApp the lounge."}
      />
    </CatalogProvider>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="p-6 text-ink-2">Loading your order…</p>}>
      <Checkout />
    </Suspense>
  );
}
