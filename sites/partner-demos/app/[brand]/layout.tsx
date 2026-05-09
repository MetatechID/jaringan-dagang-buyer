import { notFound } from "next/navigation";

import { resolveBrand, BRAND_SLUGS } from "@/lib/brands";
import { BeliAmanThemeProvider } from "@/components/BeliAmanThemeProvider";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

export function generateStaticParams() {
  return BRAND_SLUGS.map((slug) => ({ brand: slug }));
}

export default function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { brand: string };
}) {
  // Server-side validate brand slug; client-side BeliAmanThemeProvider applies
  // CSS vars + reads ?primary=... overrides for yourbrand.
  const seedBrand = resolveBrand(params.brand);
  if (!seedBrand) notFound();

  return (
    <BeliAmanThemeProvider seedBrand={seedBrand}>
      <div
        style={{
          background: "var(--c-bg)",
          color: "var(--c-text)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BrandHeader />
        <main style={{ flex: 1 }}>{children}</main>
        <BrandFooter />
      </div>
    </BeliAmanThemeProvider>
  );
}
