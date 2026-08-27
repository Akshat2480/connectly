export default function conversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-stone-200 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-24 rounded bg-stone-200" />
        <div className="h-2.5 w-36 rounded bg-stone-100" />
      </div>
    </div>
  );
}
