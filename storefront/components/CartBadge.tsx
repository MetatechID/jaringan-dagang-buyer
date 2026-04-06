"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCartCount } from "@/lib/cart";

export default function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCartCount());

    function onUpdate() {
      setCount(getCartCount());
    }
    window.addEventListener("cart-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("cart-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="relative flex items-center justify-center rounded-full p-2 text-white/80 transition-colors hover:text-white hover:bg-white/10"
      aria-label={`Keranjang, ${count} item`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-emerald-600">
          {count > 99 ? "99" : count}
        </span>
      )}
    </Link>
  );
}
