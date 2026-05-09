import type { BrandTheme } from "@jaringan-dagang/beli-aman-sdk";

export const antarestar: BrandTheme = {
  slug: "antarestar",
  name: "ANTARESTAR",
  tagline: "Outdoor + Utility · Let's Go Out!",
  fonts: {
    heading: "Montserrat, system-ui, sans-serif",
    body: "Montserrat, system-ui, sans-serif",
  },
  colors: {
    primary: "#404040",
    primaryFg: "#FFFFFF",
    secondary: "#FFFFFF",
    accent: "#404040",
    bg: "#FFFFFF",
    surface: "#F7F7F7",
    text: "#404040",
    textMuted: "#777777",
  },
  radius: {
    sm: "0px",
    md: "0px",
    lg: "2px",
  },
  copy: {
    addToCart: "Add to cart",
    buyNow: "Buy now",
    beliAman: "Bayar Aman",
  },
  productImagePolicy: "full-bleed",
  sampleProducts: [
    {
      sku: "ANT-VLM-CRINKLE-NAVY-L",
      slug: "valmora-crinkle-jacket",
      name: "ANTARESTAR Official Jaket Crinkle Valmora",
      tagline: "Lightweight crinkle windbreaker. Daily wind protection.",
      description:
        "Bahan crinkle ringan dan tahan air. Cocok untuk aktivitas harian, riding, atau perjalanan singkat. Unisex casual fit.",
      priceIdr: 425000,
      compareAtPriceIdr: 750000,
      image: "/brands/antarestar/products/valmora-1.svg",
      gallery: [
        "/brands/antarestar/products/valmora-1.svg",
        "/brands/antarestar/products/valmora-2.svg",
        "/brands/antarestar/products/valmora-3.svg",
      ],
    },
    {
      sku: "ANT-EVEREST-DAYPACK-25L",
      slug: "everest-daypack",
      name: "ANTARESTAR Daypack Everest 25L",
      tagline: "Compact 25L daypack with laptop sleeve.",
      description:
        "Tahan air, padded laptop sleeve hingga 15 inch, kompartemen organizer untuk EDC. Cocok untuk kerja, kuliah, dan trip.",
      priceIdr: 285000,
      compareAtPriceIdr: 450000,
      image: "/brands/antarestar/products/daypack-1.svg",
    },
    {
      sku: "ANT-COOK-SET-2P",
      slug: "camping-cook-set-2p",
      name: "ANTARESTAR Camping Cook Set 2-Person",
      tagline: "Stainless cook set for two.",
      description:
        "Set masak camping ringan untuk 2 orang. Stainless food-grade, lengkap dengan panci, wajan kecil, mangkok, dan peralatan makan.",
      priceIdr: 199000,
      compareAtPriceIdr: 320000,
      image: "/brands/antarestar/products/cookset-1.svg",
    },
  ],
};
