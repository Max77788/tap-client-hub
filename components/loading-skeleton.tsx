export function CardSkeleton() {
  return (
    <div
      className="rounded-xl animate-pulse"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="p-5">
        <div
          className="h-5 rounded w-3/4 mb-3"
          style={{ backgroundColor: "var(--line)" }}
        />
        <div
          className="h-3 rounded w-1/2 mb-4"
          style={{ backgroundColor: "var(--line)" }}
        />
        <div className="flex gap-2 flex-wrap">
          <div
            className="h-6 rounded w-16"
            style={{ backgroundColor: "var(--line)" }}
          />
          <div
            className="h-6 rounded w-20"
            style={{ backgroundColor: "var(--line)" }}
          />
          <div
            className="h-6 rounded w-14"
            style={{ backgroundColor: "var(--line)" }}
          />
        </div>
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div
      className="rounded-xl animate-pulse p-5"
      style={{
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        className="h-8 rounded w-12 mb-2"
        style={{ backgroundColor: "var(--line)" }}
      />
      <div
        className="h-3 rounded w-24"
        style={{ backgroundColor: "var(--line)" }}
      />
    </div>
  );
}

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
      {/* Search bar */}
      <div
        className="h-12 rounded-xl animate-pulse"
        style={{ backgroundColor: "var(--card)", boxShadow: "var(--shadow)" }}
      />
      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
