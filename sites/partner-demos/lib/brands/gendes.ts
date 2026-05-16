import type { BrandTheme } from "@jaringan-dagang/beli-aman-sdk";

export const gendes: BrandTheme = {
  slug: "gendes",
  name: "Gendes",
  tagline: "Sweet care, every day · The First Sweet Aromatic Feminine Hygiene",
  fonts: {
    heading: "var(--font-poppins), Poppins, system-ui, sans-serif",
    body: "var(--font-inter), Inter, system-ui, sans-serif",
  },
  colors: {
    primary: "#FF69B4",
    primaryFg: "#FFFFFF",
    secondary: "#FFB6D9",
    accent: "#E91E63",
    bg: "#FFF5FA",
    surface: "#FFFFFF",
    text: "#2D1B27",
    textMuted: "#7A6470",
  },
  radius: {
    sm: "8px",
    md: "16px",
    lg: "24px",
  },
  copy: {
    addToCart: "Add to cart",
    buyNow: "Beli sekarang",
    beliAman: "Bayar Aman",
  },
  productImagePolicy: "lifestyle-card",
  sampleProducts: [
    {
      sku: "GDS-WASH-BG-50",
      slug: "sweet-bubblegum-wash-50ml",
      name: "Gendes Sweet Aromatic Feminine Care Wash Foam Bubble Gum 50ml",
      tagline: "Sweet feminine wash with food-grade flavour.",
      description:
        "Foam wash dengan 5 bioaktif (Manjakani, Daun Bidara, Piper Betle, Niacinamide, B5). pH-balanced, dermatology tested, BPOM certified.",
      priceIdr: 68000,
      compareAtPriceIdr: 138000,
      image: "/brands/gendes/products/wash-bg-50-1.svg",
      gallery: [
        "/brands/gendes/products/wash-bg-50-1.svg",
        "/brands/gendes/products/wash-bg-50-2.svg",
        "/brands/gendes/products/wash-bg-50-3.svg",
      ],
    },
    {
      sku: "GDS-SPRAY-PCH-30",
      slug: "sweet-peach-spray-30ml",
      name: "Gendes Feminine Spray Peach 30ml",
      tagline: "Refreshing spray on the go.",
      description:
        "Spray ringan untuk pemakaian sepanjang hari. Aroma peach lembut, food-grade flavour, tidak lengket.",
      priceIdr: 48000,
      compareAtPriceIdr: 95000,
      image: "/brands/gendes/products/spray-peach-1.svg",
    },
    {
      sku: "GDS-BUNDLE-3PK",
      slug: "starter-bundle-3pk",
      name: "Gendes Starter Bundle (Wash + Spray + Travel Pouch)",
      tagline: "All-in-one starter set.",
      description:
        "Bundle hemat: foam wash 50ml, spray 30ml, dan travel pouch. Sempurna untuk pemula atau hadiah.",
      priceIdr: 138000,
      compareAtPriceIdr: 245000,
      image: "/brands/gendes/products/bundle-1.svg",
    },
  ],
};
