import type { BrandTheme } from "@jaringan-dagang/beli-aman-sdk";

export interface YourBrandOverrides {
  primary?: string;
  secondary?: string;
  accent?: string;
  radius?: string;
  name?: string;
}

export const DEFAULT_YOURBRAND: BrandTheme = {
  slug: "yourbrand",
  name: "YourBrand",
  tagline: "Your store, with Beli Aman built in",
  fonts: {
    heading: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
  },
  colors: {
    primary: "#1E40AF",
    primaryFg: "#FFFFFF",
    secondary: "#1E3A8A",
    accent: "#F59E0B",
    bg: "#FFFFFF",
    surface: "#F8FAFC",
    text: "#0F172A",
    textMuted: "#64748B",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
  },
  copy: {
    addToCart: "Add to cart",
    buyNow: "Buy now",
    beliAman: "Bayar Aman",
  },
  sampleProducts: [
    {
      sku: "YB-HERO-PRODUCT-01",
      slug: "hero-product",
      name: "YourBrand Hero Product",
      tagline: "Your best-seller, with Beli Aman built in.",
      description:
        "Demo product card. Edit colors and copy via /yourbrand?primary=#xxx&secondary=#yyy. Use this surface to show prospects what their site looks like with Beli Aman embedded.",
      priceIdr: 199000,
      compareAtPriceIdr: 299000,
      image: "/brands/yourbrand/products/hero-1.svg",
    },
    {
      sku: "YB-SECONDARY-02",
      slug: "secondary-product",
      name: "YourBrand Featured Item",
      tagline: "A second sample SKU for the demo grid.",
      description:
        "Lorem ipsum product description. Replace with real copy when onboarding a brand.",
      priceIdr: 89000,
      compareAtPriceIdr: 145000,
      image: "/brands/yourbrand/products/secondary-1.svg",
    },
  ],
};

export function buildYourBrand(overrides: YourBrandOverrides = {}): BrandTheme {
  const base = DEFAULT_YOURBRAND;
  return {
    ...base,
    name: overrides.name || base.name,
    colors: {
      ...base.colors,
      primary: overrides.primary || base.colors.primary,
      secondary: overrides.secondary || base.colors.secondary,
      accent: overrides.accent || base.colors.accent,
    },
    radius: overrides.radius
      ? { sm: overrides.radius, md: overrides.radius, lg: overrides.radius }
      : base.radius,
  };
}
