import type { BrandTheme, BrandSampleProduct } from "@jaringan-dagang/beli-aman-sdk";

import safiyaCatalog from "./safiyafood-catalog.json";

export const safiyafood: BrandTheme = {
  slug: "safiyafood",
  name: "Safiya Food",
  tagline: "Authentic premium · healthy · halal · since 2018",
  fonts: {
    heading: "var(--font-playfair), 'Playfair Display', Georgia, serif",
    body: "var(--font-inter), Inter, system-ui, sans-serif",
  },
  colors: {
    primary: "#6B2C1A",
    primaryFg: "#FBF6EC",
    secondary: "#D4A24C",
    accent: "#3A6B47",
    bg: "#FBF6EC",
    surface: "#FFFFFF",
    text: "#2A1810",
    textMuted: "#7A6856",
  },
  radius: {
    sm: "6px",
    md: "12px",
    lg: "20px",
  },
  copy: {
    addToCart: "Tambah ke Keranjang",
    buyNow: "Beli Sekarang",
    beliAman: "Bayar Aman",
  },
  productImagePolicy: "neutral",
  sampleProducts: safiyaCatalog.products as BrandSampleProduct[],
};
