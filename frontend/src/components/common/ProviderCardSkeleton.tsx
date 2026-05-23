export function ProviderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-12 rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-8 w-full rounded-xl bg-muted" />
    </div>
  );
}
