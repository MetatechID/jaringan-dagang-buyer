#!/usr/bin/env python3
"""Generate Safiya Food product SVG mockups.

Each VARIANT (child SKU) gets a visually distinct image: different package
dimensions, different package shape for the biggest sizes (jar → ember bucket
for 3kg), different element counts (more dates for bigger jars), and a
size-tinted badge — not just different label text.

Run once. Idempotent.
"""
from __future__ import annotations

import json
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
COPPER = "#B8761F"
DARK_COPPER = "#7A4A0E"
CREAM = "#FBF6EC"
SOFT_CREAM = "#F3E7CF"
FOREST = "#3A6B47"
DARK = "#2A1810"
WHITE = "#FFFFFF"


# ---- Variant scale helpers ----
# Each variant size maps to a "scale tier" that drives geometry + accents.

SIZE_TIERS = {
    # gram-based sizes
    "1g":   ("xs", "1 gram"),
    "3g":   ("xs+", "3 gram"),
    "20g":  ("xs+", "20 gram"),
    "30g":  ("xs+", "30 gram"),
    "100g": ("s", "100 gram"),
    "250g": ("s", "250 gram"),
    "300g": ("s", "300 gram"),
    "500g": ("m", "500 gram"),
    "850g": ("l", "850 gram"),
    "1kg":  ("xl", "1 kilogram"),
    "2kg":  ("xxl", "2 kilogram"),
    "3kg":  ("xxl", "3 kilogram"),
    # ml-based
    "250ml": ("s", "250 ml"),
    "500ml": ("m", "500 ml"),
}


def tier(size_label: str) -> tuple[str, str]:
    return SIZE_TIERS.get(size_label, ("m", size_label))


def badge_color_for(tier_id: str) -> str:
    return {
        "xs":  "#E0C99B",
        "xs+": "#E0C99B",
        "s":   GOLD,
        "m":   COPPER,
        "l":   DARK_COPPER,
        "xl":  "#5C3A0B",
        "xxl": DARK,
    }.get(tier_id, GOLD)


def svg_wrap(body: str, bg: str = CREAM) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" '
        'preserveAspectRatio="xMidYMid slice">\n'
        + f'  <rect width="800" height="800" fill="{bg}"/>\n'
        + body
        + "\n</svg>\n"
    )


def shadow_oval(w: int = 180, opacity: float = 0.10, y: int = 220) -> str:
    return f'<ellipse cx="0" cy="{y}" rx="{w}" ry="{int(w*0.12)}" fill="#000" opacity="{opacity}"/>'


# -----------------------------------------------------------------------------
# Kurma JAR — scales meaningfully with size; 3kg becomes an EMBER (bucket).
# -----------------------------------------------------------------------------

def _date_row(y: int, count: int, flesh: str) -> str:
    items = []
    spacing = 44
    start = -(count - 1) * spacing / 2
    for i in range(count):
        x = int(start + i * spacing)
        items.append(
            f'<ellipse cx="{x}" cy="{y}" rx="18" ry="26" fill="{flesh}"/>'
            f'<ellipse cx="{x}" cy="{y-8}" rx="6" ry="8" fill="{DARK}" opacity="0.45"/>'
        )
    return "".join(items)


