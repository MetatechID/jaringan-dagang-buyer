import Link from "next/link";

import { STATIC_BRANDS } from "@/lib/brands";

export default function BrandPickerPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold mb-4">
            <span>🛡️</span>
            <span>Beli Aman · Partner Demo Sandbox</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900">
            Pilih demo brand untuk dijelajahi
          </h1>
          <p className="mt-3 text-slate-600 text-lg">
            Setiap brand di bawah ini adalah replika sandbox yang menampilkan
            tombol <strong>Bayar Aman</strong> bersebelahan dengan tombol checkout asli.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(STATIC_BRANDS).map((brand) => (
            <Link
              key={brand.slug}
              href={`/${brand.slug}`}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all"
            >
              <div
                className="h-40 flex items-center justify-center text-3xl font-bold p-6 text-center"
                style={{
                  background: brand.colors.bg,
                  color: brand.colors.text,
                  fontFamily: brand.fonts.heading,
                }}
              >
                <span style={{ color: brand.colors.primary }}>{brand.name}</span>
              </div>
              <div className="p-5">
                <div className="font-semibold text-slate-900">{brand.name}</div>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                  {brand.tagline}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  Buka demo
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <Link
            href="/admin"
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300"
          >
            <div className="text-2xl mb-1">🎛️</div>
            <div className="font-semibold text-slate-900">Demo Cockpit</div>
            <div className="text-xs text-slate-500 mt-1">
              List orders, simulate shipped/delivered/release
            </div>
          </Link>
          <Link
            href="/yourbrand?primary=%23B45309&secondary=%23F59E0B"
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300"
          >
            <div className="text-2xl mb-1">🎨</div>
            <div className="font-semibold text-slate-900">YourBrand Theme Preview</div>
            <div className="text-xs text-slate-500 mt-1">
              <code>?primary=#xxx&amp;secondary=#yyy</code>
            </div>
          </Link>
          <a
            href="https://github.com/MetatechID/jaringan-dagang-buyer"
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300"
            target="_blank"
            rel="noreferrer"
          >
            <div className="text-2xl mb-1">📦</div>
            <div className="font-semibold text-slate-900">SDK on GitHub</div>
            <div className="text-xs text-slate-500 mt-1">
              packages/beli-aman-sdk
            </div>
          </a>
        </div>

        <p className="demo-footer mt-16">
          Demo storefronts. Products and brand identity used for demonstration of the Beli Aman SDK.
        </p>
      </div>
    </div>
  );
}
