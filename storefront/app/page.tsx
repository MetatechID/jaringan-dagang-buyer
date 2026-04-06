"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import SkeletonGrid from "@/components/SkeletonGrid";
import { initiateSearch, pollSearchResults, flattenResults } from "@/lib/api";
import type { Product } from "@/lib/types";

const CATEGORIES = [
  { label: "Semua", query: "" },
  { label: "Elektronik", query: "elektronik" },
  { label: "Fashion", query: "fashion" },
  { label: "Makanan", query: "makanan" },
  { label: "Kesehatan", query: "kesehatan" },
  { label: "Rumah Tangga", query: "rumah tangga" },
  { label: "Olahraga", query: "olahraga" },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileQuery, setMobileQuery] = useState("");
  const router = useRouter();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { session_id } = await initiateSearch("");

      let attempts = 0;
      const maxAttempts = 20;

      const poll = async (): Promise<Product[]> => {
        const data = await pollSearchResults(session_id);
        const items = flattenResults(data.results);

        if (
          items.length > 0 ||
          data.status === "completed" ||
          data.status === "expired" ||
          attempts >= maxAttempts
        ) {
          return items;
        }

        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
        return poll();
      };

      const results = await poll();
      setProducts(results);

      try {
        localStorage.setItem("jd_last_products", JSON.stringify(results));
      } catch {
        // ignore quota errors
      }
    } catch (err) {
      console.error("Failed to load products:", err);
      setError("Gagal memuat produk. Pastikan layanan BAP berjalan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function handleMobileSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = mobileQuery.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search?q=");
  }

  return (
    <div className="bg-gray-50">
      {/* Mobile: Category chips only (search is in Header) */}
      <div className="md:hidden">
        <div className="bg-white border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={cat.query ? `/search?q=${encodeURIComponent(cat.query)}` : "/search?q="}
                className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-emerald-300 hover:text-emerald-600"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop: Compact hero banner */}
      <section className="hidden md:block bg-gradient-to-r from-emerald-600 to-emerald-700">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Jaringan Perdagangan Terbuka
              </h1>
              <p className="mt-1 text-sm text-emerald-100">
                Belanja langsung dari penjual. Tanpa biaya platform.
              </p>
            </div>
            <div className="flex items-center gap-6 text-emerald-100">
              <div className="text-center">
                <div className="text-lg font-bold text-white">0%</div>
                <div className="text-[11px]">Biaya Platform</div>
              </div>
              <div className="h-8 w-px bg-emerald-500/50" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">100+</div>
                <div className="text-[11px]">Penjual</div>
              </div>
              <div className="h-8 w-px bg-emerald-500/50" />
              <div className="text-center">
                <div className="text-lg font-bold text-white">Terbuka</div>
                <div className="text-[11px]">Beckn Protocol</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop category chips */}
      <div className="hidden md:block bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={cat.query ? `/search?q=${encodeURIComponent(cat.query)}` : "/search?q="}
                className="flex-shrink-0 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Product Feed */}
      <section className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-8">
        <div className="mb-3 flex items-center justify-between md:mb-5">
          <h2 className="text-sm font-bold text-gray-900 md:text-lg">
            Produk dari Jaringan
          </h2>
          {!loading && products.length > 0 && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 md:text-xs md:px-3 md:py-1">
              {products.length} produk
            </span>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        ) : loading ? (
          <SkeletonGrid count={10} />
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </div>
  );
}