def kurma_jar(
    label: str,
    size_label: str,
    *,
    lid_color: str = GOLD,
    body_color: str = MAROON,
    flesh_color: str = "#8B3D24",
    bg: str = CREAM,
) -> str:
    t, _ = tier(size_label)

    # 3kg goes to ember (bucket) — completely different silhouette.
    if t in ("xxl",):
        return kurma_ember(label, size_label,
                           body_color=body_color, lid_color=lid_color,
                           flesh_color=flesh_color, bg=bg)

    # Jar geometry per tier
    geom = {
        "s":  {"w": 220, "h": 320, "lid_w": 240, "rows": 1, "row_count": 2},
        "m":  {"w": 260, "h": 400, "lid_w": 280, "rows": 2, "row_count": 3},
        "l":  {"w": 290, "h": 470, "lid_w": 310, "rows": 2, "row_count": 4},
        "xl": {"w": 320, "h": 540, "lid_w": 340, "rows": 3, "row_count": 4},
    }[t]
    half_w = geom["w"] // 2
    half_lid = geom["lid_w"] // 2
    body_top = -geom["h"] // 2 + 30
    body_bottom = body_top + geom["h"]
    label_top = body_top + 60
    label_h = 240
    badge_y = label_top + label_h - 36

    # Decorative dates inside (visible through label window? actually below jar
    # so the variant feels "stocked")
    dates_block = ""
    for r in range(geom["rows"]):
        y = body_bottom + 36 + r * 56
        dates_block += _date_row(y, geom["row_count"], flesh_color)

    body = textwrap.dedent(f"""
      <g transform="translate(400, 360)">
        {shadow_oval(w=half_w + 20, y=body_bottom + 26)}
        <!-- Lid -->
        <rect x="{-half_lid}" y="{body_top - 50}" width="{2*half_lid}" height="50" rx="12" fill="{lid_color}" stroke="{DARK}" stroke-width="2"/>
        <rect x="{-half_lid + 8}" y="{body_top - 50}" width="{2*half_lid - 16}" height="14" rx="6" fill="{DARK}" opacity="0.18"/>
        <!-- Jar body -->
        <rect x="{-half_w}" y="{body_top}" width="{2*half_w}" height="{geom['h']}" rx="22" fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <!-- Label panel -->
        <rect x="{-half_w + 16}" y="{label_top}" width="{2*half_w - 32}" height="{label_h}" rx="10" fill="{CREAM}"/>
        <text x="0" y="{label_top + 46}" font-family="Georgia, serif" font-size="34" font-weight="700" fill="{MAROON}" text-anchor="middle">Safiya</text>
        <text x="0" y="{label_top + 72}" font-family="Georgia, serif" font-size="14" font-style="italic" fill="{GOLD}" text-anchor="middle">authentic premium</text>
        <line x1="-60" y1="{label_top + 86}" x2="60" y2="{label_top + 86}" stroke="{GOLD}" stroke-width="1"/>
        <text x="0" y="{label_top + 130}" font-family="Georgia, serif" font-size="26" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
        <text x="0" y="{label_top + 158}" font-family="Inter, sans-serif" font-size="11" fill="{DARK}" opacity="0.6" text-anchor="middle" letter-spacing="2">PREMIUM · HALAL</text>
        <!-- Size badge -->
        <rect x="-78" y="{badge_y}" width="156" height="32" rx="16" fill="{badge_color_for(t)}"/>
        <text x="0" y="{badge_y + 22}" font-family="Inter, sans-serif" font-size="16" font-weight="800" fill="{WHITE}" text-anchor="middle" letter-spacing="0.5">{size_label.upper()}</text>
        <!-- Halal pill bottom of jar -->
        <text x="0" y="{body_bottom - 14}" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="{WHITE}" text-anchor="middle" letter-spacing="2.5">HALAL · BPOM RI</text>
        {dates_block}
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


def kurma_ember(
    label: str,
    size_label: str,
    *,
    body_color: str = MAROON,
    lid_color: str = GOLD,
    flesh_color: str = "#8B3D24",
    bg: str = CREAM,
) -> str:
    """Bulk packaging — 3kg ember (bucket) with handle. Looks distinctly
    different from the jar SKUs."""
    body = textwrap.dedent(f"""
      <g transform="translate(400, 380)">
        {shadow_oval(w=260, y=240)}
        <!-- Handle -->
        <path d="M -200 -180 Q 0 -280 200 -180" stroke="{DARK}" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M -200 -180 Q 0 -280 200 -180" stroke="{COPPER}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <!-- Lid disc -->
        <ellipse cx="0" cy="-180" rx="240" ry="36" fill="{lid_color}" stroke="{DARK}" stroke-width="2"/>
        <ellipse cx="0" cy="-188" rx="200" ry="28" fill="none" stroke="{DARK}" stroke-width="1.5" opacity="0.4"/>
        <!-- Ember body — slightly tapered trapezoid -->
        <path d="M -240 -180 L -200 220 L 200 220 L 240 -180 Z" fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <!-- Front label sticker -->
        <rect x="-170" y="-130" width="340" height="280" rx="14" fill="{CREAM}" stroke="{GOLD}" stroke-width="2"/>
        <text x="0" y="-86" font-family="Georgia, serif" font-size="44" font-weight="700" fill="{MAROON}" text-anchor="middle">Safiya</text>
        <text x="0" y="-58" font-family="Georgia, serif" font-size="16" font-style="italic" fill="{GOLD}" text-anchor="middle">authentic premium · halal</text>
        <line x1="-110" y1="-42" x2="110" y2="-42" stroke="{GOLD}" stroke-width="1.5"/>
        <text x="0" y="-4" font-family="Georgia, serif" font-size="32" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
        <text x="0" y="20" font-family="Inter, sans-serif" font-size="11" fill="{DARK}" opacity="0.65" text-anchor="middle" letter-spacing="3">EMBER · BULK PACK</text>
        <!-- Large size badge -->
        <rect x="-110" y="60" width="220" height="44" rx="22" fill="{DARK}"/>
        <text x="0" y="90" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="{GOLD}" text-anchor="middle" letter-spacing="1.5">{size_label.upper()} · FAMILY</text>
        <!-- Date silhouettes -->
        <g transform="translate(0, 130)">
          <ellipse cx="-80" cy="0" rx="22" ry="32" fill="{flesh_color}"/>
          <ellipse cx="-40" cy="-6" rx="24" ry="34" fill="{flesh_color}"/>
          <ellipse cx="0" cy="0" rx="22" ry="32" fill="{flesh_color}"/>
          <ellipse cx="40" cy="-6" rx="24" ry="34" fill="{flesh_color}"/>
          <ellipse cx="80" cy="0" rx="22" ry="32" fill="{flesh_color}"/>
        </g>
        <!-- Volume mark -->
        <text x="200" y="180" font-family="Inter, sans-serif" font-size="13" font-weight="700" fill="{WHITE}" text-anchor="end" letter-spacing="1">NETTO</text>
        <text x="200" y="200" font-family="Inter, sans-serif" font-size="16" font-weight="800" fill="{GOLD}" text-anchor="end">{size_label.upper()}</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# -----------------------------------------------------------------------------
# Kurma BOX — 500g vs 1kg looks distinctly different (square vs long rectangle).
# -----------------------------------------------------------------------------

def kurma_box(label: str, size_label: str, *, bg: str = CREAM,
              primary: str = MAROON, accent: str = GOLD) -> str:
    t, _ = tier(size_label)
    if t in ("xl", "xxl"):
        return kurma_box_long(label, size_label, bg=bg, primary=primary, accent=accent)
    # 500g — square gift box
    body = textwrap.dedent(f"""
      <g transform="translate(400, 400)">
        {shadow_oval(w=220, y=240)}
        <!-- Box body -->
        <rect x="-220" y="-220" width="440" height="440" rx="18" fill="{primary}" stroke="{DARK}" stroke-width="2"/>
        <!-- Ribbon -->
        <rect x="-30" y="-220" width="60" height="440" fill="{accent}"/>
        <rect x="-220" y="-30" width="440" height="60" fill="{accent}"/>
        <circle r="32" cx="0" cy="0" fill="{accent}"/>
        <circle r="22" cx="0" cy="0" fill="{primary}"/>
        <!-- Center label sticker -->
        <rect x="-150" y="-170" width="300" height="120" rx="10" fill="{CREAM}"/>
        <text x="0" y="-130" font-family="Georgia, serif" font-size="32" font-weight="700" fill="{primary}" text-anchor="middle">Safiya</text>
        <text x="0" y="-100" font-family="Georgia, serif" font-size="20" font-weight="700" fill="{primary}" text-anchor="middle">{label}</text>
        <text x="0" y="-78" font-family="Inter, sans-serif" font-size="11" fill="{DARK}" opacity="0.6" text-anchor="middle" letter-spacing="2">GIFT EDITION</text>
        <!-- Bottom size badge -->
        <rect x="-90" y="62" width="180" height="40" rx="20" fill="{badge_color_for(t)}"/>
        <text x="0" y="89" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="{WHITE}" text-anchor="middle">{size_label.upper()}</text>
        <!-- Bottom date row -->
        <g transform="translate(0, 162)">
          {_date_row(0, 4, primary)}
        </g>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


def kurma_box_long(label: str, size_label: str, *, bg: str = CREAM,
                   primary: str = MAROON, accent: str = GOLD) -> str:
    body = textwrap.dedent(f"""
      <g transform="translate(400, 400)">
        {shadow_oval(w=300, y=200)}
        <!-- Box: wide rectangle -->
        <rect x="-300" y="-160" width="600" height="320" rx="14" fill="{primary}" stroke="{DARK}" stroke-width="2"/>
        <rect x="-300" y="-160" width="600" height="50" fill="{DARK}" opacity="0.18"/>
        <!-- Two corner accents -->
        <path d="M -300 -160 L -300 -110 L -250 -160 Z" fill="{accent}"/>
        <path d="M 300 -160 L 300 -110 L 250 -160 Z" fill="{accent}"/>
        <!-- Center label panel -->
        <rect x="-200" y="-90" width="400" height="180" rx="12" fill="{CREAM}"/>
        <text x="0" y="-50" font-family="Georgia, serif" font-size="36" font-weight="700" fill="{primary}" text-anchor="middle">Safiya</text>
        <text x="0" y="-24" font-family="Georgia, serif" font-size="14" font-style="italic" fill="{GOLD}" text-anchor="middle">authentic premium · halal · BPOM RI</text>
        <text x="0" y="20" font-family="Georgia, serif" font-size="28" font-weight="700" fill="{primary}" text-anchor="middle">{label}</text>
        <text x="0" y="46" font-family="Inter, sans-serif" font-size="11" fill="{DARK}" opacity="0.6" text-anchor="middle" letter-spacing="3">SHARE PACK · FAMILY EDITION</text>
        <!-- Size badge wide -->
        <rect x="-110" y="60" width="220" height="22" rx="11" fill="{badge_color_for(t := tier(size_label)[0])}"/>
        <text x="0" y="76" font-family="Inter, sans-serif" font-size="13" font-weight="800" fill="{WHITE}" text-anchor="middle" letter-spacing="2">{size_label.upper()} NETTO</text>
        <!-- Side date silhouettes -->
        <g transform="translate(-235, 30)">
          <ellipse cx="0" cy="0" rx="18" ry="24" fill="{accent}"/>
          <ellipse cx="0" cy="40" rx="14" ry="20" fill="{accent}"/>
        </g>
        <g transform="translate(235, 30)">
          <ellipse cx="0" cy="0" rx="18" ry="24" fill="{accent}"/>
          <ellipse cx="0" cy="40" rx="14" ry="20" fill="{accent}"/>
        </g>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# -----------------------------------------------------------------------------
# Kurma TANGKAI — branch with dates. Bigger size = more dates.
# -----------------------------------------------------------------------------

def kurma_tangkai(label: str, size_label: str, *, bg: str = CREAM) -> str:
    t, _ = tier(size_label)
    branches = 1 if t in ("s", "m") else 2
    body = textwrap.dedent(f"""
      <g transform="translate(400, 400)">
        {shadow_oval(w=180, y=300)}
        <!-- Outer transparent wrap (cellophane look) -->
        <rect x="-200" y="-300" width="400" height="600" rx="20" fill="rgba(255,255,255,0.4)" stroke="{MAROON}" stroke-width="3"/>
        <!-- Top sticker bar -->
        <rect x="-200" y="-300" width="400" height="90" fill="{MAROON}"/>
        <text x="0" y="-244" font-family="Georgia, serif" font-size="36" font-weight="700" fill="{CREAM}" text-anchor="middle">Safiya</text>
        <text x="0" y="-220" font-family="Inter, sans-serif" font-size="11" fill="{GOLD}" text-anchor="middle" letter-spacing="3">PREMIUM TUNISIA · TANGKAI</text>
        <text x="0" y="-160" font-family="Georgia, serif" font-size="22" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
    """).strip()

    # Branch + dates
    def branch_svg(x_off: int) -> str:
        return textwrap.dedent(f"""
          <g transform="translate({x_off},-30)">
            <path d="M 0 -100 C -15 -50, -25 0, -10 60 C 0 90, 5 130, 0 160" stroke="{FOREST}" stroke-width="4" fill="none"/>
            <ellipse cx="-30" cy="-70" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="-46" cy="-30" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="-38" cy="10" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="-22" cy="40" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="-10" cy="80" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="28" cy="-80" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="44" cy="-40" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="36" cy="0" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="22" cy="40" rx="14" ry="22" fill="{MAROON}"/>
            <ellipse cx="14" cy="80" rx="14" ry="22" fill="{MAROON}"/>
          </g>
        """).strip()

    if branches == 1:
        body += branch_svg(0)
    else:
        body += branch_svg(-50) + branch_svg(50)

    body += textwrap.dedent(f"""
        <!-- Bottom size badge -->
        <rect x="-110" y="220" width="220" height="40" rx="20" fill="{badge_color_for(t)}"/>
        <text x="0" y="247" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="{WHITE}" text-anchor="middle">{size_label.upper()} · NETTO</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# -----------------------------------------------------------------------------
# Muesli POUCH — short pouch for 300g, tall pouch for 500g (+scoop), 1kg = box.
# -----------------------------------------------------------------------------

def pouch(label: str, size_label: str, *, bg: str = CREAM,
          body_color: str = MAROON, accent: str = GOLD, art: str = "berry") -> str:
    t, _ = tier(size_label)
    if t in ("xl", "xxl"):
        return muesli_carton(label, size_label, bg=bg, body_color=body_color,
                             accent=accent, art=art)
    # Geometry
    geom = {
        "s":  {"w": 360, "h": 480, "y": -240},
        "m":  {"w": 380, "h": 580, "y": -290},
        "l":  {"w": 400, "h": 620, "y": -310},
    }[t]
    half_w = geom["w"] // 2
    body_top = geom["y"]
    body_bottom = body_top + geom["h"]

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
          <ellipse cx="0" cy="50" rx="80" ry="8" fill="{DARK}" opacity="0.18"/>
        """
    else:
        art_svg = f"""
          <ellipse cx="-50" cy="20" rx="10" ry="6" fill="{GOLD}"/>
          <ellipse cx="-10" cy="30" rx="10" ry="6" fill="{FOREST}"/>
          <ellipse cx="30" cy="14" rx="10" ry="6" fill="{MAROON}"/>
        """

    # Extras for the larger pouch — add a "MEASURING SCOOP" graphic
    scoop = ""
    if t == "l":
        scoop = textwrap.dedent(f"""
          <!-- measuring scoop -->
          <g transform="translate(140,{body_bottom-90}) rotate(20)">
            <ellipse cx="0" cy="0" rx="32" ry="18" fill="{GOLD}" stroke="{DARK}" stroke-width="1.5"/>
            <rect x="-3" y="-40" width="6" height="40" fill="{GOLD}" stroke="{DARK}" stroke-width="1"/>
          </g>
        """).strip()

    body = textwrap.dedent(f"""
      <g transform="translate(400,420)">
        {shadow_oval(w=half_w-10, y=body_bottom + 16)}
        <!-- Pouch shape -->
        <path d="M {-half_w} {body_top+30}
                 Q {-half_w} {body_top} {-half_w + 30} {body_top}
                 L {half_w - 30} {body_top}
                 Q {half_w} {body_top} {half_w} {body_top + 30}
                 L {half_w} {body_bottom - 20}
                 Q {half_w} {body_bottom} {half_w - 30} {body_bottom}
                 L {-half_w + 30} {body_bottom}
                 Q {-half_w} {body_bottom} {-half_w} {body_bottom - 20} Z"
              fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <!-- Top seal -->
        <rect x="{-half_w}" y="{body_top}" width="{2*half_w}" height="38" fill="{DARK}" opacity="0.25"/>
        <line x1="{-half_w+12}" y1="{body_top+18}" x2="{half_w-12}" y2="{body_top+18}" stroke="{CREAM}" stroke-width="1" stroke-dasharray="6 4"/>
        <!-- Label panel -->
        <rect x="{-half_w+30}" y="{body_top+70}" width="{2*half_w-60}" height="180" rx="10" fill="{CREAM}"/>
        <text x="0" y="{body_top+118}" font-family="Georgia, serif" font-size="34" font-weight="700" fill="{body_color}" text-anchor="middle">Safiya</text>
        <text x="0" y="{body_top+144}" font-family="Georgia, serif" font-size="13" font-style="italic" fill="{GOLD}" text-anchor="middle">healthy · tasty · authentic</text>
        <text x="0" y="{body_top+186}" font-family="Georgia, serif" font-size="22" font-weight="700" fill="{body_color}" text-anchor="middle">{label}</text>
        <text x="0" y="{body_top+212}" font-family="Inter, sans-serif" font-size="11" fill="{DARK}" opacity="0.6" text-anchor="middle" letter-spacing="2">HIGH FIBER · HALAL</text>
        <!-- Art -->
        <g transform="translate(0,{body_top+340})">{art_svg}</g>
        {scoop}
        <!-- Size badge -->
        <rect x="-90" y="{body_bottom-90}" width="180" height="40" rx="20" fill="{badge_color_for(t)}"/>
        <text x="0" y="{body_bottom-63}" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="{WHITE}" text-anchor="middle">{size_label.upper()} NETTO</text>
        <text x="0" y="{body_bottom-30}" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="{CREAM}" text-anchor="middle" letter-spacing="3">HALAL · BPOM RI</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


def muesli_carton(label: str, size_label: str, *, bg: str = CREAM,
                  body_color: str = MAROON, accent: str = GOLD, art: str = "berry") -> str:
    """Family-size carton box for 1kg+ muesli."""
    art_blob = ""
    if art == "berry":
        art_blob = f"""
          <circle cx="-60" cy="0" r="20" fill="#A8424B"/>
          <circle cx="-20" cy="14" r="18" fill="#8E2A30"/>
          <circle cx="20" cy="-8" r="16" fill="{GOLD}"/>
          <circle cx="56" cy="10" r="20" fill="#5B341E"/>
        """
    elif art == "choco":
        art_blob = f"""
          <rect x="-60" y="-12" width="36" height="40" rx="4" fill="#3B1F12"/>
          <rect x="-14" y="-6" width="36" height="34" rx="4" fill="#5C3A20"/>
          <rect x="32" y="0" width="32" height="28" rx="4" fill="#3B1F12"/>
        """
    body = textwrap.dedent(f"""
      <g transform="translate(400, 400)">
        {shadow_oval(w=240, y=240)}
        <!-- Front face -->
        <rect x="-260" y="-260" width="520" height="520" rx="18" fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <!-- Top dark band -->
        <rect x="-260" y="-260" width="520" height="74" rx="0" fill="{DARK}" opacity="0.3"/>
        <text x="0" y="-218" font-family="Georgia, serif" font-size="34" font-weight="700" fill="{CREAM}" text-anchor="middle">Safiya</text>
        <text x="0" y="-192" font-family="Inter, sans-serif" font-size="11" fill="{GOLD}" text-anchor="middle" letter-spacing="3">FAMILY · SHARE PACK</text>
        <!-- Label panel -->
        <rect x="-220" y="-160" width="440" height="200" rx="10" fill="{CREAM}"/>
        <text x="0" y="-110" font-family="Georgia, serif" font-size="32" font-weight="700" fill="{body_color}" text-anchor="middle">{label}</text>
        <text x="0" y="-80" font-family="Inter, sans-serif" font-size="12" fill="{DARK}" opacity="0.6" text-anchor="middle" letter-spacing="2">ROLLED OAT · DRIED FRUIT · NUTS · SEEDS</text>
        <g transform="translate(0,-10)">{art_blob}</g>
        <!-- Bottom band -->
        <rect x="-260" y="160" width="520" height="100" fill="{DARK}" opacity="0.18"/>
        <!-- Size badge -->
        <rect x="-150" y="80" width="300" height="46" rx="23" fill="{badge_color_for(tier(size_label)[0])}"/>
        <text x="0" y="110" font-family="Inter, sans-serif" font-size="22" font-weight="800" fill="{WHITE}" text-anchor="middle" letter-spacing="2">{size_label.upper()} NETTO</text>
        <text x="0" y="220" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="{CREAM}" text-anchor="middle" letter-spacing="3">HALAL · BPOM RI · HIGH FIBER</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# -----------------------------------------------------------------------------
# HONEY jar — short round for 250ml, tall slim for 500ml (with dipper).
# -----------------------------------------------------------------------------

def honey_jar(label: str, size_label: str, *, bg: str = CREAM, hue: str = "#C28E2E") -> str:
    t, _ = tier(size_label)
    geom = {
        "s": {"h": 380, "w": 270, "y0": -190, "lid_w": 240},
        "m": {"h": 500, "w": 300, "y0": -250, "lid_w": 280},
    }[t if t in ("s", "m") else "m"]

    body_top = geom["y0"]
    body_bottom = body_top + geom["h"]
    half_w = geom["w"] // 2
    half_lid = geom["lid_w"] // 2
    show_dipper = t == "m"

    dipper_svg = ""
    if show_dipper:
        dipper_svg = textwrap.dedent(f"""
          <g transform="translate({half_w + 50},{body_top + 80}) rotate(20)">
            <rect x="-4" y="-100" width="8" height="100" fill="{COPPER}" stroke="{DARK}" stroke-width="1"/>
            <g stroke="{GOLD}" stroke-width="3" fill="none">
              <line x1="-12" y1="-4" x2="12" y2="-4"/>
              <line x1="-14" y1="6" x2="14" y2="6"/>
              <line x1="-16" y1="16" x2="16" y2="16"/>
              <line x1="-18" y1="26" x2="18" y2="26"/>
              <line x1="-20" y1="36" x2="20" y2="36"/>
            </g>
          </g>
        """).strip()

    body = textwrap.dedent(f"""
      <g transform="translate(400, 400)">
        {shadow_oval(w=half_w+10, y=body_bottom+10)}
        <!-- Lid -->
        <rect x="{-half_lid}" y="{body_top - 60}" width="{2*half_lid}" height="60" rx="10" fill="{MAROON}" stroke="{DARK}" stroke-width="2"/>
        <ellipse cx="0" cy="{body_top - 60}" rx="{half_lid}" ry="10" fill="{COPPER}"/>
        <!-- Jar body — different curve per size -->
        <path d="M {-half_w} {body_top}
                 Q {-half_w} {body_top + 20} {-half_w + 10} {body_top + 24}
                 L {-half_w + 10} {body_bottom - 30}
                 Q {-half_w + 10} {body_bottom} {-half_w + 40} {body_bottom}
                 L {half_w - 40} {body_bottom}
                 Q {half_w - 10} {body_bottom} {half_w - 10} {body_bottom - 30}
                 L {half_w - 10} {body_top + 24}
                 Q {half_w} {body_top + 20} {half_w} {body_top} Z"
              fill="{hue}" stroke="{DARK}" stroke-width="2"/>
        <!-- Label sticker -->
        <rect x="{-half_w + 30}" y="{body_top + 60}" width="{2*half_w - 60}" height="220" rx="10" fill="{CREAM}"/>
        <text x="0" y="{body_top + 102}" font-family="Georgia, serif" font-size="32" font-weight="700" fill="{MAROON}" text-anchor="middle">Safiya</text>
        <text x="0" y="{body_top + 124}" font-family="Georgia, serif" font-size="13" font-style="italic" fill="{GOLD}" text-anchor="middle">pure & raw</text>
        <line x1="-50" y1="{body_top + 136}" x2="50" y2="{body_top + 136}" stroke="{GOLD}" stroke-width="1"/>
        <text x="0" y="{body_top + 170}" font-family="Georgia, serif" font-size="22" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
        <text x="0" y="{body_top + 194}" font-family="Inter, sans-serif" font-size="11" fill="{DARK}" opacity="0.6" text-anchor="middle" letter-spacing="2">NATURAL · UNFILTERED</text>
        <!-- Honey drips visualisation -->
        <g transform="translate(0,{body_top + 224})">
          <path d="M -30 0 Q 0 14 30 0" stroke="{GOLD}" stroke-width="3" fill="none"/>
          <circle cx="-30" cy="2" r="3" fill="{GOLD}"/>
          <circle cx="0" cy="14" r="3" fill="{GOLD}"/>
          <circle cx="30" cy="2" r="3" fill="{GOLD}"/>
        </g>
        <!-- Size badge -->
        <rect x="-80" y="{body_bottom - 60}" width="160" height="36" rx="18" fill="{badge_color_for(t)}"/>
        <text x="0" y="{body_bottom - 35}" font-family="Inter, sans-serif" font-size="16" font-weight="800" fill="{WHITE}" text-anchor="middle">{size_label.upper()} NETTO</text>
        {dipper_svg}
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# -----------------------------------------------------------------------------
# Bottle (VCO) — short for 250ml, tall for 500ml.
# -----------------------------------------------------------------------------

def bottle(label: str, size_label: str, *, bg: str = CREAM,
           body_color: str = "#F1E6CB") -> str:
    t, _ = tier(size_label)
    h = 480 if t == "s" else 600
    cap_h = 50 if t == "s" else 70
    body = textwrap.dedent(f"""
      <g transform="translate(400, 400)">
        {shadow_oval(w=160, y=h/2 + 30)}
        <!-- Cap -->
        <rect x="-32" y="{-h/2 - cap_h}" width="64" height="{cap_h}" rx="6" fill="{MAROON}"/>
        <rect x="-26" y="{-h/2 - cap_h + 8}" width="52" height="6" rx="2" fill="{DARK}" opacity="0.4"/>
        <!-- Neck -->
        <rect x="-22" y="{-h/2 - 14}" width="44" height="14" fill="{DARK}" opacity="0.18"/>
        <!-- Bottle body -->
        <path d="M -110 {-h/2 + 20}
                 L -110 {h/2 - 40}
                 Q -110 {h/2} -70 {h/2}
                 L 70 {h/2}
                 Q 110 {h/2} 110 {h/2 - 40}
                 L 110 {-h/2 + 20}
                 Q 110 {-h/2} 70 {-h/2}
                 L -70 {-h/2}
                 Q -110 {-h/2} -110 {-h/2 + 20} Z"
              fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <!-- Label -->
        <rect x="-90" y="{-h/2 + 80}" width="180" height="240" rx="10" fill="{CREAM}"/>
        <text x="0" y="{-h/2 + 124}" font-family="Georgia, serif" font-size="30" font-weight="700" fill="{MAROON}" text-anchor="middle">Safiya</text>
        <text x="0" y="{-h/2 + 148}" font-family="Inter, sans-serif" font-size="11" fill="{GOLD}" text-anchor="middle" letter-spacing="2.5">PURE COCONUT OIL</text>
        <text x="0" y="{-h/2 + 192}" font-family="Georgia, serif" font-size="22" font-weight="700" fill="{MAROON}" text-anchor="middle">{label}</text>
        <text x="0" y="{-h/2 + 216}" font-family="Inter, sans-serif" font-size="11" fill="{DARK}" opacity="0.6" text-anchor="middle" letter-spacing="2.5">COLD PRESSED · NATURAL</text>
        <!-- Size pill -->
        <rect x="-60" y="{-h/2 + 240}" width="120" height="30" rx="15" fill="{badge_color_for(t)}"/>
        <text x="0" y="{-h/2 + 260}" font-family="Inter, sans-serif" font-size="14" font-weight="800" fill="{WHITE}" text-anchor="middle">{size_label.upper()}</text>
        <!-- Liquid level indicator (more "filled" for bigger size) -->
        <rect x="-100" y="{h/2 - 80}" width="200" height="50" fill="rgba(212,162,76,0.25)" rx="6"/>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# -----------------------------------------------------------------------------
# Small pack (Chia, Salt, Saffron, Beras Merah) — short vs tall.
# -----------------------------------------------------------------------------

def small_pack(label: str, size_label: str, *, bg: str = CREAM,
               body_color: str = MAROON, accent: str = GOLD, kind: str = "salt") -> str:
    t, _ = tier(size_label)
    geom = {
        "xs":  {"w": 280, "h": 380, "y": -190},
        "xs+": {"w": 280, "h": 380, "y": -190},
        "s":   {"w": 340, "h": 460, "y": -230},
        "m":   {"w": 380, "h": 540, "y": -270},
        "l":   {"w": 400, "h": 600, "y": -300},
        "xl":  {"w": 420, "h": 660, "y": -330},
        "xxl": {"w": 440, "h": 700, "y": -350},
    }[t]
    half_w = geom["w"] // 2
    body_top = geom["y"]
    body_bottom = body_top + geom["h"]

    art_map = {
        "salt":    f'<g transform="translate(0,30)"><circle cx="-30" cy="0" r="10" fill="#F4DDD8"/><circle cx="0" cy="-6" r="12" fill="#F4DDD8"/><circle cx="30" cy="2" r="10" fill="#F4DDD8"/><circle cx="-10" cy="20" r="8" fill="#F4DDD8"/></g>',
        "saffron": f'<g transform="translate(0,30)"><path d="M -30 0 Q -10 -10 0 0 Q 10 10 30 0" stroke="#C9302C" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M -20 20 Q 0 10 20 20" stroke="#C9302C" stroke-width="6" fill="none" stroke-linecap="round"/></g>',
        "chia":    f'<g transform="translate(0,30)"><ellipse cx="-30" cy="0" rx="6" ry="4" fill="{DARK}"/><ellipse cx="-10" cy="10" rx="6" ry="4" fill="{DARK}"/><ellipse cx="10" cy="-6" rx="6" ry="4" fill="{DARK}"/><ellipse cx="30" cy="6" rx="6" ry="4" fill="{DARK}"/><ellipse cx="0" cy="-2" rx="6" ry="4" fill="{DARK}"/></g>',
        "rice":    f'<g transform="translate(0,30)"><ellipse cx="-30" cy="0" rx="8" ry="3" fill="#9B3C24" transform="rotate(20 -30 0)"/><ellipse cx="-10" cy="10" rx="8" ry="3" fill="#9B3C24" transform="rotate(-20 -10 10)"/><ellipse cx="10" cy="-6" rx="8" ry="3" fill="#9B3C24" transform="rotate(15 10 -6)"/><ellipse cx="30" cy="6" rx="8" ry="3" fill="#9B3C24" transform="rotate(-30 30 6)"/></g>',
    }
    art = art_map.get(kind, "")

    body = textwrap.dedent(f"""
      <g transform="translate(400, 400)">
        {shadow_oval(w=half_w-20, y=body_bottom + 14)}
        <rect x="{-half_w}" y="{body_top}" width="{2*half_w}" height="{geom['h']}" rx="22" fill="{body_color}" stroke="{DARK}" stroke-width="2"/>
        <!-- Top dark band -->
        <rect x="{-half_w}" y="{body_top}" width="{2*half_w}" height="60" rx="22" fill="{DARK}" opacity="0.22"/>
        <!-- Label panel -->
        <rect x="{-half_w + 30}" y="{body_top + 70}" width="{2*half_w - 60}" height="180" rx="12" fill="{CREAM}"/>
        <text x="0" y="{body_top + 116}" font-family="Georgia, serif" font-size="34" font-weight="700" fill="{body_color}" text-anchor="middle">Safiya</text>
        <text x="0" y="{body_top + 140}" font-family="Inter, sans-serif" font-size="11" fill="{GOLD}" text-anchor="middle" letter-spacing="2.5">HEALTHY · PURE · HALAL</text>
        <text x="0" y="{body_top + 188}" font-family="Georgia, serif" font-size="24" font-weight="700" fill="{body_color}" text-anchor="middle">{label}</text>
        <text x="0" y="{body_top + 214}" font-family="Inter, sans-serif" font-size="11" fill="{DARK}" opacity="0.6" text-anchor="middle" letter-spacing="2">PREMIUM GRADE</text>
        <!-- Window with art -->
        <ellipse cx="0" cy="{body_top + 340}" rx="120" ry="60" fill="{CREAM}" opacity="0.6"/>
        <g transform="translate(0,{body_top + 320})">{art}</g>
        <!-- Size badge -->
        <rect x="-100" y="{body_bottom - 92}" width="200" height="42" rx="21" fill="{accent}"/>
        <text x="0" y="{body_bottom - 65}" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="{WHITE}" text-anchor="middle">{size_label.upper()} NETTO</text>
        <text x="0" y="{body_bottom - 30}" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="{CREAM}" text-anchor="middle" letter-spacing="3">HALAL · BPOM RI</text>
      </g>
    """).strip()
    return svg_wrap(body, bg=bg)


# -----------------------------------------------------------------------------
# Hero (unchanged conceptually but re-rendered)
# -----------------------------------------------------------------------------

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
      <g opacity="0.06" fill="{MAROON}">
        <circle cx="80" cy="80" r="40"/>
        <circle cx="720" cy="120" r="60"/>
        <circle cx="120" cy="700" r="50"/>
        <circle cx="680" cy="680" r="40"/>
      </g>
      <g transform="translate(110,640) rotate(-20)">
        <path d="M 0 0 Q 30 -80 0 -160 Q -30 -80 0 0 Z" fill="url(#palmLeaf)"/>
        <path d="M 0 -160 Q 60 -200 80 -260" stroke="url(#palmLeaf)" stroke-width="6" fill="none"/>
        <path d="M 0 -160 Q -60 -200 -80 -260" stroke="url(#palmLeaf)" stroke-width="6" fill="none"/>
      </g>
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


# -----------------------------------------------------------------------------
# Product catalog (source of truth — also drives generate_catalog.py).
# -----------------------------------------------------------------------------

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
            {"size": "1kg",  "sku": "SAF-SUK-1K",  "price": 159000, "compare": 235000, "weight": 1060},
            {"size": "3kg",  "sku": "SAF-SUK-3K",  "price": 425000, "compare": 685000, "weight": 3100},
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
            {"size": "1kg",  "sku": "SAF-AJW-1K",  "price": 315000, "compare": 445000, "weight": 1060},
        ],
        "parent_views": ["front", "side", "info"],
    },
    {
        "slug": "kurma-tunisia-tangkai",
        "category": "Kurma",
        "name": "Kurma Tunisia Tangkai",
        "tagline": "Branch-dried Tunisia dates, still on the stem.",
        "art": "kurma_tangkai",
        "art_args": {"label": "Tunisia Tangkai"},
        "variants": [
            {"size": "500g", "sku": "SAF-TNT-500", "price": 79000, "compare": 119000, "weight": 540},
            {"size": "1kg",  "sku": "SAF-TNT-1K",  "price": 145000, "compare": 215000, "weight": 1060},
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
            {"size": "1kg",  "sku": "SAF-TMD-1K",  "price": 139000, "compare": 205000, "weight": 1060},
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
            {"size": "1kg",  "sku": "SAF-KHA-1K",  "price": 125000, "compare": 195000, "weight": 1060},
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
            {"size": "1kg",  "sku": "SAF-MUS-FS-1K",  "price": 165000, "compare": 245000, "weight": 1060},
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
        "art_args": {"label": "Berry Yogurt", "body_color": "#7A2A35", "art": "berry"},
        "variants": [
            {"size": "300g", "sku": "SAF-BYC-300", "price": 75000, "compare": 105000, "weight": 320},
            {"size": "500g", "sku": "SAF-BYC-500", "price": 119000, "compare": 169000, "weight": 540},
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
    "kurma_jar":     kurma_jar,
    "kurma_box":     kurma_box,
    "kurma_tangkai": kurma_tangkai,
    "pouch":         pouch,
    "honey_jar":     honey_jar,
    "bottle":        bottle,
    "small_pack":    small_pack,
}


def _bg_for_view(idx: int, base_bg: str) -> str:
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
        # Parent gallery: front / side / info — uses smallest variant
        for i, view in enumerate(p["parent_views"]):
            svg = fn(size_label=first_size, **args, bg=_bg_for_view(i, base_bg))
            out = PRODUCT_DIR / f"{p['slug']}-{view}.svg"
            out.write_text(svg)
            count += 1
        # Per-variant images — each renders DIFFERENTLY based on size tier
        for v in p["variants"]:
            svg = fn(size_label=v["size"], **args, bg=base_bg)
            out = PRODUCT_DIR / f"{v['sku'].lower()}.svg"
            out.write_text(svg)
            count += 1
    (HERO_DIR / "main.svg").write_text(hero())
    count += 1
    return count


if __name__ == "__main__":
    n = write_assets()
    print(f"Wrote {n} SVG assets.")
    summary = {p["slug"]: {"category": p["category"], "variants": [v["sku"] for v in p["variants"]]} for p in PRODUCTS}
    print(json.dumps(summary, indent=2)[:1500])
