"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCartCount } from "@/lib/cart";

export default function BottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(getCartCount());

    function onUpdate() {
      setCartCount(getCartCount());
    }
    window.addEventListener("cart-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("cart-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const items = [
    {
      label: "Beranda",
      href: "/",
      isActive: pathname === "/",
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth={active ? 0 : 1.5}
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      ),
    },
    {
      label: "Jelajahi",
      href: "/search?q=",
      isActive: pathname === "/search",
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth={active ? 0 : 1.5}
          stroke="currentColor"
          className="h-6 w-6"
        >
          {active ? (
            <path
              fillRule="evenodd"
              d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
              clipRule="evenodd"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          )}
        </svg>
      ),
    },
    {
      label: "Keranjang",
      href: "/cart",
      isActive: pathname === "/cart",
      badge: cartCount,
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth={active ? 0 : 1.5}
          stroke="currentColor"
          className="h-6 w-6"
        >
          {active ? (
            <path
              fillRule="evenodd"
              d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z"
              clipRule="evenodd"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          )}
        </svg>
      ),
    },
    {
      label: "Akun",
      href: "#",
      isActive: false,
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          strokeWidth={active ? 0 : 1.5}
          stroke="currentColor"
          className="h-6 w-6"
        >
          {active ? (
            <path
              fillRule="evenodd"
              d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
              clipRule="evenodd"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          )}
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden pb-safe">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 ${
              item.isActive ? "text-emerald-600" : "text-gray-500"
            }`}
          >
            <div className="relative">
              {item.icon(item.isActive)}
              {item.badge && item.badge > 0 ? (
                <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {item.badge > 99 ? "99" : item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
