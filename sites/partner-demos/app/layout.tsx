import type { Metadata } from "next";

import "./globals.css";
import "@jaringan-dagang/beli-aman-sdk/styles.css";

export const metadata: Metadata = {
  title: "Beli Aman — Partner Demo Storefronts",
  description:
    "See what Antarestar, Gendes, and your brand look like with Beli Aman embedded — escrow-protected checkout for Indonesian DTC commerce.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&family=Poppins:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
