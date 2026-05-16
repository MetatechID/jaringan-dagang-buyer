import { notFound } from "next/navigation";

import { resolveBrand } from "@/lib/brands";
import { PromoView } from "@/components/PromoView";

export const metadata = {
  title: "Hampers Ramadhan · Safiya Food",
  description:
    "Paket hampers Ramadhan dari Safiya Food — kurma Sukari, Ajwa Madinah, muesli, dan madu murni. Pilihan paket untuk keluarga, klien, atau bingkisan istimewa.",
};

export default function PromoPage({ params }: { params: { brand: string } }) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();
  // The promo page is currently Safiya-themed copy; other brands fall back to a
  // simple "no promo" message rather than 404 so the route is still discoverable.
  if (params.brand !== "safiyafood") {
    return (
      <div style={{ padding: "64px 24px", textAlign: "center" }}>
        <h1 style={{ fontFamily: brand.fonts.heading }}>{brand.name}</h1>
        <p style={{ color: "var(--c-text-muted)" }}>Tidak ada promo aktif saat ini.</p>
      </div>
    );
  }
  return <PromoView brandSlug={params.brand} />;
}
