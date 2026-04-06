"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface SearchBarProps {
  defaultValue?: string;
  size?: "default" | "large";
  className?: string;
}

export default function SearchBar({
  defaultValue = "",
  size = "default",
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/search?q=");
    }
  }

  const isLarge = size === "large";

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative w-full ${className}`}
    >
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${isLarge ? "h-5 w-5" : "h-4 w-4"}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari di Jaringan Dagang"
          className={`
            w-full rounded-lg border border-emerald-200 bg-white
            text-gray-900 placeholder:text-gray-400
            transition-all
            focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20
            ${isLarge ? "pl-10 pr-4 py-3 text-base" : "pl-9 pr-4 py-2.5 text-sm"}
          `}
        />
        <button
          type="submit"
          className={`
            absolute right-1.5 top-1/2 -translate-y-1/2
            rounded-md bg-emerald-600 text-white
            transition-colors hover:bg-emerald-700 active:bg-emerald-800
            flex items-center justify-center
            ${isLarge ? "h-9 px-4 text-sm font-medium" : "h-7 w-7"}
          `}
        >
          {isLarge ? (
            "Cari"
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
