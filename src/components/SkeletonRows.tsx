export function SkeletonRows({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  )
}
