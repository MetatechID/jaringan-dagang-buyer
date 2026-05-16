#!/usr/bin/env python3
"""Generate both the storefront catalog JSON and the BPP catalog JSON from a
single source-of-truth defined in generate_assets.py.

Catalog shape per product (standard e-commerce):
- ONE unified `gallery`: all parent views (front / side / info) followed by
  each variant's primary image.
- Each variant carries an `imageIndex` pointing to its slot in that gallery,
  so the PDP can just move the selection (NOT replace the gallery) when the
  buyer picks a different size.

Writes:
  - sites/partner-demos/lib/brands/safiyafood-catalog.json   (storefront)
  - apps/beli-aman-bap/catalog/safiyafood.json               (BPP)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from generate_assets import PRODUCTS  # type: ignore

REPO_ROOT = HERE.parents[4]
ASSET_BASE = "/brands/safiyafood/products"

DESCRIPTIONS = {
    "kurma-sukari": (
        "Kurma Sukari premium dari Saudi Arabia. Tekstur lembut, rasa karamel manis, "
        "warna keemasan. Salah satu kurma raja yang populer di kalangan keluarga."
    ),
    "kurma-ajwa": (
        "Kurma Ajwa Madinah — Kurma Nabi yang lembut dan kenyal. Manisnya bersahaja "
        "dengan sentuhan karamel. Berkualitas premium langsung dari kebun Madinah."
    ),
    "kurma-tunisia-tangkai": (
        "Kurma Tunisia Tangkai (Branched) — masih melekat di tangkainya, alami, "
        "dan tampil cantik di meja iftar. Cocok untuk hadiah."
    ),
    "kurma-tunisia-madu": (
        "Kurma Tunisia Deglet Noor — varietas 'Queen of Dates' dengan rasa madu khas "
        "dan tekstur semi-kering yang halus."
    ),
    "kurma-khalas": (
        "Kurma Khalas dengan tekstur kenyal, rasa karamel-toffee, dan vacuum-sealed "
        "untuk kesegaran maksimum."
    ),
    "muesli-fruit-seed": (
        "Sereal sehat dengan rolled oat, rice crispy, biji labu, biji bunga matahari, "
        "almond, kismis, dan kurma. Tinggi serat, vitamin, dan mineral."
    ),
    "muesli-choco-milk": (
        "Muesli coklat dengan tambahan chiaseed. Tinggi serat dan antioksidan, "
        "cocok untuk sarapan cepat dan bergizi."
    ),
    "berry-yogurt-cereal": (
        "Sereal renyah dengan lapisan yogurt dan campuran berry. Tinggi serat, "
        "rendah lemak, cocok untuk diet sehat."
    ),
    "chia-seed": (
        "Chia seed hitam premium. Sumber omega-3, serat, kalsium, dan protein nabati. "
        "Cocok untuk smoothie, oatmeal, atau pudding."
    ),
    "beras-merah": (
        "Beras merah organik — low GI, kaya serat, mineral, dan antioksidan. "
        "Alternatif sehat pengganti beras putih."
    ),
    "garam-himalaya": (
        "Garam Himalaya pink salt — kaya mineral, lebih sehat dibanding garam meja "
        "biasa. Cocok untuk masakan rumahan."
    ),
    "saffron": (
        "Saffron Grade A asli Persia — bunga safron berkualitas premium dengan aroma "
        "dan warna kuning emas yang khas. Cocok untuk nasi kebuli, infused water, dan dessert."
    ),
    "madu-akasia": (
        "Madu akasia murni raw — ringan, floral, tidak mudah mengkristal. Tinggi "
        "antioksidan, cocok untuk dikonsumsi setiap hari."
    ),
    "madu-baduy": (
        "Madu hutan dari suku Baduy, Banten. Raw dan unfiltered, dengan rasa kompleks "
        "dari beragam bunga hutan."
    ),
    "madu-murni": (
        "Madu murni multi-flora — raw, tanpa campuran gula atau pengawet. Cocok untuk "
        "teh, masker wajah, atau langsung dikonsumsi."
    ),
    "vco-virgin-coconut-oil": (
        "Virgin Coconut Oil cold-pressed — minyak kelapa murni tanpa pemanasan. "
        "Tinggi MCT, baik untuk diet sehat, kulit, dan rambut."
    ),
}

CATEGORY_BECKN = {
    "Kurma":             "food-beverages-dates",
    "Sereal & Granola":  "food-beverages-cereal",
    "Healthy Pantry":    "food-beverages-pantry",
    "Madu":              "food-beverages-honey",
}


def _build_unified_gallery(p: dict) -> tuple[list[str], dict[str, int]]:
    """Return (gallery, sku_to_index).

    Gallery layout:
      [parent_view_0, parent_view_1, ..., variant_0, variant_1, ...]
    """
    slug = p["slug"]
    gallery: list[str] = []
    for view in p["parent_views"]:
        gallery.append(f"{ASSET_BASE}/{slug}-{view}.svg")
    sku_to_index: dict[str, int] = {}
    for v in p["variants"]:
        sku_to_index[v["sku"]] = len(gallery)
        gallery.append(f"{ASSET_BASE}/{v['sku'].lower()}.svg")
    return gallery, sku_to_index


def build_storefront() -> dict:
    """Schema consumed by sites/partner-demos."""
    products = []
    for p in PRODUCTS:
        gallery, idx = _build_unified_gallery(p)
        variants = []
        for v in p["variants"]:
            variants.append({
                "sku": v["sku"],
                "label": v["size"],
                "optionValues": {"size": v["size"]},
                "priceIdr": v["price"],
                "compareAtPriceIdr": v["compare"],
                "weightGrams": v["weight"],
                "stock": 200,
                "image": gallery[idx[v["sku"]]],
                "imageIndex": idx[v["sku"]],
            })
        first = p["variants"][0]
        products.append({
            "sku": first["sku"],
            "slug": p["slug"],
            "name": p["name"],
            "tagline": p["tagline"],
            "description": DESCRIPTIONS[p["slug"]],
            "priceIdr": first["price"],
            "compareAtPriceIdr": first["compare"],
            "image": gallery[0],
            "gallery": gallery,
            "category": p["category"],
            "badges": ["Halal", "BPOM RI", "Premium"],
            "optionAxes": [{
                "name": "size",
                "values": [v["size"] for v in p["variants"]],
            }],
            "variants": variants,
        })
    return {
        "brand_slug": "safiyafood",
        "brand_name": "Safiya Food",
        "products": products,
    }


def build_bpp_catalog() -> dict:
    """Schema consumed by apps/beli-aman-bap/catalog."""
    products = []
    for p in PRODUCTS:
        gallery, idx = _build_unified_gallery(p)
        variants = []
        for v in p["variants"]:
            variants.append({
                "sku": v["sku"],
                "label": v["size"],
                "option_values": {"size": v["size"]},
                "price_idr": v["price"],
                "compare_at_price_idr": v["compare"],
                "weight_grams": v["weight"],
                "stock": 200,
                "image": gallery[idx[v["sku"]]],
                "image_index": idx[v["sku"]],
            })
        first = p["variants"][0]
        products.append({
            "sku": first["sku"],
            "slug": p["slug"],
            "name": p["name"],
            "tagline": p["tagline"],
            "description": DESCRIPTIONS[p["slug"]],
            "price_idr": first["price"],
            "compare_at_price_idr": first["compare"],
            "image": gallery[0],
            "gallery": gallery,
            "category": p["category"],
            "beckn_category_id": CATEGORY_BECKN[p["category"]],
            "badges": ["Halal", "BPOM RI", "Premium"],
            "option_axes": [{
                "name": "size",
                "values": [v["size"] for v in p["variants"]],
            }],
            "variants": variants,
        })
    return {
        "brand_slug": "safiyafood",
        "brand_name": "Safiya Food",
        "products": products,
    }


if __name__ == "__main__":
    storefront = build_storefront()
    bpp = build_bpp_catalog()

    out1 = REPO_ROOT / "sites/partner-demos/lib/brands/safiyafood-catalog.json"
    out2 = REPO_ROOT / "apps/beli-aman-bap/catalog/safiyafood.json"
    out1.write_text(json.dumps(storefront, indent=2, ensure_ascii=False))
    out2.write_text(json.dumps(bpp, indent=2, ensure_ascii=False))
    print(f"Wrote {out1}")
    print(f"Wrote {out2}")
    print(f"Products: {len(storefront['products'])}")
    print(f"SKUs (variants): {sum(len(p['variants']) for p in storefront['products'])}")
    # Sanity: dump kurma-sukari for visual verification
    sukari = next(p for p in storefront["products"] if p["slug"] == "kurma-sukari")
    print("\nkurma-sukari gallery:")
    for i, g in enumerate(sukari["gallery"]):
        owner = next((v["label"] for v in sukari["variants"] if v.get("imageIndex") == i), "(parent)")
        print(f"  [{i}] {owner:<6}  {g.rsplit('/', 1)[-1]}")
