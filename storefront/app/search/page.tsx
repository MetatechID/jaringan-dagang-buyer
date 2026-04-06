"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import SearchBar from "@/components/SearchBar";
import ProductGrid from "@/components/ProductGrid";
import SkeletonGrid from "@/components/SkeletonGrid";
import { initiateSearch, pollSearchResults, flattenResults } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/lib/types";

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface Filters {
  category: string;
  minPrice: number;
  maxPrice: number;
}

const PRICE_RANGES = [
  { label: "Semua Harga", min: 0, max: 0 },
  { label: "< Rp 50.000", min: 0, max: 50000 },
  { label: "Rp 50rb - 200rb", min: 50000, max: 200000 },
  { label: "Rp 200rb - 500rb", min: 200000, max: 500000 },
  { label: "> Rp 500.000", min: 500000, max: 0 },
];

// ---------------------------------------------------------------------------
// Main search content
// ---------------------------------------------------------------------------

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    category: "",
    minPrice: 0,
    maxPrice: 0,
  });

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    setFilters({ category: "", minPrice: 0, maxPrice: 0 });

    try {
      const { session_id } = await initiateSearch(q);

      let attempts = 0;
      const maxAttempts = 12;

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
        await new Promise((r) => setTimeout(r, 1500));
        return poll();
      };

      const results = await poll();
      setAllProducts(results);

      try {
        localStorage.setItem("jd_last_products", JSON.stringify(results));
      } catch {
        // ignore quota errors
      }
    } catch (err) {
      console.error("Search failed:", err);
      setError("Gagal melakukan pencarian. Pastikan layanan BAP berjalan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  // Derive categories from results
  const categories = useMemo(() => {
    const set = new Set<string>();
    allProducts.forEach((p) => p.categoryIds.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [allProducts]);

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (filters.category && !p.categoryIds.includes(filters.category)) {
        return false;
      }
      if (filters.minPrice > 0 && p.price < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice > 0 && p.price > filters.maxPrice) {
        return false;
      }
      return true;
    });
  }, [allProducts, filters]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Search header */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-3 py-3 md:px-6">
          <div className="max-w-xl">
            <SearchBar defaultValue={query} />
          </div>
          {query && !loading && (
            <p className="mt-2 text-xs text-gray-500 md:text-sm">
              Hasil untuk{" "}
              <span className="font-semibold text-gray-900">&ldquo;{query}&rdquo;</span>
            </p>
          )}
        </div>
      </div>

      {/* Category + price filter chips (horizontal scroll) */}
      {!loading && allProducts.length > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-3 md:px-6">
            <div className="flex gap-2 overflow-x-auto py-2.5 scrollbar-hide">
              {/* Category chips */}
              <button
                onClick={() => setFilters((f) => ({ ...f, category: "" }))}
                className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filters.category === ""
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 hover:border-emerald-300"
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilters((f) => ({ ...f, category: cat }))}
                  className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    filters.category === cat
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:border-emerald-300"
                  }`}
                >
                  {cat}
                </button>
              ))}

              {/* Divider */}
              {categories.length > 0 && (
                <div className="flex-shrink-0 w-px bg-gray-200 my-0.5" />
              )}

              {/* Price range chips */}
              {PRICE_RANGES.map((range) => {
                const isActive =
                  filters.minPrice === range.min && filters.maxPrice === range.max;
                return (
                  <button
                    key={range.label}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        minPrice: range.min,
                        maxPrice: range.max,
                      }))
                    }
                    className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-600 hover:border-emerald-300"
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Results area */}
      <div className="mx-auto max-w-7xl px-3 py-3 md:px-6 md:py-6">
        {/* Loading */}
        {loading && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <span className="loading-dots">Mencari di seluruh jaringan</span>
            </div>
            <SkeletonGrid count={10} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => runSearch(query)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && !error && (
          <div>
            {allProducts.length > 0 && (
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-gray-500 md:text-sm">
                  <span className="font-semibold text-gray-900">{filteredProducts.length}</span> produk ditemukan
                </span>
              </div>
            )}
            <ProductGrid products={filteredProducts} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-3 py-6 md:px-6">
          <SkeletonGrid count={10} />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
