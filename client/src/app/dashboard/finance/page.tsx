export default function Page() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
      <p className="font-data text-xs text-primary">{"<"} in progress {"/>"}</p>
      <h1 className="mt-2 font-display text-xl font-semibold">Revenue and Expenses</h1>
      <p className="mt-2 max-w-md text-sm text-text-muted">Expense tracking and net profit calculation.</p>
      <p className="mt-4 text-xs text-text-muted">Scaffolded on Day 1. Full functionality lands in the next build stage.</p>
    </div>
  );
}
