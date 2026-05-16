import { notFound } from "next/navigation";

import { resolveBrand } from "@/lib/brands";
import { CartView } from "@/components/CartView";

export default function CartPage({ params }: { params: { brand: string } }) {
  const brand = resolveBrand(params.brand);
  if (!brand) notFound();
  return <CartView brandSlug={params.brand} />;
}
