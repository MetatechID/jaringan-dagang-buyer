#!/usr/bin/env python3
"""Generate Safiya Food product SVG mockups.

Writes one SVG per (product, view) at product/<slug>-<view>.svg
and one per (variant) at product/<sku>.svg, plus a hero artwork.

Run once. Idempotent.
"""
from __future__ import annotations

import json
import os
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PRODUCT_DIR = ROOT / "products"
HERO_DIR = ROOT / "hero"
PRODUCT_DIR.mkdir(parents=True, exist_ok=True)
HERO_DIR.mkdir(parents=True, exist_ok=True)

# Brand palette
MAROON = "#6B2C1A"
GOLD = "#D4A24C"
CREAM = "#FBF6EC"
SOFT_CREAM = "#F3E7CF"
FOREST = "#3A6B47"
DARK = "#2A1810"
WHITE = "#FFFFFF"


def svg_wrap(body: str, bg: str = CREAM) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" '
        'preserveAspectRatio="xMidYMid slice">\n'
        + f'  <rect width="800" height="800" fill="{bg}"/>\n'
        + body
        + "\n</svg>\n"
    )


# ----- Kurma packagings -----

def kurma_jar(
    label: str,
    size_label: str,
    *,
    lid_color: str = GOLD,
    body_color: str = MAROON,
    flesh_color: str = "#8B3D24",
    bg: str = CREAM,
    accent: str = GOLD,
    long: bool = False,
) -> str:
    h = 460 if long else 380
    y0 = 200 if long else 240
    body = textwrap.dedent(f"""
      <g transform="translate(400,400)">
        <ellipse cx="0" cy="220" rx="180" ry="28" fill="#000" opacity="0.10"/>
        <rect x="-160" y="{-y0}" width="320" height="60" rx="14" fill="{lid_color}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-150" y="{-y0+58}" width="300" height="{h}" rx="22" fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-130" y="{-y0+90}" width="260" height="220" rx="14" fill="{CREAM}"/>
        <text x="0" y="{-y0+150}" font-family="Georgia, serif" font-size="36" font-weight="700" fill="{MAROON}" text-anchor="middle">Safiya</text>
        <text x="0" y="{-y0+182}" font-family="Georgia, serif" font-size="20" font-style="italic" fill="{GOLD}" text-anchor="middle">authentic premium</text>
        <text x="0" y="{-y0+230}" font-family="Georgia, serif" font-size="32" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
        <rect x="-80" y="{-y0+260}" width="160" height="34" rx="17" fill="{GOLD}"/>
        <text x="0" y="{-y0+283}" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="{DARK}" text-anchor="middle">{size_label}</text>
        <!-- date silhouettes -->
        <g transform="translate(0,{h-y0+10})">
          <ellipse cx="-50" cy="0" rx="22" ry="34" fill="{flesh_color}"/>
          <ellipse cx="0" cy="-6" rx="24" ry="36" fill="{flesh_color}"/>
          <ellipse cx="52" cy="2" rx="22" ry="34" fill="{flesh_color}"/>
          <ellipse cx="-50" cy="-8" rx="6" ry="8" fill="{DARK}" opacity="0.5"/>
          <ellipse cx="0" cy="-14" rx="6" ry="8" fill="{DARK}" opacity="0.5"/>
          <ellipse cx="52" cy="-6" rx="6" ry="8" fill="{DARK}" opacity="0.5"/>
        </g>
        <text x="0" y="220" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="{WHITE}" text-anchor="middle" letter-spacing="3">HALAL · BPOM RI</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


def kurma_box(label: str, size_label: str, *, bg: str = CREAM, primary: str = MAROON, accent: str = GOLD) -> str:
    body = textwrap.dedent(f"""
      <g transform="translate(400,400)">
        <ellipse cx="0" cy="240" rx="220" ry="22" fill="#000" opacity="0.10"/>
        <rect x="-220" y="-220" width="440" height="440" rx="20" fill="{primary}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-200" y="-200" width="400" height="400" rx="14" fill="none" stroke="{accent}" stroke-width="2"/>
        <rect x="-160" y="-160" width="320" height="190" rx="10" fill="{CREAM}"/>
        <text x="0" y="-100" font-family="Georgia, serif" font-size="42" font-weight="700" fill="{primary}" text-anchor="middle">Safiya</text>
        <text x="0" y="-66" font-family="Georgia, serif" font-size="18" font-style="italic" fill="{GOLD}" text-anchor="middle">premium · authentic · halal</text>
        <text x="0" y="-22" font-family="Georgia, serif" font-size="36" font-weight="700" fill="{primary}" text-anchor="middle">{label}</text>
        <line x1="-100" y1="60" x2="100" y2="60" stroke="{accent}" stroke-width="2"/>
        <rect x="-70" y="80" width="140" height="38" rx="19" fill="{accent}"/>
        <text x="0" y="106" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="{DARK}" text-anchor="middle">{size_label}</text>
        <g transform="translate(0,170)">
          <ellipse cx="-60" cy="0" rx="20" ry="30" fill="{primary}" opacity="0.85"/>
          <ellipse cx="-20" cy="-4" rx="22" ry="32" fill="{primary}" opacity="0.85"/>
          <ellipse cx="22" cy="0" rx="20" ry="30" fill="{primary}" opacity="0.85"/>
          <ellipse cx="60" cy="-4" rx="22" ry="32" fill="{primary}" opacity="0.85"/>
        </g>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


def kurma_tangkai(label: str, size_label: str, *, bg: str = CREAM) -> str:
    body = textwrap.dedent(f"""
      <g transform="translate(400,400)">
        <ellipse cx="0" cy="280" rx="180" ry="20" fill="#000" opacity="0.10"/>
        <rect x="-180" y="-260" width="360" height="540" rx="12" fill="{CREAM}" stroke="{MAROON}" stroke-width="3"/>
        <rect x="-180" y="-260" width="360" height="80" fill="{MAROON}"/>
        <text x="0" y="-208" font-family="Georgia, serif" font-size="34" font-weight="700" fill="{CREAM}" text-anchor="middle">Safiya</text>
        <text x="0" y="-130" font-family="Georgia, serif" font-size="28" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
        <!-- branch + dates -->
        <g transform="translate(0,30)">
          <path d="M 0 -100 C -20 -60, -30 -20, -10 40 C 0 70, 10 100, 0 130" stroke="{FOREST}" stroke-width="4" fill="none"/>
          <ellipse cx="-30" cy="-70" rx="14" ry="22" fill="{MAROON}"/>
          <ellipse cx="-50" cy="-30" rx="14" ry="22" fill="{MAROON}"/>
          <ellipse cx="-40" cy="10" rx="14" ry="22" fill="{MAROON}"/>
          <ellipse cx="-20" cy="40" rx="14" ry="22" fill="{MAROON}"/>
          <ellipse cx="30" cy="-80" rx="14" ry="22" fill="{MAROON}"/>
          <ellipse cx="50" cy="-40" rx="14" ry="22" fill="{MAROON}"/>
          <ellipse cx="40" cy="0" rx="14" ry="22" fill="{MAROON}"/>
          <ellipse cx="20" cy="40" rx="14" ry="22" fill="{MAROON}"/>
        </g>
        <rect x="-90" y="200" width="180" height="42" rx="21" fill="{GOLD}"/>
        <text x="0" y="228" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="{DARK}" text-anchor="middle">{size_label}</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# ----- Muesli / Cereal pouch -----

def pouch(label: str, size_label: str, *, bg: str = CREAM, body_color: str = MAROON, accent: str = GOLD, art: str = "berry") -> str:
    if art == "berry":
        art_svg = f"""
          <circle cx="-60" cy="20" r="22" fill="#A8424B"/>
          <circle cx="-30" cy="36" r="20" fill="#8E2A30"/>
          <circle cx="0" cy="14" r="18" fill="{GOLD}"/>
          <ellipse cx="30" cy="30" rx="22" ry="14" fill="#C9A961" transform="rotate(20 30 30)"/>
          <circle cx="60" cy="14" r="18" fill="#5B341E"/>
        """
    elif art == "choco":
        art_svg = f"""
          <rect x="-60" y="-10" width="40" height="50" rx="4" fill="#3B1F12"/>
          <rect x="-12" y="-4" width="40" height="44" rx="4" fill="#5C3A20"/>
          <rect x="34" y="0" width="36" height="40" rx="4" fill="#3B1F12"/>
          <ellipse cx="-12" cy="50" rx="80" ry="8" fill="{DARK}" opacity="0.18"/>
        """
    else:  # generic seeds
        art_svg = f"""
          <ellipse cx="-50" cy="20" rx="10" ry="6" fill="{GOLD}"/>
          <ellipse cx="-10" cy="30" rx="10" ry="6" fill="{FOREST}"/>
          <ellipse cx="30" cy="14" rx="10" ry="6" fill="{MAROON}"/>
          <ellipse cx="60" cy="30" rx="10" ry="6" fill="{GOLD}"/>
          <ellipse cx="0" cy="-2" rx="10" ry="6" fill="{FOREST}"/>
        """
    body = textwrap.dedent(f"""
      <g transform="translate(400,400)">
        <path d="M -200 -260 Q -200 -300 -160 -300 L 160 -300 Q 200 -300 200 -260 L 200 260 Q 200 300 160 300 L -160 300 Q -200 300 -200 260 Z" fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <path d="M -200 -260 Q -200 -300 -160 -300 L 160 -300 Q 200 -300 200 -260 L 200 -180 L -200 -180 Z" fill="{DARK}" opacity="0.2"/>
        <rect x="-160" y="-140" width="320" height="160" rx="10" fill="{CREAM}"/>
        <text x="0" y="-90" font-family="Georgia, serif" font-size="32" font-weight="700" fill="{body_color}" text-anchor="middle">Safiya</text>
        <text x="0" y="-58" font-family="Georgia, serif" font-size="14" font-style="italic" fill="{GOLD}" text-anchor="middle">healthy · tasty · authentic</text>
        <text x="0" y="-20" font-family="Georgia, serif" font-size="26" font-weight="700" fill="{body_color}" text-anchor="middle">{label}</text>
        <g transform="translate(0,90)">
          {art_svg}
        </g>
        <rect x="-70" y="190" width="140" height="38" rx="19" fill="{accent}"/>
        <text x="0" y="216" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="{DARK}" text-anchor="middle">{size_label}</text>
        <text x="0" y="260" font-family="Inter, sans-serif" font-size="10" font-weight="600" fill="{CREAM}" text-anchor="middle" letter-spacing="3">HALAL · BPOM RI</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


def honey_jar(label: str, size_label: str, *, bg: str = CREAM, hue: str = "#C28E2E") -> str:
    body = textwrap.dedent(f"""
      <g transform="translate(400,400)">
        <ellipse cx="0" cy="240" rx="180" ry="22" fill="#000" opacity="0.10"/>
        <rect x="-130" y="-240" width="260" height="50" rx="8" fill="{MAROON}"/>
        <path d="M -150 -180 Q -150 -200 -130 -200 L 130 -200 Q 150 -180 150 -180 L 150 200 Q 150 240 110 240 L -110 240 Q -150 240 -150 200 Z" fill="{hue}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-110" y="-140" width="220" height="220" rx="10" fill="{CREAM}"/>
        <text x="0" y="-90" font-family="Georgia, serif" font-size="34" font-weight="700" fill="{MAROON}" text-anchor="middle">Safiya</text>
        <text x="0" y="-60" font-family="Georgia, serif" font-size="14" font-style="italic" fill="{GOLD}" text-anchor="middle">pure & raw</text>
        <text x="0" y="-22" font-family="Georgia, serif" font-size="28" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
        <!-- honey dripper -->
        <g transform="translate(0,30)">
          <rect x="-4" y="-10" width="8" height="40" rx="2" fill="{GOLD}"/>
          <ellipse cx="0" cy="40" rx="22" ry="12" fill="{GOLD}"/>
          <ellipse cx="0" cy="44" rx="12" ry="6" fill="{MAROON}" opacity="0.5"/>
        </g>
        <rect x="-80" y="170" width="160" height="38" rx="19" fill="{GOLD}"/>
        <text x="0" y="196" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="{DARK}" text-anchor="middle">{size_label}</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


def bottle(label: str, size_label: str, *, bg: str = CREAM, body_color: str = "#F1E6CB") -> str:
    body = textwrap.dedent(f"""
      <g transform="translate(400,400)">
        <ellipse cx="0" cy="260" rx="160" ry="20" fill="#000" opacity="0.10"/>
        <rect x="-30" y="-300" width="60" height="60" rx="6" fill="{MAROON}"/>
        <path d="M -100 -240 L 100 -240 L 130 -180 L 130 240 L -130 240 L -130 -180 Z" fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-90" y="-120" width="180" height="200" rx="8" fill="{CREAM}"/>
        <text x="0" y="-70" font-family="Georgia, serif" font-size="30" font-weight="700" fill="{MAROON}" text-anchor="middle">Safiya</text>
        <text x="0" y="-30" font-family="Georgia, serif" font-size="20" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
        <rect x="-60" y="0" width="120" height="36" rx="18" fill="{GOLD}"/>
        <text x="0" y="25" font-family="Inter, sans-serif" font-size="16" font-weight="700" fill="{DARK}" text-anchor="middle">{size_label}</text>
        <text x="0" y="55" font-family="Inter, sans-serif" font-size="10" font-weight="600" fill="{MAROON}" text-anchor="middle" letter-spacing="2">VCO · NATURAL</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


def small_pack(label: str, size_label: str, *, bg: str = CREAM, body_color: str = MAROON, accent: str = GOLD, kind: str = "salt") -> str:
    if kind == "salt":
        art = f'<g transform="translate(0,40)"><circle cx="-30" cy="0" r="10" fill="#F4DDD8"/><circle cx="0" cy="-6" r="12" fill="#F4DDD8"/><circle cx="30" cy="2" r="10" fill="#F4DDD8"/><circle cx="-10" cy="20" r="8" fill="#F4DDD8"/></g>'
    elif kind == "saffron":
        art = f'<g transform="translate(0,40)"><path d="M -30 0 Q -10 -10 0 0 Q 10 10 30 0" stroke="#C9302C" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M -20 20 Q 0 10 20 20" stroke="#C9302C" stroke-width="6" fill="none" stroke-linecap="round"/></g>'
    elif kind == "chia":
        art = f'<g transform="translate(0,40)"><ellipse cx="-30" cy="0" rx="6" ry="4" fill="{DARK}"/><ellipse cx="-10" cy="10" rx="6" ry="4" fill="{DARK}"/><ellipse cx="10" cy="-6" rx="6" ry="4" fill="{DARK}"/><ellipse cx="30" cy="6" rx="6" ry="4" fill="{DARK}"/><ellipse cx="0" cy="-2" rx="6" ry="4" fill="{DARK}"/></g>'
    elif kind == "rice":
        art = f'<g transform="translate(0,40)"><ellipse cx="-30" cy="0" rx="8" ry="3" fill="#9B3C24" transform="rotate(20 -30 0)"/><ellipse cx="-10" cy="10" rx="8" ry="3" fill="#9B3C24" transform="rotate(-20 -10 10)"/><ellipse cx="10" cy="-6" rx="8" ry="3" fill="#9B3C24" transform="rotate(15 10 -6)"/><ellipse cx="30" cy="6" rx="8" ry="3" fill="#9B3C24" transform="rotate(-30 30 6)"/></g>'
    else:
        art = ''
    body = textwrap.dedent(f"""
      <g transform="translate(400,400)">
        <rect x="-200" y="-280" width="400" height="540" rx="22" fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-160" y="-220" width="320" height="180" rx="12" fill="{CREAM}"/>
        <text x="0" y="-160" font-family="Georgia, serif" font-size="36" font-weight="700" fill="{body_color}" text-anchor="middle">Safiya</text>
        <text x="0" y="-126" font-family="Georgia, serif" font-size="14" font-style="italic" fill="{GOLD}" text-anchor="middle">healthy · pure · halal</text>
        <text x="0" y="-78" font-family="Georgia, serif" font-size="26" font-weight="700" fill="{body_color}" text-anchor="middle">{label}</text>
        {art}
        <rect x="-90" y="160" width="180" height="42" rx="21" fill="{accent}"/>
        <text x="0" y="188" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="{DARK}" text-anchor="middle">{size_label}</text>
        <text x="0" y="230" font-family="Inter, sans-serif" font-size="10" font-weight="600" fill="{CREAM}" text-anchor="middle" letter-spacing="3">HALAL · BPOM RI</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# ----- Hero -----

def hero() -> str:
    body = textwrap.dedent(f"""
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="{SOFT_CREAM}"/>
          <stop offset="100%" stop-color="{CREAM}"/>
        </linearGradient>
        <linearGradient id="palmLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="{FOREST}"/>
          <stop offset="100%" stop-color="#1F4128"/>
        </linearGradient>
      </defs>
      <rect width="800" height="800" fill="url(#bgGrad)"/>
      <!-- subtle pattern -->
      <g opacity="0.06" fill="{MAROON}">
        <circle cx="80" cy="80" r="40"/>
        <circle cx="720" cy="120" r="60"/>
        <circle cx="120" cy="700" r="50"/>
        <circle cx="680" cy="680" r="40"/>
      </g>
      <!-- palm leaves -->
      <g transform="translate(110,640) rotate(-20)">
        <path d="M 0 0 Q 30 -80 0 -160 Q -30 -80 0 0 Z" fill="url(#palmLeaf)"/>
        <path d="M 0 -160 Q 60 -200 80 -260" stroke="url(#palmLeaf)" stroke-width="6" fill="none"/>
        <path d="M 0 -160 Q -60 -200 -80 -260" stroke="url(#palmLeaf)" stroke-width="6" fill="none"/>
      </g>
      <!-- centerpiece kurma jar -->
      <g transform="translate(560,420)">
        <ellipse cx="0" cy="180" rx="120" ry="14" fill="#000" opacity="0.10"/>
        <rect x="-100" y="-180" width="200" height="40" rx="10" fill="{GOLD}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-94" y="-140" width="188" height="320" rx="14" fill="{MAROON}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-78" y="-100" width="156" height="180" rx="8" fill="{CREAM}"/>
        <text x="0" y="-58" font-family="Georgia, serif" font-size="26" font-weight="700" fill="{MAROON}" text-anchor="middle">Safiya</text>
        <text x="0" y="-36" font-family="Georgia, serif" font-size="11" font-style="italic" fill="{GOLD}" text-anchor="middle">authentic premium</text>
        <text x="0" y="0" font-family="Georgia, serif" font-size="20" font-weight="700" fill="{MAROON}" text-anchor="middle">Kurma Sukari</text>
        <ellipse cx="-30" cy="40" rx="14" ry="20" fill="{MAROON}"/>
        <ellipse cx="0" cy="34" rx="16" ry="22" fill="{MAROON}"/>
        <ellipse cx="30" cy="40" rx="14" ry="20" fill="{MAROON}"/>
      </g>
      <text x="60" y="340" font-family="Georgia, serif" font-size="64" font-weight="700" fill="{MAROON}">Safiya</text>
      <text x="60" y="380" font-family="Georgia, serif" font-size="22" font-style="italic" fill="{GOLD}">authentic premium · since 2018</text>
      <text x="60" y="450" font-family="Inter, sans-serif" font-size="16" fill="{DARK}" opacity="0.8">Kurma · Muesli · Madu · Healthy Pantry</text>
    """).strip()
    return svg_wrap(body)


# ----- Generation plan -----

PRODUCTS: list[dict] = [
    # ----- Dates -----
    {
        "slug": "kurma-sukari",
        "category": "Kurma",
        "name": "Kurma Sukari King Dates",
        "tagline": "Premium golden Sukkari dates from Saudi Arabia.",
        "art": "kurma_jar",
        "art_args": {"label": "Kurma Sukari", "lid_color": GOLD, "body_color": MAROON, "flesh_color": "#A06030"},
        "variants": [
            {"size": "500g", "sku": "SAF-SUK-500", "price": 89000, "compare": 135000, "weight": 540},
            {"size": "850g", "sku": "SAF-SUK-850", "price": 139000, "compare": 195000, "weight": 900},
            {"size": "1kg", "sku": "SAF-SUK-1K", "price": 159000, "compare": 235000, "weight": 1060},
            {"size": "3kg", "sku": "SAF-SUK-3K", "price": 425000, "compare": 685000, "weight": 3100},
        ],
        "parent_views": ["front", "side", "info"],
    },
    {
        "slug": "kurma-ajwa",
        "category": "Kurma",
        "name": "Kurma Ajwa Madinah",
        "tagline": "Kurma Nabi — soft, sweet, authentic from Madinah.",
        "art": "kurma_jar",
        "art_args": {"label": "Kurma Ajwa", "lid_color": DARK, "body_color": "#3A1A0E", "flesh_color": "#2A0F08", "bg": SOFT_CREAM},
        "variants": [
            {"size": "500g", "sku": "SAF-AJW-500", "price": 169000, "compare": 245000, "weight": 540},
            {"size": "850g", "sku": "SAF-AJW-850", "price": 265000, "compare": 385000, "weight": 900},
            {"size": "1kg", "sku": "SAF-AJW-1K", "price": 315000, "compare": 445000, "weight": 1060},
        ],
        "parent_views": ["front", "side", "info"],
    },
    {
        "slug": "kurma-tunisia-tangkai",
        "category": "Kurma",
        "name": "Kurma Tunisia Tangkai",
        "tagline": "Branch-dried Tunisia dates, still on the stem.",
        "art": "kurma_tangkai",
        "art_args": {"label": "Kurma Tunisia Tangkai"},
        "variants": [
            {"size": "500g", "sku": "SAF-TNT-500", "price": 79000, "compare": 119000, "weight": 540},
            {"size": "1kg", "sku": "SAF-TNT-1K", "price": 145000, "compare": 215000, "weight": 1060},
        ],
        "parent_views": ["front", "side"],
    },
    {
        "slug": "kurma-tunisia-madu",
        "category": "Kurma",
        "name": "Kurma Tunisia Madu Deglet Noor",
        "tagline": "Honey-soft Deglet Noor dates from Tunisia.",
        "art": "kurma_box",
        "art_args": {"label": "Tunisia Madu", "primary": "#8B4319", "accent": GOLD},
        "variants": [
            {"size": "500g", "sku": "SAF-TMD-500", "price": 75000, "compare": 115000, "weight": 540},
            {"size": "1kg", "sku": "SAF-TMD-1K", "price": 139000, "compare": 205000, "weight": 1060},
        ],
        "parent_views": ["front", "side"],
    },
    {
        "slug": "kurma-khalas",
        "category": "Kurma",
        "name": "Kurma Khalas Vacuum",
        "tagline": "Caramel-toned Khalas dates, vacuum-sealed.",
        "art": "kurma_box",
        "art_args": {"label": "Kurma Khalas", "primary": "#5B2D14", "accent": GOLD},
        "variants": [
            {"size": "500g", "sku": "SAF-KHA-500", "price": 69000, "compare": 105000, "weight": 540},
            {"size": "1kg", "sku": "SAF-KHA-1K", "price": 125000, "compare": 195000, "weight": 1060},
        ],
        "parent_views": ["front", "side"],
    },
    # ----- Muesli & Cereal -----
    {
        "slug": "muesli-fruit-seed",
        "category": "Sereal & Granola",
        "name": "Safiya Muesli Fruit & Seed",
        "tagline": "Rolled oats, raisins, almonds, pumpkin & sunflower seeds.",
        "art": "pouch",
        "art_args": {"label": "Muesli Fruit & Seed", "body_color": MAROON, "art": "berry"},
        "variants": [
            {"size": "300g", "sku": "SAF-MUS-FS-300", "price": 65000, "compare": 89000, "weight": 320},
            {"size": "500g", "sku": "SAF-MUS-FS-500", "price": 95000, "compare": 135000, "weight": 540},
        ],
        "parent_views": ["front", "side", "info"],
    },
    {
        "slug": "muesli-choco-milk",
        "category": "Sereal & Granola",
        "name": "Safiya Muesli Choco Milk",
        "tagline": "Chocolate cocoa muesli with chia seed.",
        "art": "pouch",
        "art_args": {"label": "Muesli Choco Milk", "body_color": "#3A1B0E", "art": "choco"},
        "variants": [
            {"size": "300g", "sku": "SAF-MUS-CM-300", "price": 69000, "compare": 95000, "weight": 320},
            {"size": "500g", "sku": "SAF-MUS-CM-500", "price": 99000, "compare": 145000, "weight": 540},
        ],
        "parent_views": ["front", "side", "info"],
    },
    {
        "slug": "berry-yogurt-cereal",
        "category": "Sereal & Granola",
        "name": "Safiya Berry Yogurt Cereal",
        "tagline": "Yogurt-coated cereal with mixed berry crunch.",
        "art": "pouch",
        "art_args": {"label": "Berry Yogurt Cereal", "body_color": "#7A2A35", "art": "berry"},
        "variants": [
            {"size": "300g", "sku": "SAF-BYC-300", "price": 75000, "compare": 105000, "weight": 320},
        ],
        "parent_views": ["front", "side"],
    },
    # ----- Healthy pantry -----
    {
        "slug": "chia-seed",
        "category": "Healthy Pantry",
        "name": "Safiya Chia Seed",
        "tagline": "Premium black chia seed — high omega-3 & fiber.",
        "art": "small_pack",
        "art_args": {"label": "Chia Seed", "body_color": "#2A1810", "accent": GOLD, "kind": "chia"},
        "variants": [
            {"size": "250g", "sku": "SAF-CHI-250", "price": 49000, "compare": 75000, "weight": 280},
            {"size": "500g", "sku": "SAF-CHI-500", "price": 85000, "compare": 125000, "weight": 540},
        ],
        "parent_views": ["front", "side"],
    },
    {
        "slug": "beras-merah",
        "category": "Healthy Pantry",
        "name": "Safiya Beras Merah Organik",
        "tagline": "Organic red rice, low GI, rich in fiber.",
        "art": "small_pack",
        "art_args": {"label": "Beras Merah", "body_color": "#7B2D26", "accent": GOLD, "kind": "rice"},
        "variants": [
            {"size": "1kg", "sku": "SAF-BMR-1K", "price": 39000, "compare": 55000, "weight": 1060},
            {"size": "2kg", "sku": "SAF-BMR-2K", "price": 72000, "compare": 105000, "weight": 2100},
        ],
        "parent_views": ["front", "side"],
    },
    {
        "slug": "garam-himalaya",
        "category": "Healthy Pantry",
        "name": "Safiya Garam Himalaya Pink Salt",
        "tagline": "Pure Himalayan pink salt, mineral-rich.",
        "art": "small_pack",
        "art_args": {"label": "Garam Himalaya", "body_color": "#A65B5B", "accent": GOLD, "kind": "salt"},
        "variants": [
            {"size": "250g", "sku": "SAF-HIM-250", "price": 32000, "compare": 49000, "weight": 280},
            {"size": "500g", "sku": "SAF-HIM-500", "price": 55000, "compare": 79000, "weight": 540},
        ],
        "parent_views": ["front", "side"],
    },
    {
        "slug": "saffron",
        "category": "Healthy Pantry",
        "name": "Safiya Saffron Premium",
        "tagline": "Grade A Persian saffron threads.",
        "art": "small_pack",
        "art_args": {"label": "Saffron", "body_color": "#C9302C", "accent": GOLD, "kind": "saffron"},
        "variants": [
            {"size": "1g", "sku": "SAF-SAF-1G", "price": 85000, "compare": 125000, "weight": 20},
            {"size": "3g", "sku": "SAF-SAF-3G", "price": 235000, "compare": 345000, "weight": 30},
        ],
        "parent_views": ["front", "side"],
    },
    # ----- Honey -----
    {
        "slug": "madu-akasia",
        "category": "Madu",
        "name": "Safiya Madu Akasia",
        "tagline": "Pure raw acacia honey — light & floral.",
        "art": "honey_jar",
        "art_args": {"label": "Madu Akasia", "hue": "#E4C167"},
        "variants": [
            {"size": "250ml", "sku": "SAF-MAK-250", "price": 79000, "compare": 119000, "weight": 380},
            {"size": "500ml", "sku": "SAF-MAK-500", "price": 145000, "compare": 215000, "weight": 720},
        ],
        "parent_views": ["front", "side"],
    },
    {
        "slug": "madu-baduy",
        "category": "Madu",
        "name": "Safiya Madu Baduy Hutan",
        "tagline": "Wild forest honey from Baduy, raw & unfiltered.",
        "art": "honey_jar",
        "art_args": {"label": "Madu Baduy", "hue": "#9B5A1F"},
        "variants": [
            {"size": "250ml", "sku": "SAF-MBD-250", "price": 89000, "compare": 135000, "weight": 380},
            {"size": "500ml", "sku": "SAF-MBD-500", "price": 165000, "compare": 245000, "weight": 720},
        ],
        "parent_views": ["front", "side"],
    },
    {
        "slug": "madu-murni",
        "category": "Madu",
        "name": "Safiya Madu Murni",
        "tagline": "Pure raw honey, multi-flora.",
        "art": "honey_jar",
        "art_args": {"label": "Madu Murni", "hue": "#C28E2E"},
        "variants": [
            {"size": "250ml", "sku": "SAF-MMR-250", "price": 69000, "compare": 105000, "weight": 380},
            {"size": "500ml", "sku": "SAF-MMR-500", "price": 125000, "compare": 195000, "weight": 720},
        ],
        "parent_views": ["front", "side"],
    },
    # ----- Oils -----
    {
        "slug": "vco-virgin-coconut-oil",
        "category": "Madu",
        "name": "Safiya VCO Virgin Coconut Oil",
        "tagline": "Cold-pressed virgin coconut oil.",
        "art": "bottle",
        "art_args": {"label": "VCO Coconut", "body_color": "#F1E6CB"},
        "variants": [
            {"size": "250ml", "sku": "SAF-VCO-250", "price": 65000, "compare": 95000, "weight": 320},
            {"size": "500ml", "sku": "SAF-VCO-500", "price": 119000, "compare": 175000, "weight": 600},
        ],
        "parent_views": ["front", "side"],
    },
]


ART_FNS = {
    "kurma_jar": kurma_jar,
    "kurma_box": kurma_box,
    "kurma_tangkai": kurma_tangkai,
    "pouch": pouch,
    "honey_jar": honey_jar,
    "bottle": bottle,
    "small_pack": small_pack,
}


def _bg_for_view(idx: int, base_bg: str) -> str:
    """Subtle background variation across the parent gallery."""
    if idx == 0:
        return base_bg
    if idx == 1:
        return SOFT_CREAM
    return CREAM


def write_assets() -> int:
    count = 0
    for p in PRODUCTS:
        fn = ART_FNS[p["art"]]
        args = dict(p["art_args"])
        base_bg = args.pop("bg", CREAM)
        first_size = p["variants"][0]["size"]
        # ---- Parent gallery: front / side / info using first variant size ----
        for i, view in enumerate(p["parent_views"]):
            svg = fn(size_label=first_size, **args, bg=_bg_for_view(i, base_bg))
            out = PRODUCT_DIR / f"{p['slug']}-{view}.svg"
            out.write_text(svg)
            count += 1
        # ---- Per-variant images ----
        for v in p["variants"]:
            svg = fn(size_label=v["size"], **args, bg=base_bg)
            out = PRODUCT_DIR / f"{v['sku'].lower()}.svg"
            out.write_text(svg)
            count += 1
    # Hero
    (HERO_DIR / "main.svg").write_text(hero())
    count += 1
    return count


if __name__ == "__main__":
    n = write_assets()
    print(f"Wrote {n} SVG assets.")
    # Also emit a small catalog summary
    summary = {p["slug"]: {"category": p["category"], "variants": [v["sku"] for v in p["variants"]]} for p in PRODUCTS}
    print(json.dumps(summary, indent=2)[:2000])
