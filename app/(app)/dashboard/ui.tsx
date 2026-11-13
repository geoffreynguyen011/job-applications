export function Stat({
  label, value, tone,
}: { label: string; value: number | string; tone?: "warn" | "good" }) {
  const color = tone === "warn" ? "text-amber-600" : tone === "good" ? "text-green-600" : "";
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function Card({
  title, isEmpty, emptyText, children,
}: { title: string; isEmpty?: boolean; emptyText?: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {isEmpty ? <p className="text-sm text-gray-500">{emptyText ?? "Nothing here."}</p> : children}
    </section>
  );
}

export const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });