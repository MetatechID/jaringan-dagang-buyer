export default function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-xl border border-gray-100 bg-white"
        >
          <div className="aspect-square bg-gray-100" />
          <div className="p-2 space-y-2">
            <div className="h-3 w-4/5 rounded bg-gray-100" />
            <div className="h-3 w-3/5 rounded bg-gray-100" />
            <div className="h-4 w-1/2 rounded bg-gray-100" />
            <div className="h-2 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
