import type { Metadata } from "next";
import {
  Inter,
  Playfair_Display,
  Montserrat,
  Poppins,
  Archivo,
} from "next/font/google";

import "./globals.css";
import "@jaringan-dagang/beli-aman-sdk/styles.css";

import { SITE_URL } from "@/lib/seo";

// All fonts are self-hosted at build time so there's no render-blocking
// request to fonts.googleapis.com. `display: swap` shows fallback text
// immediately and re-paints when the webfont loads. Subsets trimmed to
// `latin` since the storefronts are Indonesian.

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-playfair",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s · Beli Aman",
    default: "Beli Aman — Belanja Aman dengan Escrow untuk DTC Indonesia",
  },
  description:
    "Beli Aman adalah lapisan escrow untuk toko DTC Indonesia. Dana ditahan di escrow sampai barang Anda terima. Lihat demo storefront Safiya Food, Antarestar, dan Gendes.",
  applicationName: "Beli Aman",
  keywords: [
    "beli aman", "escrow", "ecommerce indonesia", "safiya food", "kurma sukari",
    "kurma ajwa", "muesli", "madu murni", "ramadhan hampers",
  ],
  authors: [{ name: "Metatech" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Beli Aman",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#6B2C1A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVars = [
    inter.variable,
    playfair.variable,
    montserrat.variable,
    poppins.variable,
    archivo.variable,
  ].join(" ");
  return (
    <html lang="id" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
