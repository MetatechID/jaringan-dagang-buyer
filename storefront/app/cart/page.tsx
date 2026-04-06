"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCart,
  updateCartItemQty,
  removeFromCart,
  clearCart,
  getCartTotal,
} from "@/lib/cart";
import { formatIDR } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(getCart());
    setMounted(true);
  }, []);

  function refresh() {
    setItems(getCart());
  }

  function handleQtyChange(productId: string, newQty: number) {
    updateCartItemQty(productId, newQty);
    refresh();
  }

  function handleRemove(productId: string) {
    removeFromCart(productId);
    refresh();
  }

  function handleClear() {
    clearCart();
    refresh();
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-32 rounded bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  const total = getCartTotal();
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="h-10 w-10 text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900">Keranjang Kosong</h1>
        <p className="mt-1 text-sm text-gray-400">
          Belum ada produk di keranjang
        </p>
        <Link
          href="/"
          className="mt-5 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-gray-900 md:text-xl">Keranjang</h1>
              <p className="text-xs text-gray-400">
                {totalItems} item
              </p>
            </div>
            <button
              onClick={handleClear}
              className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              Hapus Semua
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl md:flex md:gap-6 md:px-6 md:py-6">
        {/* Cart items */}
        <div className="flex-1">
          <div className="divide-y divide-gray-100 bg-white md:rounded-xl md:border md:border-gray-100">
            {items.map((item) => (
              <div key={item.product.id} className="flex gap-3 p-3 md:p-4">
                {/* Image */}
                <Link
                  href={`/products/${encodeURIComponent(item.product.id)}`}
                  className="flex-shrink-0"
                >
                  <div className="h-20 w-20 overflow-hidden rounded-lg bg-gray-100 md:h-24 md:w-24">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <Link
                      href={`/products/${encodeURIComponent(item.product.id)}`}
                      className="text-xs font-medium text-gray-900 line-clamp-2 hover:text-emerald-600 transition-colors md:text-sm"
                    >
                      {item.product.name}
                    </Link>
                    <p className="mt-0.5 text-[10px] text-gray-400 md:text-xs">
                      {item.product.providerName}
                    </p>
                  </div>

                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-sm font-bold text-emerald-600 md:text-base">
                      {formatIDR(item.product.price * item.quantity)}
                    </p>

                    <div className="flex items-center gap-2">
                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(item.product.id)}
                        className="text-[10px] font-medium text-red-400 hover:text-red-500 transition-colors"
                      >
                        Hapus
                      </button>

                      {/* Qty controls */}
                      <div className="inline-flex items-center rounded-md border border-gray-200">
                        <button
                          onClick={() =>
                            handleQtyChange(item.product.id, item.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                          </svg>
                        </button>
                        <span className="flex h-7 w-7 items-center justify-center border-x border-gray-200 text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleQtyChange(item.product.id, item.quantity + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Continue shopping */}
          <div className="px-4 py-3 md:px-0 md:py-4">
            <Link
              href="/"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              &larr; Lanjut belanja
            </Link>
          </div>
        </div>

        {/* Order summary -- desktop sidebar / mobile bottom */}
        <div className="hidden md:block md:w-80 md:flex-shrink-0">
          <div className="rounded-xl border border-gray-100 bg-white p-5 sticky top-24">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Ringkasan Belanja</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal ({totalItems} item)</span>
                <span>{formatIDR(total)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Biaya platform</span>
                <span className="font-medium text-emerald-600">Gratis</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Estimasi ongkir</span>
                <span className="text-gray-400">-</span>
              </div>
              <div className="border-t border-gray-100 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatIDR(total)}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="mt-4 w-full rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800"
              onClick={() => {
                alert(
                  "Checkout melalui Beckn Protocol (select -> init -> confirm) akan segera hadir!",
                );
              }}
            >
              Checkout ({totalItems})
            </button>

            <p className="mt-2.5 text-center text-[10px] text-gray-400">
              Transaksi aman via Beckn Protocol
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-3 md:hidden pb-safe">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-base font-bold text-emerald-600">
            {formatIDR(total)}
          </span>
        </div>
        <button
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800"
          onClick={() => {
            alert(
              "Checkout melalui Beckn Protocol (select -> init -> confirm) akan segera hadir!",
            );
          }}
        >
          Checkout ({totalItems})
        </button>
      </div>
    </div>
  );
}
