"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatIDR } from "@/lib/format";
import { addToCart, getCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const productId = decodeURIComponent(rawId);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Check localStorage for a cached product list
    try {
      const cached = localStorage.getItem("jd_last_products");
      if (cached) {
        const products: Product[] = JSON.parse(cached);
        const found = products.find((p) => p.id === productId);
        if (found) {
          setProduct(found);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    // Check cart items
    try {
      const cartItems = getCart();
      const inCart = cartItems.find((ci) => ci.product.id === productId);
      if (inCart) {
        setProduct(inCart.product);
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // Fallback: parse composite ID
    const parts = productId.split("::");
    if (parts.length >= 3) {
      setProduct({
        id: productId,
        itemId: parts[2],
        name: parts[2],
        description: "",
        imageUrl: "",
        price: 0,
        currency: "IDR",
        availableQty: 0,
        categoryIds: [],
        providerName: "Toko",
        providerLocation: "",
        providerId: parts[1],
        bppId: parts[0],
        bppUri: "",
      });
    }

    setLoading(false);
  }, [productId]);

  function handleAddToCart() {
    if (!product) return;
    addToCart(product, quantity);
    setAddedToCart(true);

    try {
      const cached = localStorage.getItem("jd_last_products");
      const products: Product[] = cached ? JSON.parse(cached) : [];
      if (!products.find((p) => p.id === product.id)) {
        products.push(product);
        localStorage.setItem("jd_last_products", JSON.stringify(products));
      }
    } catch {
      // ignore
    }

    setTimeout(() => setAddedToCart(false), 2000);
  }

  function handleBuyNow() {
    if (!product) return;
    addToCart(product, quantity);
    router.push("/cart");
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        {/* Mobile skeleton */}
        <div className="md:hidden">
          <div className="aspect-square bg-gray-100" />
          <div className="p-4 space-y-3">
            <div className="h-6 w-1/3 rounded bg-gray-100" />
            <div className="h-5 w-3/4 rounded bg-gray-100" />
            <div className="h-4 w-full rounded bg-gray-100" />
          </div>
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:block mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square rounded-2xl bg-gray-100" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-gray-100" />
              <div className="h-6 w-1/3 rounded bg-gray-100" />
              <div className="h-20 w-full rounded bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <p className="text-sm text-gray-500">Produk tidak ditemukan</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-20 md:pb-0">
      {/* Mobile layout */}
      <div className="md:hidden">
        {/* Back button overlay on image */}
        <div className="relative">
          <div className="aspect-square bg-gray-100 overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={0.75}
                  stroke="currentColor"
                  className="h-20 w-20"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4 text-gray-700"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
        </div>

        {/* Product info */}
        <div className="px-4 py-3">
          <p className="text-xl font-bold text-emerald-600">
            {formatIDR(product.price)}
          </p>
          <h1 className="mt-1 text-sm text-gray-900 leading-snug">
            {product.name}
          </h1>

          {product.description && (
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              {product.description}
            </p>
          )}

          {/* Availability */}
          {product.availableQty > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-green-700">
                Stok: {product.availableQty}
              </span>
            </div>
          )}

          {/* Quantity selector */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Jumlah</p>
            <div className="inline-flex items-center rounded-lg border border-gray-200">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-8 w-8 items-center justify-center text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </button>
              <span className="flex h-8 w-10 items-center justify-center border-x border-gray-200 text-sm font-semibold">
                {quantity}
              </span>
              <button
                onClick={() =>
                  setQuantity(
                    product.availableQty > 0
                      ? Math.min(product.availableQty, quantity + 1)
                      : quantity + 1,
                  )
                }
                className="flex h-8 w-8 items-center justify-center text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-100" />

          {/* Store info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-emerald-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a1.897 1.897 0 0 1-.61-1.276c-.032-.38.02-.763.147-1.123L5.55 2.4a2.25 2.25 0 0 1 2.218-1.65h8.462a2.25 2.25 0 0 1 2.218 1.65l2.265 4.55c.128.36.18.743.148 1.123a1.897 1.897 0 0 1-.61 1.276" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {product.providerName}
              </p>
              {product.providerLocation && (
                <p className="text-xs text-gray-400 truncate">
                  {product.providerLocation}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Beckn Verified
            </div>
          </div>
        </div>

        {/* Sticky bottom bar -- Tokopedia style */}
        <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-3 pb-safe">
          <div className="flex gap-2">
            <button
              onClick={handleAddToCart}
              className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-bold transition-all ${
                addedToCart
                  ? "border-green-500 bg-green-50 text-green-600"
                  : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              {addedToCart ? "Ditambahkan!" : "Keranjang"}
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800"
            >
              Beli Langsung
            </button>
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-emerald-600 transition-colors">
              Beranda
            </Link>
            <span>/</span>
            <Link href="/search?q=" className="hover:text-emerald-600 transition-colors">
              Produk
            </Link>
            <span>/</span>
            <span className="text-gray-700 truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-2">
            {/* Image */}
            <div className="aspect-square overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={0.75}
                    stroke="currentColor"
                    className="h-24 w-24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-gray-900">
                {product.name}
              </h1>

              <p className="mt-3 text-3xl font-bold text-emerald-600">
                {formatIDR(product.price)}
              </p>

              {product.description && (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  {product.description}
                </p>
              )}

              {/* Availability */}
              {product.availableQty > 0 && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-green-700">
                    Stok tersedia ({product.availableQty})
                  </span>
                </div>
              )}

              {/* Quantity selector */}
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Jumlah
                </label>
                <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-l-xl text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="flex h-10 w-12 items-center justify-center text-sm font-semibold text-gray-900 border-x border-gray-200">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(
                        product.availableQty > 0
                          ? Math.min(product.availableQty, quantity + 1)
                          : quantity + 1,
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-r-xl text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Desktop action buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 rounded-xl border-2 px-6 py-3.5 text-sm font-bold transition-all ${
                    addedToCart
                      ? "border-green-500 bg-green-50 text-green-600"
                      : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {addedToCart ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Ditambahkan!
                    </span>
                  ) : (
                    "Tambah ke Keranjang"
                  )}
                </button>

                <button
                  onClick={handleBuyNow}
                  className="flex-1 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800"
                >
                  Beli Langsung
                </button>
              </div>

              {/* Store info */}
              <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-emerald-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a1.897 1.897 0 0 1-.61-1.276c-.032-.38.02-.763.147-1.123L5.55 2.4a2.25 2.25 0 0 1 2.218-1.65h8.462a2.25 2.25 0 0 1 2.218 1.65l2.265 4.55c.128.36.18.743.148 1.123a1.897 1.897 0 0 1-.61 1.276" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {product.providerName}
                    </p>
                    {product.providerLocation && (
                      <p className="text-xs text-gray-500">
                        {product.providerLocation}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] text-gray-500 border border-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3 w-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                    Beckn Verified
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
