"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatIDR } from "@/lib/format";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${encodeURIComponent(product.id)}`}
      className="group block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Square image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="h-10 w-10"
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

      {/* Info -- dense padding like Tokopedia */}
      <div className="p-2">
        <h3 className="text-xs font-normal text-gray-800 line-clamp-2 leading-tight min-h-[2rem]">
          {product.name}
        </h3>

        <p className="mt-1 text-sm font-bold text-emerald-600">
          {formatIDR(product.price)}
        </p>

        <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-3 w-3 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a1.897 1.897 0 0 1-.61-1.276c-.032-.38.02-.763.147-1.123L5.55 2.4a2.25 2.25 0 0 1 2.218-1.65h8.462a2.25 2.25 0 0 1 2.218 1.65l2.265 4.55c.128.36.18.743.148 1.123a1.897 1.897 0 0 1-.61 1.276"
            />
          </svg>
          <span className="truncate">{product.providerName}</span>
        </div>
      </div>
    </Link>
  );
}
