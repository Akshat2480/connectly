export function MessageSkeleton({ align }) {
  const width = align === "end" ? "w-40" : "w-52";
  return (
    <div
      className={`flex ${align === "end" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`h-9 ${width} rounded-2xl bg-stone-200 animate-pulse ${
          align === "end" ? "rounded-br-md" : "rounded-bl-md"
        }`}
      />
    </div>
  );
}

export function MessagesSkeleton() {
  const pattern = ["start", "start", "end", "start", "end", "end", "start"];
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
      {pattern.map((align, i) => (
        <MessageSkeleton key={i} align={align} />
      ))}
    </div>
  );
}
