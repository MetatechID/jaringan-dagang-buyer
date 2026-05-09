import type { BrandTheme } from "@jaringan-dagang/beli-aman-sdk";

import { antarestar } from "./antarestar";
import { gendes } from "./gendes";
import { DEFAULT_YOURBRAND, buildYourBrand, type YourBrandOverrides } from "./yourbrand";

export const STATIC_BRANDS: Record<string, BrandTheme> = {
  antarestar,
  gendes,
  yourbrand: DEFAULT_YOURBRAND,
};

export const BRAND_SLUGS = Object.keys(STATIC_BRANDS);

export function resolveBrand(slug: string, overrides?: YourBrandOverrides): BrandTheme | null {
  if (slug === "yourbrand") {
    return buildYourBrand(overrides);
  }
  return STATIC_BRANDS[slug] || null;
}
