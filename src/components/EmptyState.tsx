export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 p-5 text-center text-sm text-zinc-400 dark:border-zinc-800">
      {text}
    </div>
  )
}
