import { useEffect, useState } from "react";

type Point = { year: number; keep: number; swap: number };

export function CostChart({ data, ghost, without }: { data: Point[]; ghost?: Point[] | null; without?: number[] | null }) {
  const [lib, setLib] = useState<typeof import("recharts") | null>(null);

  useEffect(() => {
    let live = true;
    void import("recharts").then((mod) => {
      if (live) setLib(mod);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!lib) {
    return <div className="h-52 w-full rounded-2xl bg-moss" aria-hidden />;
  }

  const { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } = lib;
  const rows = data.map((p, i) => ({ ...p, ...(ghost ? { ghost: ghost[i]?.swap } : {}), ...(without ? { without: without[i] } : {}) }));

  const values = rows.flatMap((r) => [r.keep, r.swap, (r as { ghost?: number }).ghost, (r as { without?: number }).without]).filter((v): v is number => typeof v === "number");
  const lo = Math.min(0, Math.floor(Math.min(...values) / 10000) * 10000);
  const hi = Math.max(10000, Math.ceil(Math.max(...values) / 10000) * 10000);
  const step = hi - lo > 80000 ? 20000 : 10000;
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step);

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            interval={data.length > 20 ? 7 : data.length > 13 ? 3 : 0}
            tick={{ fill: "var(--color-ink)", fontSize: 11 }}
          />
          <YAxis
            width={36}
            domain={[lo, hi]}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickFormatter={(n: number) => `${Math.round(Number(n) / 1000)}k`}
          />
          {without ? <ReferenceLine y={0} stroke="var(--color-line)" /> : null}
          <Line type="monotone" dataKey="keep" stroke="var(--color-ink)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
          <Line type="monotone" dataKey="swap" stroke="var(--color-spruce)" strokeWidth={3} dot={false} />
          {without ? <Line type="monotone" dataKey="without" stroke="var(--color-amber-ink)" strokeWidth={3} dot={false} strokeDasharray="1 5" strokeLinecap="round" isAnimationActive={false} /> : null}
          {ghost ? <Line type="monotone" dataKey="ghost" stroke="#7a9a1a" strokeWidth={3} dot={false} strokeDasharray="2 3" isAnimationActive={false} /> : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
