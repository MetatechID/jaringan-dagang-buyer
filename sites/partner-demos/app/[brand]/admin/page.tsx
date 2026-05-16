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
  return <AdminApp brandSlug={params.brand} />;
}
