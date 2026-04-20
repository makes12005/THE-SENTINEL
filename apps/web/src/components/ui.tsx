/** Loading skeleton components */
export function CardSkeleton() {
  return (
    <div className="bg-[#181c20] p-6 rounded-xl animate-pulse">
      <div className="h-2 w-24 bg-[#42474e] rounded mb-4" />
      <div className="h-10 w-16 bg-[#31353a] rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-[#181c20] h-16 rounded-xl" />
      ))}
    </div>
  );
}

export function InlineSkeletonText({ width = 'w-32' }: { width?: string }) {
  return <div className={`h-3 ${width} bg-[#31353a] rounded animate-pulse`} />;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-black text-[#a3cbf2] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-xs text-[#c2c7ce] uppercase tracking-widest mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    active:    { bg: 'bg-[#a3cbf2]/10', text: 'text-[#a3cbf2]', dot: 'bg-[#a3cbf2]' },
    scheduled: { bg: 'bg-[#42474e]/30', text: 'text-[#c2c7ce]', dot: 'bg-[#8c9198]' },
    completed: { bg: 'bg-[#31353a]/50', text: 'text-[#8c9198]', dot: 'bg-[#42474e]' },
    sent:      { bg: 'bg-[#a3cbf2]/10', text: 'text-[#a3cbf2]', dot: 'bg-[#a3cbf2]' },
    failed:    { bg: 'bg-[#ffb4ab]/10', text: 'text-[#ffb4ab]', dot: 'bg-[#ffb4ab]' },
    pending:   { bg: 'bg-[#ffb68b]/10', text: 'text-[#ffb68b]', dot: 'bg-[#ffb68b]' },
  };
  const s = map[status] ?? map['scheduled'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.625rem] font-bold tracking-wider ${s.bg} ${s.text}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
      {status.toUpperCase()}
    </span>
  );
}
