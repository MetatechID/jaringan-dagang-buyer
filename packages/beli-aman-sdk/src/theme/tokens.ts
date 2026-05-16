// Theme tokens shared by every brand.

export interface BrandColors {
  primary: string;
  primaryFg: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
}

export interface BrandRadius {
  sm: string;
  md: string;
  lg: string;
}

export interface BrandCopy {
  addToCart: string;
  buyNow: string;
  beliAman: string;
}

export interface BrandProductVariant {
  sku: string;
  label: string;
  optionValues?: Record<string, string>;
  priceIdr: number;
  compareAtPriceIdr?: number;
  weightGrams?: number;
  stock?: number;
  image?: string;
  gallery?: string[];
}

export interface BrandProductOptionAxis {
  name: string;
  values: string[];
}

export interface BrandSampleProduct {
  sku: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  priceIdr: number;
  compareAtPriceIdr?: number;
  image: string;
  gallery?: string[];
  category?: string;
  badges?: string[];
  optionAxes?: BrandProductOptionAxis[];
  variants?: BrandProductVariant[];
}

export interface BrandTheme {
  slug: string;
  name: string;
  tagline?: string;
  fonts: BrandFonts;
  colors: BrandColors;
  radius: BrandRadius;
  copy: BrandCopy;
  productImagePolicy?: "full-bleed" | "lifestyle-card" | "neutral";
  sampleProducts?: BrandSampleProduct[];
}
