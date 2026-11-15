import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getMenu, getPlaces, toCatalog } from "@/db/queries/menu";
import { customerLocation, getOpenLocations } from "@/lib/locations";
import { getViewer } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { mpesaEnabled } from "@/lib/mpesa";
import { displayPhone } from "@/lib/phone";
import { CatalogProvider } from "@/components/order/catalog";
import { CheckoutForm } from "./checkout-form";
import { Loader } from "@/components/ui/loader";

export const metadata: Metadata = { title: "Checkout" };

async function Checkout() {
  await connection();
  const [location, open, places, viewer, settings] = await Promise.all([customerLocation(), getOpenLocations(), getPlaces(), getViewer(), getSettings()]);
  const menu = await getMenu(location.id);
  const pick = (l: typeof location) => ({ id: l.id, name: l.name, area: l.area });
  const closed = !settings.ordering.open
    ? settings.ordering.note || "The kitchen isn't taking orders online just now. Call or WhatsApp the lounge."
    : !location.orderingOpen
      ? `Bamboo Cask ${location.name} isn't taking orders online just now.${open.some((l) => l.orderingOpen) ? " Choose another lounge to collect from." : " Call or WhatsApp the lounge."}`
      : null;
  return (
    <CatalogProvider catalog={toCatalog(menu, viewer.adult)} showBasket={false}>
      <CheckoutForm
        location={pick(location)}
        locations={open.filter((l) => l.orderingOpen || l.id === location.id).map(pick)}
        places={places}
        signedIn={!!viewer.user}
        defaultName={viewer.profileComplete ? (viewer.user?.name ?? "") : ""}
        defaultPhone={viewer.user?.phoneNumber ? displayPhone(viewer.user.phoneNumber) : ""}
        mpesa={mpesaEnabled()}
        closed={closed}
      />
    </CatalogProvider>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Loader label="Getting your order ready" />}>
      <Checkout />
    </Suspense>
  );
}
