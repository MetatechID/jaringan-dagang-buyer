import type { BrandSampleProduct, BrandProductVariant } from "@jaringan-dagang/beli-aman-sdk";

export interface SkuMatch {
  product: BrandSampleProduct;
  variant: BrandProductVariant | null;
  displayName: string;
  unitPriceIdr: number;
  compareAtIdr?: number;
  image: string;
  parentImage: string;
  weightGrams: number;
}

/** Resolve a SKU to its (product, variant). The SKU may be either a parent
 *  SKU (matches product.sku) or a child variant SKU. */
export function lookupSku(
  products: BrandSampleProduct[],
  sku: string,
): SkuMatch | null {
  for (const p of products) {
    if (p.variants && p.variants.length > 0) {
      const v = p.variants.find((x) => x.sku === sku);
      if (v) {
        return {
          product: p,
          variant: v,
          displayName: `${p.name} · ${v.label}`,
          unitPriceIdr: v.priceIdr,
          compareAtIdr: v.compareAtPriceIdr,
          image: v.image ?? p.image,
          parentImage: p.image,
          weightGrams: v.weightGrams ?? 500,
        };
      }
    }
    if (p.sku === sku) {
      return {
        product: p,
        variant: null,
        displayName: p.name,
        unitPriceIdr: p.priceIdr,
        compareAtIdr: p.compareAtPriceIdr,
        image: p.image,
        parentImage: p.image,
        weightGrams: 500,
      };
    }
  }
  return null;
}

/** Build "similar products" — same category as any cart item, excluding
 *  products already in the cart. Falls back to other products in the brand. */
export function similarProducts(
  products: BrandSampleProduct[],
  cartSkus: string[],
  limit = 4,
): BrandSampleProduct[] {
  const inCartParentSlugs = new Set<string>();
  const cartCategories = new Set<string>();
  for (const sku of cartSkus) {
    const m = lookupSku(products, sku);
    if (!m) continue;
    inCartParentSlugs.add(m.product.slug);
    if (m.product.category) cartCategories.add(m.product.category);
  }
  const sameCat = products.filter(
    (p) => !inCartParentSlugs.has(p.slug) && p.category && cartCategories.has(p.category),
  );
  const others = products.filter((p) => !inCartParentSlugs.has(p.slug) && !sameCat.includes(p));
  return [...sameCat, ...others].slice(0, limit);
}
