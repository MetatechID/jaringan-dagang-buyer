import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { resolveBrand } from "@/lib/brands";
import { AdminApp } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vibe Editor · Beli Aman",
  description: "Edit your storefront by chatting.",
  robots: { index: false, follow: false },
};

export default function AdminPage({ params }: { params: { brand: string } }) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();
  // Auth happens client-side via Beli Aman SSO; the API routes re-verify.
  return (
    <>
      {/* Lock the admin to viewport height: no outer page scroll, hide the
          storefront-layout chrome (header / footer / mobile nav). Each of
          the three columns scrolls independently inside AdminApp. */}
      <style>{`
        html, body { height: 100vh !important; overflow: hidden !important; margin: 0; }
        .brand-header,
        .brand-footer,
        .mobile-bottom-nav { display: none !important; }
        main.brand-main {
          padding-bottom: 0 !important;
          height: 100vh !important;
          overflow: hidden !important;
          display: flex;
          flex-direction: column;
        }
        main.brand-main > * { flex: 1; min-height: 0; }
      `}</style>
      <AdminApp brandSlug={params.brand} />
    </>
  );
}
