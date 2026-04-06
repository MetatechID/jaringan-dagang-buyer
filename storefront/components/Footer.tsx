export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600">
              <span className="text-[10px] font-bold text-white">JD</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              Jaringan Dagang
            </span>
          </div>

          <p className="text-center text-[11px] text-gray-400 sm:text-right">
            Powered by Beckn Protocol &middot; Open Commerce Network
          </p>
        </div>
      </div>
    </footer>
  );
}
