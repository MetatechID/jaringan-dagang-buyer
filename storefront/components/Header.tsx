"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CartBadge from "./CartBadge";

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search?q=");
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <header className="sticky top-0 z-50 bg-emerald-600">
      {/* Mobile header */}
      <div className="md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
              <span className="text-xs font-bold text-white">JD</span>
            </div>
          </Link>

          {/* Search bar (mobile - tappable) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2 text-left"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4 text-gray-400 flex-shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <span className="text-sm text-gray-400 truncate">
              Cari di Jaringan Dagang
            </span>
          </button>

          {/* Cart */}
          <CartBadge />
        </div>

        {/* Mobile search overlay */}
        {searchOpen && (
          <div className="fixed inset-0 z-[60] bg-white">
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-emerald-600 px-4 h-14">
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="flex-shrink-0 text-white p-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari di Jaringan Dagang"
                  autoFocus
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex-shrink-0 rounded-lg bg-white/20 p-2 text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </button>
            </form>
            <div className="p-4">
              <p className="text-xs text-gray-400">Cari produk, toko, atau kategori</p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop header */}
      <div className="hidden md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <span className="text-sm font-bold text-white">JD</span>
            </div>
            <span className="text-lg font-bold text-white">
              Jaringan Dagang
            </span>
          </Link>

          {/* Desktop search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari di Jaringan Dagang"
                className="w-full rounded-lg bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-emerald-500 p-1.5 text-white hover:bg-emerald-400 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </button>
            </div>
          </form>

          {/* Right side nav */}
          <nav className="flex items-center gap-1 flex-shrink-0">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Beranda
            </Link>
            <Link
              href="/search?q="
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Jelajahi
            </Link>
            <CartBadge />
          </nav>
        </div>
      </div>
    </header>
  );
}
