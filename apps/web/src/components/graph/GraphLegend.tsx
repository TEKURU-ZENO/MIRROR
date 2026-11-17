// MIRROR – Knowledge Graph Legend Component
// Displays color indicators for node types in the knowledge graph.

export function GraphLegend() {
  return (
    <div className="panel p-2.5 bg-mirror-surface/90 backdrop-blur border border-mirror-border rounded-md shadow-lg text-xs flex flex-col gap-1.5 select-none pointer-events-auto">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-mirror-muted">
        Legend
      </div>
      <div className="flex items-center gap-2 text-mirror-text">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-sm" />
        <span>Inspection</span>
      </div>
      <div className="flex items-center gap-2 text-mirror-text">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 shadow-sm" />
        <span>Evidence</span>
      </div>
      <div className="flex items-center gap-2 text-mirror-text">
        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0 shadow-sm" />
        <span>Intelligence</span>
      </div>
    </div>
  );
}
