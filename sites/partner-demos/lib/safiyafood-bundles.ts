/** Ramadhan hampers / bundles for the Safiya Food promo page.
 *
 * Each bundle pulls real SKUs from the brand catalog. The bundle price is
 * shown as `priceIdr` (the discounted/promo price) with a struck-through
 * `compareAtPriceIdr` (sum of individual variant prices) so the saving is
 * visible. Bundle SKUs are pushed into the cart on "Add bundle to cart". */

export interface BundleItem {
  sku: string;
  qty: number;
}

export interface RamadhanBundle {
  id: string;
  title: string;
  subtitle: string;
  tier: "bronze" | "silver" | "gold";
  badge?: string;
  priceIdr: number;
  compareAtPriceIdr: number;
  imageSlot: string; // hero illustration slug (relative path under /brands/safiyafood)
  description: string;
  items: BundleItem[];
}

export const SAFIYA_RAMADHAN_BUNDLES: RamadhanBundle[] = [
  {
    id: "ramadhan-iftar",
    title: "Hampers Iftar Hangat",
    subtitle: "Paket pembuka untuk takjil & sahur di rumah",
    tier: "bronze",
    priceIdr: 165000,
    compareAtPriceIdr: 219000,
    imageSlot: "/brands/safiyafood/products/saf-suk-500.svg",
    description:
      "Cocok untuk sahur dan iftar di rumah. Kombinasi kurma manis dan madu murni yang menjadi sumber energi alami.",
    items: [
      { sku: "SAF-SUK-500", qty: 1 },
      { sku: "SAF-MMR-250", qty: 1 },
    ],
  },
  {
    id: "ramadhan-keluarga",
    title: "Hampers Keluarga Penuh Berkah",
    subtitle: "Paket lengkap untuk keluarga besar",
    tier: "silver",
    badge: "BEST SELLER",
    priceIdr: 379000,
    compareAtPriceIdr: 519000,
    imageSlot: "/brands/safiyafood/products/saf-suk-850.svg",
    description:
      "Lengkap untuk meja iftar keluarga: Sukari & Ajwa Madinah, muesli sehat, dan madu akasia premium dalam satu paket cantik.",
    items: [
      { sku: "SAF-SUK-850", qty: 1 },
      { sku: "SAF-AJW-500", qty: 1 },
      { sku: "SAF-MUS-FS-300", qty: 1 },
      { sku: "SAF-MAK-250", qty: 1 },
    ],
  },
  {
    id: "ramadhan-premium",
    title: "Hampers Premium Tiga Tradisi",
    subtitle: "Untuk klien, kolega, atau bingkisan istimewa",
    tier: "gold",
    badge: "LIMITED",
    priceIdr: 749000,
    compareAtPriceIdr: 985000,
    imageSlot: "/brands/safiyafood/products/saf-ajw-850.svg",
    description:
      "Hadiah Ramadhan mewah dengan Ajwa Madinah, Sukari king dates, kurma tangkai Tunisia, saffron Persia, dan VCO premium.",
    items: [
      { sku: "SAF-AJW-850", qty: 1 },
      { sku: "SAF-SUK-1K", qty: 1 },
      { sku: "SAF-TNT-500", qty: 1 },
      { sku: "SAF-SAF-1G", qty: 1 },
      { sku: "SAF-VCO-250", qty: 1 },
    ],
  },
];

export const SAFIYA_RAMADHAN_FEATURED_SKUS: string[] = [
  "SAF-SUK-1K",
  "SAF-AJW-500",
  "SAF-TNT-1K",
  "SAF-MUS-FS-500",
  "SAF-MAK-500",
  "SAF-CHI-500",
  "SAF-SAF-1G",
  "SAF-VCO-500",
];
